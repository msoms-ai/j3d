import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import * as QRCode from 'qrcode';
import * as opentype from 'opentype.js';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ArabicReshaper = require('arabic-persian-reshaper');
import { MaterialType, ColorMode } from '@j3d/shared-types';

export interface Compiled3DResult {
  stlBuffer: Buffer;
  threeMfBuffer: Buffer;
  dimXmm: number;
  dimYmm: number;
  dimZmm: number;
  volumeCm3: number;
  surfaceAreaCm2: number;
  estimatedWeightG: number;
  triangleCount: number;
  isWatertight: boolean;
  unitFloorAed: number;
}

export interface CustomCsgNode {
  type: 'box' | 'cylinder' | 'sphere' | 'qr_code' | 'text' | 'calligraphy';
  operation: 'add' | 'subtract' | 'intersect';
  size?: [number, number, number];
  radius?: number;
  height?: number;
  position?: [number, number, number];
  rotationDeg?: [number, number, number];
  roundRadius?: number;
  text?: string;
  fontStyle?: string;
}

@Injectable()
export class ManifoldEngineService implements OnModuleInit {
  private readonly logger = new Logger(ManifoldEngineService.name);
  private wasm: any = null;
  private Manifold: any = null;
  private isReady = false;
  private parsedArabicFont: any = null;
  private parsedLatinFont: any = null;

  private readonly materialDensity: Record<MaterialType, number> = {
    [MaterialType.PLA]: 1.24,
    [MaterialType.PLA_SILK]: 1.25,
    [MaterialType.PETG]: 1.27,
    [MaterialType.ABS]: 1.04,
    [MaterialType.ASA]: 1.05,
    [MaterialType.TPU_95A]: 1.21,
    [MaterialType.RESIN_STANDARD]: 1.15,
    [MaterialType.RESIN_TOUGH]: 1.18,
  };

  private readonly materialRates: Record<MaterialType, number> = {
    [MaterialType.PLA]: 0.35,
    [MaterialType.PLA_SILK]: 0.45,
    [MaterialType.PETG]: 0.40,
    [MaterialType.ABS]: 0.45,
    [MaterialType.ASA]: 0.50,
    [MaterialType.TPU_95A]: 0.60,
    [MaterialType.RESIN_STANDARD]: 0.70,
    [MaterialType.RESIN_TOUGH]: 0.85,
  };

  async onModuleInit() {
    await this.initManifold();
    this.loadFont();
  }

  private loadFont() {
    try {
      const arabicCandidates = [
        path.join(process.cwd(), 'apps/api/assets/fonts/sfarabic.ttf'),
        path.join(process.cwd(), 'apps/api/assets/fonts/sfarabic-rounded.ttf'),
        path.join(__dirname, '../../../../assets/fonts/sfarabic.ttf'),
        path.join(__dirname, '../../../../assets/fonts/sfarabic-rounded.ttf'),
        '/System/Library/Fonts/SFArabic.ttf',
        '/System/Library/Fonts/SFArabicRounded.ttf',
        path.join(process.cwd(), 'apps/api/assets/fonts/cairo.ttf'),
      ];
      for (const p of arabicCandidates) {
        if (fs.existsSync(p)) {
          const buf = fs.readFileSync(p);
          this.parsedArabicFont = (opentype as any).parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
          this.logger.log(`Loaded Arabic Calligraphy TrueType font from: ${p}`);
          break;
        }
      }

      const latinCandidates = [
        '/System/Library/Fonts/Supplemental/Arial.ttf',
        '/System/Library/Fonts/Helvetica.ttc',
        path.join(process.cwd(), 'apps/api/assets/fonts/sfarabic.ttf'),
      ];
      for (const p of latinCandidates) {
        if (fs.existsSync(p)) {
          const buf = fs.readFileSync(p);
          this.parsedLatinFont = (opentype as any).parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
          this.logger.log(`Loaded Latin/Numeral TrueType font from: ${p}`);
          break;
        }
      }
    } catch (e: any) {
      this.logger.error(`Failed to load TrueType font: ${e.message}`);
    }
  }

  private getGlyph(ch: string): any {
    if (this.parsedArabicFont) {
      const g = this.parsedArabicFont.charToGlyph(ch);
      if (g && g.name !== '.notdef' && g.index > 0) {
        return g;
      }
    }
    if (this.parsedLatinFont) {
      const g = this.parsedLatinFont.charToGlyph(ch);
      if (g && g.name !== '.notdef') {
        return g;
      }
    }
    return this.parsedArabicFont?.charToGlyph(ch) || this.parsedLatinFont?.charToGlyph(ch);
  }

  /**
   * Generates a 100% Watertight 3D Solid from text or Arabic calligraphy with authentic RTL orientation
   */
  generate3dTextSolid(options: {
    text: string;
    widthMm?: number;
    depthMm?: number;
    fontSize?: number;
  }): any {
    this.ensureReady();
    const { text, widthMm = 68.0, depthMm = 2.4, fontSize = 42 } = options;
    if (!text || !text.trim()) return null;

    if (!this.parsedArabicFont && !this.parsedLatinFont) {
      this.loadFont();
    }
    if (!this.parsedArabicFont && !this.parsedLatinFont) {
      return this.roundedBox([widthMm, depthMm, 12], 1.0);
    }

    try {
      const isArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
      const path = new opentype.Path();

      if (isArabic) {
        // Reverse digit and Latin sequences so they advance LTR within the RTL flow
        const bidiText = text.replace(/[0-9A-Za-z]+/g, (m) => m.split('').reverse().join(''));
        // Reshape Arabic cursive forms (isol, init, medi, fina)
        const reshaped = ArabicReshaper.ArabicShaper.convertArabic(bidiText);

        // Calculate glyph advances in authentic Right-to-Left writing layout
        const glyphItems: Array<{ g: any; sc: number }> = [];
        let totalWidth = 0;
        for (let i = 0; i < reshaped.length; i++) {
          const ch = reshaped[i];
          const g = this.getGlyph(ch);
          if (!g) continue;
          const upe = g.font ? g.font.unitsPerEm : (this.parsedArabicFont?.unitsPerEm || 2048);
          const sc = fontSize / upe;
          glyphItems.push({ g, sc });
          totalWidth += (g.advanceWidth || 0) * sc;
        }

        if (glyphItems.length === 0 || totalWidth <= 0) return null;

        // Position glyphs starting from the right (totalWidth) moving leftwards (currX -= adv)
        let currX = totalWidth;
        for (const item of glyphItems) {
          const adv = (item.g.advanceWidth || 0) * item.sc;
          currX -= adv;
          const gp = item.g.getPath(currX, 0, fontSize);
          for (const cmd of gp.commands) {
            path.commands.push(cmd);
          }
        }
      } else {
        // Left-to-Right layout for Latin, numbers, punctuation
        let currX = 0;
        for (let i = 0; i < text.length; i++) {
          const ch = text[i];
          const g = this.getGlyph(ch);
          if (!g) continue;
          const upe = g.font ? g.font.unitsPerEm : (this.parsedLatinFont?.unitsPerEm || 2048);
          const sc = fontSize / upe;
          const gp = g.getPath(currX, 0, fontSize);
          for (const cmd of gp.commands) {
            path.commands.push(cmd);
          }
          currX += (g.advanceWidth || 0) * sc;
        }
      }

      const polygons = this.pathToPolygons(path.commands);
      if (!polygons || polygons.length === 0) {
        return null;
      }

      const cs = new this.wasm.CrossSection(polygons, 'EvenOdd');
      let textSolid = cs.extrude(depthMm);

      const bbox = textSolid.boundingBox();
      const rawW = Math.max(1, bbox.max[0] - bbox.min[0]);

      const scale = widthMm / rawW;
      textSolid = textSolid.scale([scale, scale, 1]);

      const scaledBbox = textSolid.boundingBox();
      const midX = (scaledBbox.min[0] + scaledBbox.max[0]) / 2;
      const midY = (scaledBbox.min[1] + scaledBbox.max[1]) / 2;

      // Center around local origin (X and Y centered, Z starting at 0 for clean face placement)
      textSolid = textSolid.translate([-midX, -midY, 0]);

      return textSolid;
    } catch (err: any) {
      this.logger.warn(`Failed to generate 3D text solid for "${text}": ${err.message}`);
      return null;
    }
  }

  private pathToPolygons(commands: any[]): number[][][] {
    const polygons: number[][][] = [];
    let currentPoly: number[][] = [];
    let currX = 0, currY = 0;

    for (const cmd of commands) {
      if (cmd.type === 'M') {
        if (currentPoly.length >= 3) {
          if (Math.abs(currentPoly[0][0] - currentPoly[currentPoly.length - 1][0]) < 1e-4 &&
              Math.abs(currentPoly[0][1] - currentPoly[currentPoly.length - 1][1]) < 1e-4) {
            currentPoly.pop();
          }
          if (currentPoly.length >= 3) polygons.push(currentPoly);
        }
        currentPoly = [[cmd.x, -cmd.y]];
        currX = cmd.x;
        currY = -cmd.y;
      } else if (cmd.type === 'L') {
        currentPoly.push([cmd.x, -cmd.y]);
        currX = cmd.x;
        currY = -cmd.y;
      } else if (cmd.type === 'Q') {
        const steps = 4;
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const mt = 1 - t;
          const x = mt * mt * currX + 2 * mt * t * cmd.x1 + t * t * cmd.x;
          const y = mt * mt * currY + 2 * mt * t * (-cmd.y1) + t * t * (-cmd.y);
          currentPoly.push([x, y]);
        }
        currX = cmd.x;
        currY = -cmd.y;
      } else if (cmd.type === 'C') {
        const steps = 5;
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const mt = 1 - t;
          const x = mt*mt*mt*currX + 3*mt*mt*t*cmd.x1 + 3*mt*t*t*cmd.x2 + t*t*t*cmd.x;
          const y = mt*mt*mt*currY + 3*mt*mt*t*(-cmd.y1) + 3*mt*t*t*(-cmd.y2) + t*t*t*(-cmd.y);
          currentPoly.push([x, y]);
        }
        currX = cmd.x;
        currY = -cmd.y;
      } else if (cmd.type === 'Z') {
        if (currentPoly.length >= 3) {
          if (Math.abs(currentPoly[0][0] - currentPoly[currentPoly.length - 1][0]) < 1e-4 &&
              Math.abs(currentPoly[0][1] - currentPoly[currentPoly.length - 1][1]) < 1e-4) {
            currentPoly.pop();
          }
          if (currentPoly.length >= 3) polygons.push(currentPoly);
        }
        currentPoly = [];
      }
    }
    if (currentPoly.length >= 3) {
      if (Math.abs(currentPoly[0][0] - currentPoly[currentPoly.length - 1][0]) < 1e-4 &&
          Math.abs(currentPoly[0][1] - currentPoly[currentPoly.length - 1][1]) < 1e-4) {
        currentPoly.pop();
      }
      if (currentPoly.length >= 3) polygons.push(currentPoly);
    }
    return polygons;
  }

  private async initManifold() {
    try {
      const dynamicImport = new Function('specifier', 'return import(specifier)');
      const pkg = await dynamicImport('manifold-3d');
      const initModule = pkg.default || (pkg as any);
      this.wasm = await initModule();
      this.wasm.setup();
      this.Manifold = this.wasm.Manifold;
      this.isReady = true;
      this.logger.log('Manifold-3D WebAssembly topological kernel initialized successfully');
    } catch (err: any) {
      this.logger.error(`Failed to initialize Manifold-3D WASM kernel: ${err.message}`, err.stack);
    }
  }

  private ensureReady() {
    if (!this.isReady || !this.Manifold) {
      throw new Error('Manifold-3D WASM kernel is still initializing. Please retry in 1 second.');
    }
  }

  // --- Primitive Helpers ---

  private roundedBox(size: [number, number, number], r: number): any {
    const [x, y, z] = size;
    if (r <= 0.1) return this.Manifold.cube(size, true);

    const safeR = Math.min(r, Math.min(x, y) / 4);
    const innerX = Math.max(0.5, x - 2 * safeR);
    const innerY = Math.max(0.5, y - 2 * safeR);

    const b1 = this.Manifold.cube([innerX, y, z], true);
    const b2 = this.Manifold.cube([x, innerY, z], true);
    let solid = b1.add(b2);

    const hx = innerX / 2;
    const hy = innerY / 2;
    const cornerCyl = this.Manifold.cylinder(z, safeR, safeR, 20, true);

    solid = solid.add(cornerCyl.translate([hx, hy, 0]));
    solid = solid.add(cornerCyl.translate([-hx, hy, 0]));
    solid = solid.add(cornerCyl.translate([hx, -hy, 0]));
    solid = solid.add(cornerCyl.translate([-hx, -hy, 0]));

    return solid;
  }

  // --- Production Product Archetype CSG Synthesizers ---

  /**
   * Archetype 1: Ergonomic Phone & Tablet Dual-Angle Stand
   */
  buildPhoneTabletStand(params: Record<string, any>): any {
    this.ensureReady();
    const w = Number(params.widthMm) || 72.0;
    const d = Number(params.depthMm) || 82.0;

    // Weighted base plate with rounded chamfers
    const base = this.roundedBox([w, d, 8], 3).translate([0, 0, 4]);

    // 65° ergonomic backrest plate (25° inclination from vertical)
    const backrest = this.roundedBox([w, 6, 92], 2)
      .rotate([25, 0, 0])
      .translate([0, 10, 48]);

    // Front cradle shelf
    const shelf = this.roundedBox([w, 22, 6], 1.5).translate([0, -15, 12]);

    // Front retaining hook lips (Left and right with central cable pass gap)
    const hookWidth = (w - 24) / 2;
    const leftHook = this.roundedBox([hookWidth, 6, 18], 1.5).translate([
      -(w / 2 - hookWidth / 2),
      -25,
      20,
    ]);
    const rightHook = this.roundedBox([hookWidth, 6, 18], 1.5).translate([
      w / 2 - hookWidth / 2,
      -25,
      20,
    ]);

    // Central charging cable notch cut-out
    const cableNotch = this.Manifold.cube([22, 36, 26], true).translate([0, -20, 16]);

    // Backrest weight-reduction & cable pass-through oval aperture
    const cordAperture = this.roundedBox([26, 14, 36], 4)
      .rotate([25, 0, 0])
      .translate([0, 8, 48]);

    let stand = base.add(backrest).add(shelf).add(leftHook).add(rightHook);
    stand = stand.subtract(cableNotch).subtract(cordAperture);

    return stand;
  }

  /**
   * Generates a 100% Watertight, physically scannable 3D QR Code Solid via Run-Length Encoding
   */
  generateQrCodeSolid(options: {
    text: string;
    sizeMm?: number;
    depthMm?: number;
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  }): any {
    this.ensureReady();
    const {
      text,
      sizeMm = 52.0,
      depthMm = 1.4,
      errorCorrectionLevel = 'M',
    } = options;

    const qr = QRCode.create(text || 'https://j3d.msoms.ai', { errorCorrectionLevel });
    const numModules = qr.modules.size;
    const data = qr.modules.data;
    const moduleSize = sizeMm / numModules;

    let qrUnion: any = null;

    // Run-Length Encoding per row to minimize CSG union operations into ~150 fast solid boxes
    for (let r = 0; r < numModules; r++) {
      let cStart = -1;
      for (let c = 0; c < numModules; c++) {
        const isDark = data[r * numModules + c] === 1;
        if (isDark && cStart === -1) {
          cStart = c;
        } else if (!isDark && cStart !== -1) {
          const runLen = c - cStart;
          const boxW = runLen * moduleSize;
          const midC = (cStart + c - 1) / 2;
          const x = (midC - (numModules - 1) / 2) * moduleSize;
          const y = ((numModules - 1) / 2 - r) * moduleSize;

          const box = this.Manifold.cube([boxW, moduleSize, depthMm], true)
            .translate([x, y, depthMm / 2]);
          qrUnion = qrUnion ? qrUnion.add(box) : box;
          cStart = -1;
        }
      }
      if (cStart !== -1) {
        const runLen = numModules - cStart;
        const boxW = runLen * moduleSize;
        const midC = (cStart + numModules - 1) / 2;
        const x = (midC - (numModules - 1) / 2) * moduleSize;
        const y = ((numModules - 1) / 2 - r) * moduleSize;

        const box = this.Manifold.cube([boxW, moduleSize, depthMm], true)
          .translate([x, y, depthMm / 2]);
        qrUnion = qrUnion ? qrUnion.add(box) : box;
      }
    }

    return qrUnion || this.Manifold.cube([sizeMm, sizeMm, depthMm], true);
  }

  /**
   * Archetype 2: Ergonomic Business 3D QR Code Display & Multi-Purpose Counter Stand
   */
  buildBusinessQrStand(params: Record<string, any>): any {
    this.ensureReady();
    const w = Number(params.widthMm) || 96.0;
    const qrUrl = params.qrUrl || params.websiteUrl || params.qrAction || 'https://msoms.ai';

    // 1. Stable Weighted Chamfered Base (96mm x 82mm x 10mm)
    const base = this.roundedBox([w, 82, 10], 3).translate([0, 0, 5]);

    // 2. Usable Front Multi-Purpose Pocket (84mm x 12mm x 8mm) for business cards & resting phone
    const cardPocket = this.roundedBox([w - 12, 12, 10], 2).translate([0, -25, 7]);
    const standBase = base.subtract(cardPocket);

    // 3. Ergonomic Pen / Stylus Rest Groove (Cylindrical cut)
    const penGroove = this.Manifold.cylinder(w - 16, 5, 5, 24, true)
      .rotate([0, 90, 0])
      .translate([0, -11, 10]);
    const carvedBase = standBase.subtract(penGroove);

    // 4. Non-slip rubber foot pockets on underside (4x cylinder subtracts)
    const footX = w / 2 - 12;
    const foot1 = this.Manifold.cylinder(2, 6, 6, 20, true).translate([-footX, -28, 1]);
    const foot2 = this.Manifold.cylinder(2, 6, 6, 20, true).translate([footX, -28, 1]);
    const foot3 = this.Manifold.cylinder(2, 6, 6, 20, true).translate([-footX, 28, 1]);
    const foot4 = this.Manifold.cylinder(2, 6, 6, 20, true).translate([footX, 28, 1]);
    const footingBase = carvedBase.subtract(foot1).subtract(foot2).subtract(foot3).subtract(foot4);

    // 5. 72° Ergonomic Angled Placard (18° inclination from vertical)
    const tiltDeg = 18;
    const placardZ = 52;
    const placardY = 12;
    const placard = this.roundedBox([w - 10, 7, 92], 2.5)
      .rotate([tiltDeg, 0, 0])
      .translate([0, placardY, placardZ]);

    // 6. Recessed faceplate bed (62x62x2.2mm) on front face
    const faceBed = this.roundedBox([62, 2.2, 62], 1.5)
      .translate([0, -2.5, -4])
      .rotate([tiltDeg, 0, 0])
      .translate([0, placardY, placardZ]);

    // 7. REAL 3D QR Code Solid (50mm x 50mm x 1.4mm relief)
    const qrSolid = this.generateQrCodeSolid({
      text: qrUrl,
      sizeMm: 50.0,
      depthMm: 1.4,
    });
    const orientedQr = qrSolid
      .rotate([90, 0, 0])
      .translate([0, -3.5, -4])
      .rotate([tiltDeg, 0, 0])
      .translate([0, placardY, placardZ]);

    // 8. Top Inscription Banner ("SCAN ME" or Custom Company Header)
    const topBanner = this.roundedBox([w - 22, 2.5, 12], 1.5)
      .translate([0, -3.5, 36])
      .rotate([tiltDeg, 0, 0])
      .translate([0, placardY, placardZ]);

    // 9. Rear Structural Buttress Gussets (Left and Right for print stability and rigidity)
    const gussetL = this.Manifold.cube([5, 30, 42], true)
      .rotate([tiltDeg + 18, 0, 0])
      .translate([-(w / 2 - 18), placardY + 16, 26]);
    const gussetR = this.Manifold.cube([5, 30, 42], true)
      .rotate([tiltDeg + 18, 0, 0])
      .translate([(w / 2 - 18), placardY + 16, 26]);

    return footingBase
      .add(placard)
      .add(faceBed)
      .add(topBanner)
      .add(gussetL)
      .add(gussetR)
      .add(orientedQr);
  }

  /**
   * Archetype 3: Flagship Eid Al-Fitr 10 AED Note Holder Ring
   */
  buildEidRing(params: Record<string, any>): any {
    this.ensureReady();
    const outerR = (Number(params.outerRingDiameterMm) || 34.0) / 2;
    const innerR = (Number(params.innerBillCylinderDiameterMm) || 14.5) / 2;
    const height = Number(params.ringHeightMm) || 18.0;

    const outerBody = this.Manifold.cylinder(height, outerR, outerR, 48, true);
    const innerHole = this.Manifold.cylinder(height + 4, innerR, innerR, 48, true);
    let ringBase = outerBody.subtract(innerHole);

    // 12 Decorative fluting facets along perimeter
    for (let i = 0; i < 12; i++) {
      const angle = (i * 2 * Math.PI) / 12;
      const fx = (outerR + 0.3) * Math.cos(angle);
      const fy = (outerR + 0.3) * Math.sin(angle);
      const flute = this.Manifold.cylinder(height - 2, 1.4, 1.4, 16, true).translate([
        fx,
        fy,
        0,
      ]);
      ringBase = ringBase.add(flute);
    }

    // Top crescent moon crest
    const crescentOuter = this.Manifold.cylinder(4, 10, 10, 32, true);
    const crescentCut = this.Manifold.cylinder(6, 9, 9, 32, true).translate([3.5, 0, 0]);
    const crescent = crescentOuter
      .subtract(crescentCut)
      .rotate([90, 0, 0])
      .translate([0, outerR - 1, height / 2 + 7]);

    // Front calligraphy plaque
    const plaque = this.roundedBox([18, 3, 12], 0.8).translate([0, outerR + 1, 0]);

    return ringBase.add(crescent).add(plaque);
  }

  /**
   * Archetype 4: Islamic Calligraphy Stand (Mihrab Architectural Arch with Framed Recessed Bed)
   */
  buildCalligraphyStand(params: Record<string, any>): any {
    this.ensureReady();
    // 1. Dual-tier ceremonial pedestal with rounded chamfers
    const base1 = this.roundedBox([144, 52, 8], 3.0).translate([0, 0, 4]);
    const base2 = this.roundedBox([128, 40, 6], 2.0).translate([0, 0, 10]);

    // 2. Sleek architectural Mihrab arch body
    const archBody = this.roundedBox([100, 5, 74], 2.5).translate([0, 0, 47]);
    const archTop = this.Manifold.cylinder(5, 50, 50, 48, true)
      .rotate([90, 0, 0])
      .translate([0, 0, 84]);
    const archPlaque = archBody.add(archTop);

    // 3. Rear structural buttress gusset ribs for print rigidity and desk presence
    const gussetL = this.roundedBox([5, 18, 34], 1.5).translate([-36, 12, 24]);
    const gussetR = this.roundedBox([5, 18, 34], 1.5).translate([36, 12, 24]);

    // 4. Multi-material contrast outer perimeter border (+1.8mm proud)
    const borderBody = this.roundedBox([90, 2.2, 64], 2.0).translate([0, -2.6, 45]);
    const borderTop = this.Manifold.cylinder(2.2, 45, 45, 48, true)
      .rotate([90, 0, 0])
      .translate([0, -2.6, 77]);
    const borderFrame = borderBody.add(borderTop);

    // 5. Framed recessed bed (-1.6mm cavity) where the calligraphy sits
    const bedBody = this.roundedBox([82, 1.8, 56], 1.5).translate([0, -3.2, 45]);
    const bedTop = this.Manifold.cylinder(1.8, 41, 41, 48, true)
      .rotate([90, 0, 0])
      .translate([0, -3.2, 73]);
    const recessedBed = bedBody.add(bedTop);

    let solid = base1
      .add(base2)
      .add(archPlaque)
      .add(gussetL)
      .add(gussetR)
      .add(borderFrame)
      .subtract(recessedBed);

    // 6. Deep 3D raised Arabic calligraphy (+2.6mm relief, proud of border)
    const phraseText = params.phraseText || params.mainGreetingText || 'ما شاء الله تبارك الله';
    const calligraphySolid = this.generate3dTextSolid({
      text: phraseText,
      widthMm: 74,
      depthMm: 2.6,
    });
    if (calligraphySolid) {
      const oriented = calligraphySolid
        .rotate([90, 0, 0])
        .translate([0, -4.5, 60]);
      solid = solid.add(oriented);
    }

    return solid;
  }

  /**
   * Archetype 5: Congratulations & Award Trophy Plaque (MakerWorld / Multi-Layer Contrast Bed & Crest)
   */
  buildCongratulationsPlaque(params: Record<string, any>): any {
    this.ensureReady();
    // 1. Dual-tier ceremonial pedestal with rounded chamfers
    const base1 = this.roundedBox([136, 48, 8], 3.0).translate([0, 0, 4]);
    const base2 = this.roundedBox([120, 36, 6], 2.0).translate([0, 0, 10]);

    // 2. Sleek award shield plate (5mm thick)
    const shield = this.roundedBox([96, 5, 116], 3.0).translate([0, 0, 65]);

    // 3. Rear structural buttress gusset ribs
    const gussetL = this.roundedBox([5, 18, 34], 1.5).translate([-34, 11, 24]);
    const gussetR = this.roundedBox([5, 18, 34], 1.5).translate([34, 11, 24]);

    // 4. 8-Point Geometric Islamic Star Crest at the apex with center medallion
    const starPart1 = this.Manifold.cube([24, 3.5, 24], true);
    const starPart2 = this.Manifold.cube([24, 3.5, 24], true).rotate([0, 45, 0]);
    const medallion = this.Manifold.cylinder(4.0, 5.5, 5.5, 24, true).rotate([90, 0, 0]);
    const starCrest = starPart1
      .add(starPart2)
      .add(medallion)
      .rotate([90, 0, 0])
      .translate([0, -1.0, 124]);

    // 5. Raised stepped picture-frame border (+1.8mm proud)
    const outerFrame = this.roundedBox([86, 2.2, 88], 2.0).translate([0, -2.6, 60]);

    // 6. Recessed inner bed (-1.6mm cavity) where inscriptions sit
    const innerBed = this.roundedBox([80, 1.8, 82], 1.5).translate([0, -3.2, 60]);

    // 7. Decorative horizontal divider bar
    const divider = this.roundedBox([54, 1.4, 2.2], 0.8).translate([0, -2.6, 51]);

    let solid = base1
      .add(base2)
      .add(shield)
      .add(gussetL)
      .add(gussetR)
      .add(starCrest)
      .add(outerFrame)
      .subtract(innerBed)
      .add(divider);

    // 8. 3D Calligraphy & Text Inscriptions
    const greeting = params.mainGreetingText || params.greetingPreset || params.occasionTitle || 'مبارك التخرج';
    const recipient = params.recipientNameAndDate || params.recipientName || '';

    // Primary Greeting (Deep 3D Raised Calligraphy Relief +2.6mm proud)
    const greetingSolid = this.generate3dTextSolid({
      text: greeting,
      widthMm: 72,
      depthMm: 2.6,
    });
    if (greetingSolid) {
      const orientedGreeting = greetingSolid
        .rotate([90, 0, 0])
        .translate([0, -4.4, recipient ? 66 : 58]);
      solid = solid.add(orientedGreeting);
    }

    // Secondary Recipient Name / Date (3D Raised Text Relief +2.0mm proud)
    if (recipient) {
      const recipientSolid = this.generate3dTextSolid({
        text: recipient,
        widthMm: 64,
        depthMm: 2.0,
      });
      if (recipientSolid) {
        const orientedRecipient = recipientSolid
          .rotate([90, 0, 0])
          .translate([0, -4.4, 38]);
        solid = solid.add(orientedRecipient);
      }
    }

    return solid;
  }

  /**
   * Archetype 6: Headphone Desk Hanger & Controller Stand
   */
  buildHeadphoneHangerStand(params: Record<string, any>): any {
    this.ensureReady();
    // Wide weighted circular base with dish tray
    const baseOuter = this.Manifold.cylinder(8, 50, 52, 48, true).translate([0, 0, 4]);
    const baseDishCut = this.Manifold.cylinder(4, 44, 44, 48, true).translate([0, 0, 7]);
    const base = baseOuter.subtract(baseDishCut);

    // Vertical riser post
    const post = this.roundedBox([14, 14, 140], 2).translate([0, 0, 74]);

    // Curved headband cradle
    const cradle = this.Manifold.cylinder(36, 42, 42, 36, true)
      .rotate([90, 0, 0])
      .translate([0, 0, 144]);
    const cradleHollow = this.Manifold.cylinder(40, 36, 36, 36, true)
      .rotate([90, 0, 0])
      .translate([0, 0, 140]);

    const hanger = cradle.subtract(cradleHollow);
    return base.add(post).add(hanger);
  }

  /**
   * Archetype 7: Newborn Mabrouk Baby Name Sign
   * Rectangular wall/desk plaque with arch banner, raised name block, birth year, and Boy/Girl motif
   */
  buildNewbornKidsSign(params: Record<string, any>): any {
    this.ensureReady();
    const w = Number(params.widthMm) || 150.0;
    const babyName = params.babyName || 'زايد • Zayed';
    const birthYear = Number(params.birthYear) || 2026;
    const genderTheme = (params.genderTheme || 'BOY').toUpperCase();
    const isBoy = genderTheme !== 'GIRL';

    // 1. Solid backing plate (150 x 10 x 110mm) — the main sign board
    const backingPlate = this.roundedBox([w, 10, 110], 4).translate([0, 0, 55]);

    // 2. Decorative top arch banner (semi-circle roof shape)
    const archBody = this.Manifold.cylinder(10, w / 2 - 2, w / 2 - 2, 32, true)
      .rotate([90, 0, 0])
      .translate([0, 0, 110]);
    const archCut = this.Manifold.cylinder(12, w / 2 - 14, w / 2 - 14, 32, true)
      .rotate([90, 0, 0])
      .translate([0, 0, 108]);
    const archRoof = archBody.subtract(archCut);

    // 3. Raised Baby Name Nameplate (embossed slab on front face)
    const namePlate = this.roundedBox([w - 24, 3, 28], 2).translate([0, -6.5, 60]);

    // 4. Birth Year Strip below name
    const yearStrip = this.roundedBox([w - 48, 2.5, 14], 1.5).translate([0, -6.5, 36]);

    // 5. Boy motif: Crescent + Star / Girl motif: Bow + Heart
    let motif: any;
    if (isBoy) {
      // Crescent moon: outer circle subtract inner shifted circle
      const moonOuter = this.Manifold.cylinder(5, 14, 14, 36, true)
        .rotate([90, 0, 0])
        .translate([-w / 2 + 22, -5, 85]);
      const moonCut = this.Manifold.cylinder(7, 11, 11, 36, true)
        .rotate([90, 0, 0])
        .translate([-w / 2 + 26, -5, 85]);
      const crescent = moonOuter.subtract(moonCut);
      // Star beside crescent
      const starA = this.Manifold.cube([8, 4, 8], true)
        .rotate([90, 0, 0])
        .translate([w / 2 - 22, -5, 85]);
      const starB = this.Manifold.cube([8, 4, 8], true)
        .rotate([90, 45, 0])
        .translate([w / 2 - 22, -5, 85]);
      motif = crescent.add(starA).add(starB);
    } else {
      // Girl bow shape: two rounded lobes + center knot
      const bowLeft = this.Manifold.cylinder(5, 10, 8, 20, true)
        .rotate([90, 0, 0])
        .translate([-w / 2 + 20, -5, 85]);
      const bowRight = this.Manifold.cylinder(5, 10, 8, 20, true)
        .rotate([90, 0, 0])
        .translate([w / 2 - 20, -5, 85]);
      const bowKnot = this.Manifold.cylinder(5, 5, 5, 16, true)
        .rotate([90, 0, 0])
        .translate([0, -5, 85]);
      motif = bowLeft.add(bowRight).add(bowKnot);
    }

    // 6. Freestanding base foot (stability when placed on desk)
    const foot = this.roundedBox([w - 10, 42, 8], 2).translate([0, 10, 4]);
    // Anti-tip heel brace
    const heel = this.roundedBox([w - 30, 10, 48], 2).translate([0, 24, 24]);

    return backingPlate.add(archRoof).add(namePlate).add(yearStrip).add(motif).add(foot).add(heel);
  }

  /**
   * Archetype 8: School STEM Gear Model — Planetary Gear Display Base
   * Sun gear + 3 planet gears on a labeled base plate for physics/engineering projects
   */
  buildSchoolStemGearModel(params: Record<string, any>): any {
    this.ensureReady();
    const teeth = Number(params.gearTeethCount) || 24;
    const module = Number(params.moduleMm) || 2.5;
    const baseW = Number(params.basePlateMm) || 120.0;
    const gearH = 10; // gear thickness

    // 1. Flat display base plate
    const basePlate = this.roundedBox([baseW, baseW, 8], 4).translate([0, 0, 4]);

    // 2. Central Sun Gear
    const sunR = (teeth * module) / (2 * Math.PI) * 2.5;
    const sunOuter = this.Manifold.cylinder(gearH, sunR, sunR, Math.max(16, teeth), true).translate([0, 0, 8 + gearH / 2]);
    const sunHole = this.Manifold.cylinder(gearH + 2, sunR * 0.35, sunR * 0.35, 16, true).translate([0, 0, 8 + gearH / 2]);
    const sunGear = sunOuter.subtract(sunHole);

    // 3. Three Planet Gears equally spaced (120° apart)
    const planetR = sunR * 0.6;
    const orbitR = sunR + planetR * 1.8;
    let planets: any = null;
    for (let i = 0; i < 3; i++) {
      const angle = (i * 2 * Math.PI) / 3;
      const px = orbitR * Math.cos(angle);
      const py = orbitR * Math.sin(angle);
      const pOuter = this.Manifold.cylinder(gearH, planetR, planetR, Math.max(12, Math.round(teeth * 0.6)), true)
        .translate([px, py, 8 + gearH / 2]);
      const pHole = this.Manifold.cylinder(gearH + 2, planetR * 0.3, planetR * 0.3, 12, true)
        .translate([px, py, 8 + gearH / 2]);
      const planet = pOuter.subtract(pHole);
      planets = planets ? planets.add(planet) : planet;
    }

    // 4. Orbit ring track (thin ring on the base surface)
    const ringOuter = this.Manifold.cylinder(3, orbitR + planetR + 2, orbitR + planetR + 2, 48, true).translate([0, 0, 9.5]);
    const ringInner = this.Manifold.cylinder(5, orbitR + planetR - 2, orbitR + planetR - 2, 48, true).translate([0, 0, 9.5]);
    const orbitRing = ringOuter.subtract(ringInner);

    // 5. Label section tab at front
    const labelTab = this.roundedBox([baseW * 0.6, 4, 16], 1.5).translate([0, -baseW / 2 + 2, 16]);

    return basePlate.add(sunGear).add(planets).add(orbitRing).add(labelTab);
  }

  /**
   * Archetype 9: Home DIY Custom L-Bracket & Desk Hook
   * Heavy-duty L-bracket or under-desk headphone/accessory hook with screw holes
   */
  buildHomeDiyBracket(params: Record<string, any>): any {
    this.ensureReady();
    const armLen = Number(params.armLengthMm) || 80.0;
    const wallThick = Number(params.wallThicknessMm) || 5.0;
    const clampOpening = Number(params.clampOpeningMm) || 35.0;
    const screwD = Number(params.screwHoleDiameterMm) || 4.2;
    const bracketW = 48; // bracket depth / width

    // 1. Vertical wall-mount plate (attaches to surface)
    const wallPlate = this.roundedBox([bracketW, wallThick, 70], 2).translate([0, wallThick / 2, 35]);

    // 4× countersunk screw holes on wall plate
    const screwHole = (zOff: number, xOff: number) =>
      this.Manifold.cylinder(wallThick + 4, screwD / 2, screwD / 2, 16, true)
        .rotate([90, 0, 0])
        .translate([xOff, wallThick / 2, zOff]);
    const holes = screwHole(15, bracketW / 2 - 8)
      .add(screwHole(15, -(bracketW / 2 - 8)))
      .add(screwHole(55, bracketW / 2 - 8))
      .add(screwHole(55, -(bracketW / 2 - 8)));
    const wallPlateWithHoles = wallPlate.subtract(holes);

    // 2. Horizontal arm extending outward
    const arm = this.roundedBox([bracketW, armLen, wallThick + 2], 2)
      .rotate([0, 0, 0])
      .translate([0, armLen / 2 + wallThick, wallThick / 2 + 1]);

    // 3. Gusset triangle brace for structural rigidity (connects arm to plate)
    const gusset = this.Manifold.cube([bracketW - 8, wallThick + 2, 20], true)
      .translate([0, armLen * 0.3 / 2 + wallThick, wallThick * 2]);

    // 4. Optional clamp/hook at the arm tip
    const hookOuter = this.Manifold.cylinder(bracketW - 6, clampOpening / 2 + wallThick, clampOpening / 2 + wallThick, 24, true)
      .rotate([90, 0, 0])
      .translate([0, armLen + wallThick + clampOpening / 2, wallThick / 2 + 1]);
    const hookHollow = this.Manifold.cylinder(bracketW, clampOpening / 2, clampOpening / 2, 24, true)
      .rotate([90, 0, 0])
      .translate([0, armLen + wallThick + clampOpening / 2, wallThick / 2 + 1]);
    const hookGap = this.Manifold.cube([clampOpening * 0.4, bracketW + 4, clampOpening + wallThick * 2], true)
      .translate([0, armLen + wallThick + clampOpening + wallThick, wallThick / 2 + 1]);
    const hook = hookOuter.subtract(hookHollow).subtract(hookGap);

    return wallPlateWithHoles.add(arm).add(gusset).add(hook);
  }

  /**
   * Archetype 10: Custom Replacement Part & Mechanical Knob / Adapter
   * Precision knurled/ribbed knob with D-shaft bore, set-screw socket, and alignment crown
   */
  buildCustomReplacementPart(params: Record<string, any>): any {
    this.ensureReady();
    const outerD = Number(params.outerDiameterMm) || 36.0;
    const outerR = outerD / 2;
    const h = Number(params.partHeightMm) || 24.0;
    const shaftD = Number(params.shaftHoleDiameterMm) || 6.0;
    const shaftR = shaftD / 2;
    const ribsCount = Number(params.gripRibsCount) || 16;

    // 1. Base mounting collar / rim (Z = 0 to 4mm)
    const collar = this.Manifold.cylinder(4, outerR + 2, outerR + 2, 48, true).translate([0, 0, 2]);

    // 2. Main cylindrical knob body (Z = 2 to h)
    const mainBody = this.Manifold.cylinder(h - 2, outerR, outerR - 1, 48, true).translate([0, 0, (h + 2) / 2]);
    let body = collar.add(mainBody);

    // 3. Ergonomic Grip Flutes/Ribs around perimeter for easy finger turning
    for (let i = 0; i < ribsCount; i++) {
      const angle = (i * 2 * Math.PI) / ribsCount;
      const rx = (outerR + 0.3) * Math.cos(angle);
      const ry = (outerR + 0.3) * Math.sin(angle);
      const rib = this.Manifold.cylinder(h - 4, 1.2, 1.2, 12, true).translate([rx, ry, h / 2]);
      body = body.add(rib);
    }

    // 4. Center Shaft Bore with D-shaft flat profile
    const shaftHole = this.Manifold.cylinder(h + 6, shaftR, shaftR, 24, true).translate([0, 0, h / 2]);
    const flatCut = this.Manifold.cube([shaftD * 2, shaftD * 0.3, h + 8], true)
      .translate([0, shaftR - shaftD * 0.15, h / 2]);
    const dShaft = shaftHole.subtract(flatCut);

    // 5. Side set-screw horizontal bore (M3 / 3mm screw hole on the side)
    const setScrew = this.Manifold.cylinder(outerD, 1.6, 1.6, 16, true)
      .rotate([90, 0, 0])
      .translate([0, 0, h * 0.4]);

    // 6. Top position indicator dot / notch
    const indicatorNotch = this.Manifold.cube([2.5, 6, 2], true)
      .translate([0, outerR - 4, h]);

    return body.subtract(dShaft).subtract(setScrew).subtract(indicatorNotch);
  }

  /**
   * Custom AI-Synthesized Solid from Gemini 4 Hydrogen CSG Graph
   */
  buildCustomAiModel(nodes: CustomCsgNode[]): any {
    this.ensureReady();
    if (!nodes || nodes.length === 0) {
      return this.roundedBox([60, 60, 20], 3);
    }

    let rootSolid: any = null;

    for (const node of nodes) {
      let part: any = null;
      const pos = node.position || [0, 0, 0];
      const rot = node.rotationDeg || [0, 0, 0];

      if (node.type === 'box') {
        const size = node.size || [30, 30, 20];
        const r = node.roundRadius || 0;
        part = this.roundedBox(size, r);
      } else if (node.type === 'cylinder') {
        const h = node.height || 30;
        const r = node.radius || 15;
        part = this.Manifold.cylinder(h, r, r, 32, true);
      } else if (node.type === 'sphere') {
        const r = node.radius || 15;
        part = this.Manifold.sphere(r, 32);
      } else if (node.type === 'qr_code') {
        const sizeMm = node.size?.[0] || 52;
        const depthMm = node.size?.[2] || 1.4;
        part = this.generateQrCodeSolid({
          text: node.text || 'https://j3d.msoms.ai',
          sizeMm,
          depthMm,
        });
        if (rot[0] === 0 && rot[1] === 0 && rot[2] === 0 && pos[2] > 15) {
          rot[0] = 90;
        }
      } else if (node.type === 'text' || node.type === 'calligraphy') {
        const widthMm = node.size?.[0] || 68;
        const depthMm = node.size?.[2] || 2.4;
        const textSolid = this.generate3dTextSolid({
          text: node.text || 'J3D',
          widthMm,
          depthMm,
        });
        if (textSolid) {
          part = textSolid;
          if (rot[0] === 0 && rot[1] === 0 && rot[2] === 0 && pos[2] > 15) {
            rot[0] = 90;
          }
        }
      }

      if (!part) continue;

      if (rot[0] !== 0 || rot[1] !== 0 || rot[2] !== 0) {
        part = part.rotate(rot);
      }
      if (pos[0] !== 0 || pos[1] !== 0 || pos[2] !== 0) {
        part = part.translate(pos);
      }

      if (!rootSolid) {
        rootSolid = part;
      } else {
        if (node.operation === 'subtract') {
          rootSolid = rootSolid.subtract(part);
        } else if (node.operation === 'intersect') {
          rootSolid = rootSolid.intersect(part);
        } else {
          rootSolid = rootSolid.add(part);
        }
      }
    }

    return rootSolid || this.roundedBox([50, 50, 15], 2);
  }

  // --- Main Compile Engine ---

  compileMesh(options: {
    archetype: string;
    params: Record<string, any>;
    customNodes?: CustomCsgNode[];
    scalePercent?: number;
    material?: MaterialType;
    colorMode?: ColorMode;
    colorHexList?: string[];
    quantity?: number;
    baseSetupFeeAed?: number;
  }): Compiled3DResult {
    this.ensureReady();
    const {
      archetype,
      params,
      customNodes,
      scalePercent = 100,
      material = MaterialType.PLA,
      quantity = 1,
      baseSetupFeeAed = 15,
      colorHexList = ['#F97316'],
    } = options;

    let solid: any = null;

    if (customNodes && customNodes.length > 0) {
      solid = this.buildCustomAiModel(customNodes);
    } else {
      switch (archetype) {
        case 'PHONE_TABLET_DUAL_STAND':
          solid = this.buildPhoneTabletStand(params);
          break;
        case 'BUSINESS_QR_DOOR_STAND':
        case 'BUSINESS_QR_CARD_STAND':
          solid = this.buildBusinessQrStand(params);
          break;
        case 'EID_CURRENCY_HOLDER_RING':
          solid = this.buildEidRing(params);
          break;
        case 'ISLAMIC_CALLIGRAPHY_STAND':
          solid = this.buildCalligraphyStand(params);
          break;
        case 'CONGRATULATIONS_PLAQUE':
          solid = this.buildCongratulationsPlaque(params);
          break;
        case 'HEADPHONE_HANGER_STAND':
          solid = this.buildHeadphoneHangerStand(params);
          break;
        case 'NEWBORN_KEEPSAKE_SIGN':
          solid = this.buildNewbornKidsSign(params);
          break;
        case 'SCHOOL_STEM_GEAR_MODEL':
          solid = this.buildSchoolStemGearModel(params);
          break;
        case 'HOME_DIY_CUSTOM_BRACKET':
          solid = this.buildHomeDiyBracket(params);
          break;
        case 'CUSTOM_REPLACEMENT_PART':
          solid = this.buildCustomReplacementPart(params);
          break;
        default:
          solid = this.buildPhoneTabletStand(params);
          break;
      }
    }

    // Apply uniform scaling
    if (scalePercent !== 100) {
      const s = scalePercent / 100;
      solid = solid.scale([s, s, s]);
    }

    // Extract topology & physical metrics
    const bbox = solid.boundingBox();
    const dimXmm = Math.round(Math.abs(bbox.max[0] - bbox.min[0]) * 10) / 10;
    const dimYmm = Math.round(Math.abs(bbox.max[1] - bbox.min[1]) * 10) / 10;
    const dimZmm = Math.round(Math.abs(bbox.max[2] - bbox.min[2]) * 10) / 10;

    const rawVolumeMm3 = Math.max(100, solid.volume());
    const volumeCm3 = Math.round((rawVolumeMm3 / 1000) * 100) / 100;
    const surfaceAreaCm2 = Math.round((solid.surfaceArea() / 100) * 100) / 100;

    const density = this.materialDensity[material] || 1.24;
    const estimatedWeightG = Math.round(volumeCm3 * density * 10) / 10;
    const triangleCount = solid.numTri();

    // Minimum Floor Calculation
    const ratePerCm3 = this.materialRates[material] || 0.35;
    const materialCostAed = volumeCm3 * ratePerCm3;
    const unitFloorAed = Math.max(18, Math.ceil(materialCostAed + baseSetupFeeAed / Math.max(1, quantity)));

    // Serialize to Binary STL
    const stlBuffer = this.manifoldToStl(solid);

    // Serialize to Bambu Lab Multi-Color .3MF Archive
    const primaryHex = colorHexList[0] || '#F97316';
    const threeMfBuffer = this.manifoldTo3mf(solid, {
      title: `${archetype} (J3D Parametric 3D Model)`,
      colorHex: primaryHex,
    });

    return {
      stlBuffer,
      threeMfBuffer,
      dimXmm,
      dimYmm,
      dimZmm,
      volumeCm3,
      surfaceAreaCm2,
      estimatedWeightG,
      triangleCount,
      isWatertight: true,
      unitFloorAed,
    };
  }

  // --- Export Serializers ---

  /**
   * Serializes Manifold mesh into a 100% compliant Binary STL buffer
   */
  manifoldToStl(solid: any): Buffer {
    const mesh = solid.getMesh();
    const numTri = mesh.numTri;
    const numProp = mesh.numProp;
    const vertProps = mesh.vertProperties;
    const triVerts = mesh.triVerts;

    const buffer = Buffer.alloc(84 + numTri * 50);
    buffer.write('J3D Manifold-3D Binary STL Watertight Export', 0, 80, 'ascii');
    buffer.writeUInt32LE(numTri, 80);

    let offset = 84;
    for (let i = 0; i < numTri; i++) {
      const i0 = triVerts[i * 3] * numProp;
      const i1 = triVerts[i * 3 + 1] * numProp;
      const i2 = triVerts[i * 3 + 2] * numProp;

      const ax = vertProps[i0], ay = vertProps[i0 + 1], az = vertProps[i0 + 2];
      const bx = vertProps[i1], by = vertProps[i1 + 1], bz = vertProps[i1 + 2];
      const cx = vertProps[i2], cy = vertProps[i2 + 1], cz = vertProps[i2 + 2];

      // Surface Normal: (B - A) x (C - A)
      const u1 = bx - ax, u2 = by - ay, u3 = bz - az;
      const v1 = cx - ax, v2 = cy - ay, v3 = cz - az;
      let nx = u2 * v3 - u3 * v2;
      let ny = u3 * v1 - u1 * v3;
      let nz = u1 * v2 - u2 * v1;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      nx /= len; ny /= len; nz /= len;

      buffer.writeFloatLE(nx, offset);
      buffer.writeFloatLE(ny, offset + 4);
      buffer.writeFloatLE(nz, offset + 8);

      buffer.writeFloatLE(ax, offset + 12);
      buffer.writeFloatLE(ay, offset + 16);
      buffer.writeFloatLE(az, offset + 20);

      buffer.writeFloatLE(bx, offset + 24);
      buffer.writeFloatLE(by, offset + 28);
      buffer.writeFloatLE(bz, offset + 32);

      buffer.writeFloatLE(cx, offset + 36);
      buffer.writeFloatLE(cy, offset + 40);
      buffer.writeFloatLE(cz, offset + 44);

      buffer.writeUInt16LE(0, offset + 48);
      offset += 50;
    }

    return buffer;
  }

  /**
   * Serializes Manifold mesh into a Bambu Lab compatible .3MF ZIP archive
   */
  manifoldTo3mf(solid: any, options: { title: string; colorHex?: string }): Buffer {
    const mesh = solid.getMesh();
    const numTri = mesh.numTri;
    const numProp = mesh.numProp;
    const vertProps = mesh.vertProperties;
    const triVerts = mesh.triVerts;
    const colorHex = options.colorHex || '#F97316';

    // Build 3D/3dmodel.model XML
    let verticesXml = '';
    const numVert = mesh.numVert;
    for (let v = 0; v < numVert; v++) {
      const idx = v * numProp;
      const x = vertProps[idx].toFixed(4);
      const y = vertProps[idx + 1].toFixed(4);
      const z = vertProps[idx + 2].toFixed(4);
      verticesXml += `<vertex x="${x}" y="${y}" z="${z}"/>`;
    }

    let trianglesXml = '';
    for (let t = 0; t < numTri; t++) {
      const v1 = triVerts[t * 3];
      const v2 = triVerts[t * 3 + 1];
      const v3 = triVerts[t * 3 + 2];
      trianglesXml += `<triangle v1="${v1}" v2="${v2}" v3="${v3}"/>`;
    }

    const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:m="http://schemas.microsoft.com/3dmanufacturing/material/2015/02">
  <metadata name="Title">${options.title}</metadata>
  <metadata name="Application">J3D Platform (msoms.ai)</metadata>
  <resources>
    <m:colorgroup id="1">
      <m:color color="${colorHex}"/>
    </m:colorgroup>
    <object id="2" type="model" pid="1" pindex="0">
      <mesh>
        <vertices>${verticesXml}</vertices>
        <triangles>${trianglesXml}</triangles>
      </mesh>
    </object>
  </resources>
  <build>
    <item objectid="2"/>
  </build>
</model>`;

    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
</Types>`;

    const relsXml = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>`;

    return this.createZipPackage([
      { name: '[Content_Types].xml', content: contentTypesXml },
      { name: '_rels/.rels', content: relsXml },
      { name: '3D/3dmodel.model', content: modelXml },
    ]);
  }

  /**
   * Fast in-memory ZIP package builder for .3mf container
   */
  private createZipPackage(files: Array<{ name: string; content: string }>): Buffer {
    const localHeaders: Buffer[] = [];
    const centralDirs: Buffer[] = [];
    let offset = 0;

    for (const file of files) {
      const data = Buffer.from(file.content, 'utf-8');
      const name = Buffer.from(file.name, 'utf-8');
      const crc = this.computeCrc32(data);
      const compressed = zlib.deflateRawSync(data);

      const lh = Buffer.alloc(30 + name.length);
      lh.writeUInt32LE(0x04034b50, 0);
      lh.writeUInt16LE(20, 4);
      lh.writeUInt16LE(0, 6);
      lh.writeUInt16LE(8, 8); // Deflate
      lh.writeUInt16LE(0, 10);
      lh.writeUInt16LE(0, 12);
      lh.writeUInt32LE(crc, 14);
      lh.writeUInt32LE(compressed.length, 18);
      lh.writeUInt32LE(data.length, 22);
      lh.writeUInt16LE(name.length, 26);
      lh.writeUInt16LE(0, 28);
      name.copy(lh, 30);

      const localChunk = Buffer.concat([lh, compressed]);
      localHeaders.push(localChunk);

      const cd = Buffer.alloc(46 + name.length);
      cd.writeUInt32LE(0x02014b50, 0);
      cd.writeUInt16LE(20, 4);
      cd.writeUInt16LE(20, 6);
      cd.writeUInt16LE(0, 8);
      cd.writeUInt16LE(8, 10);
      cd.writeUInt16LE(0, 12);
      cd.writeUInt16LE(0, 14);
      cd.writeUInt32LE(crc, 16);
      cd.writeUInt32LE(compressed.length, 20);
      cd.writeUInt32LE(data.length, 24);
      cd.writeUInt16LE(name.length, 28);
      cd.writeUInt16LE(0, 30);
      cd.writeUInt16LE(0, 32);
      cd.writeUInt16LE(0, 34);
      cd.writeUInt16LE(0, 36);
      cd.writeUInt32LE(0, 38);
      cd.writeUInt32LE(offset, 42);
      name.copy(cd, 46);
      centralDirs.push(cd);

      offset += localChunk.length;
    }

    const centralDirBuffer = Buffer.concat(centralDirs);
    const cdOffset = offset;
    const cdSize = centralDirBuffer.length;

    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(0, 4);
    eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(files.length, 8);
    eocd.writeUInt16LE(files.length, 10);
    eocd.writeUInt32LE(cdSize, 12);
    eocd.writeUInt32LE(cdOffset, 16);
    eocd.writeUInt16LE(0, 20);

    return Buffer.concat([...localHeaders, centralDirBuffer, eocd]);
  }

  private computeCrc32(buf: Buffer): number {
    let c = ~0;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
    return ~c >>> 0;
  }
}
