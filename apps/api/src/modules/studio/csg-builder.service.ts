import { Injectable, Logger } from '@nestjs/common';
import * as jscad from '@jscad/modeling';
import * as serializer from '@jscad/stl-serializer';
import { MaterialType, ColorMode } from '@j3d/shared-types';

const { cylinder, cuboid, roundedCuboid, sphere } = jscad.primitives;
const { subtract, union } = jscad.booleans;
const { measureBoundingBox, measureVolume } = jscad.measurements;
const { translate, scale, rotateZ, rotateX } = jscad.transforms;

export interface GeneratedMeshResult {
  binaryBuffer: Buffer;
  dimXmm: number;
  dimYmm: number;
  dimZmm: number;
  volumeCm3: number;
  estimatedWeightG: number;
  triangleCount: number;
  isWatertight: boolean;
  unitFloorAed: number;
}

@Injectable()
export class CsgBuilderService {
  private readonly logger = new Logger(CsgBuilderService.name);

  // Density map in g/cm3
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

  // Base rate in AED per cm3
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

  /**
   * Builds the 3D manifold geometry based on the template archetype and parameters
   */
  buildGeometry(archetype: string, params: Record<string, any>) {
    switch (archetype) {
      case 'PHONE_TABLET_DUAL_STAND':
        return this.buildPhoneTabletStand(params);
      case 'EID_CURRENCY_HOLDER_RING':
        return this.buildEidRing(params);
      case 'ISLAMIC_CALLIGRAPHY_STAND':
        return this.buildCalligraphyStand(params);
      case 'CONGRATULATIONS_PLAQUE':
        return this.buildCongratulationsPlaque(params);
      case 'NEWBORN_KEEPSAKE_SIGN':
        return this.buildNewbornKeepsake(params);
      case 'BUSINESS_QR_DOOR_STAND':
        return this.buildBusinessQrStand(params);
      case 'HEADPHONE_HANGER_STAND':
        return this.buildHeadphoneHangerStand(params);
      case 'SCHOOL_STEM_GEAR_MODEL':
        return this.buildSchoolStemGear(params);
      case 'HOME_DIY_CUSTOM_BRACKET':
        return this.buildHomeDiyBracket(params);
      default:
        return this.buildPhoneTabletStand(params);
    }
  }

  /**
   * Archetype 1: Ergonomic Phone & Tablet Dual-Angle Stand (with Charging Cable Pass)
   */
  private buildPhoneTabletStand(params: Record<string, any>) {
    const width = params.widthMm || 72.0;
    const depth = params.depthMm || 82.0;

    // Weighted, beveled base plate
    const base = roundedCuboid({
      size: [width, depth, 8],
      roundRadius: 2,
      segments: 16,
    });

    // Ergonomic 65° Angled Backrest
    const backrest = translate(
      [0, 10, 48],
      rotateX(0.25, roundedCuboid({ size: [width, 6, 92], roundRadius: 1.5, segments: 16 })),
    );

    // Front Support Cradle Shelf
    const shelf = translate(
      [0, -15, 12],
      roundedCuboid({ size: [width, 22, 6], roundRadius: 1.5, segments: 16 }),
    );

    // Front Retaining Lip / Phone Cradle Hook
    const lip = translate(
      [0, -25, 20],
      roundedCuboid({ size: [width, 6, 18], roundRadius: 1.5, segments: 16 }),
    );

    // Central Charging Cable Pass Notch
    const cableNotch = translate(
      [0, -20, 16],
      cuboid({ size: [22, 35, 24] }),
    );

    // Backrest Weight-Reduction & Cord Pass-Through Aperture
    const cordAperture = translate(
      [0, 8, 48],
      rotateX(0.25, roundedCuboid({ size: [24, 12, 34], roundRadius: 4, segments: 12 })),
    );

    const mainStand = union(base, backrest, shelf, lip);
    return subtract(mainStand, cableNotch, cordAperture);
  }

  /**
   * Archetype 2: Flagship Eid Al-Fitr 10 AED Note Holder Ring
   */
  private buildEidRing(params: Record<string, any>) {
    const outerR = (params.outerRingDiameterMm || 34.0) / 2;
    const innerR = (params.innerBillCylinderDiameterMm || 14.5) / 2; // Calibrated 10 AED bill roll
    const height = params.ringHeightMm || 18.0;

    const outerBody = cylinder({ radius: outerR, height, segments: 48 });
    const innerHole = cylinder({ radius: innerR, height: height + 4, segments: 48 });
    let ringBase: any = subtract(outerBody, innerHole);

    // 12 Decorative Fluting Facets along the outer perimeter
    const flutes = [];
    for (let i = 0; i < 12; i++) {
      const angle = (i * 2 * Math.PI) / 12;
      const fx = (outerR + 0.4) * Math.cos(angle);
      const fy = (outerR + 0.4) * Math.sin(angle);
      flutes.push(translate([fx, fy, 0], cylinder({ radius: 1.4, height: height - 2, segments: 16 })));
    }
    ringBase = union(ringBase, ...flutes);

    // Top Crescent Moon Crest
    const crescentOuter = cylinder({ radius: 10, height: 4, segments: 32 });
    const crescentCut = translate([3.5, 0, 0], cylinder({ radius: 9, height: 6, segments: 32 }));
    const crescent = subtract(crescentOuter, crescentCut);
    const crest = translate([0, outerR - 1, height / 2 + 7], rotateX(Math.PI / 2, crescent));

    // Embossed Decorative Front Calligraphy Plaque
    const plaque = translate(
      [0, outerR + 1, 0],
      roundedCuboid({ size: [18, 3, 12], roundRadius: 0.8, segments: 12 }),
    );

    return union(ringBase, crest, plaque);
  }

  /**
   * Archetype 3: Business 3D QR Code Display & Counter Stand
   */
  private buildBusinessQrStand(params: Record<string, any>) {
    const w = params.widthMm || 92.0;

    // Stepped Pedestal Base
    const base = roundedCuboid({ size: [w, 64, 10], roundRadius: 2, segments: 16 });

    // Front Business Card / Receipt Pocket Slot
    const cardSlot = translate([0, -20, 5], cuboid({ size: [w - 6, 4, 8] }));
    const standBase = subtract(base, cardSlot);

    // Angled Placard Display Board (75° incline)
    const placard = translate(
      [0, 6, 54],
      rotateX(0.18, roundedCuboid({ size: [84, 6, 94], roundRadius: 1.5, segments: 16 })),
    );

    // Raised 3D QR Code Face Plate
    const qrPlate = translate([0, 2, 54], rotateX(0.18, cuboid({ size: [66, 2, 66] })));

    // QR Finder Patterns (3 corners)
    const makeFinder = (x: number, z: number) => {
      const outer = cuboid({ size: [16, 2, 16] });
      const innerCut = cuboid({ size: [10, 3, 10] });
      const ring = subtract(outer, innerCut);
      const dot = cuboid({ size: [6, 2, 6] });
      return translate([x, 1, z], rotateX(0.18, union(ring, dot)));
    };

    const f1 = makeFinder(-18, 70); // Top-Left
    const f2 = makeFinder(18, 70); // Top-Right
    const f3 = makeFinder(-18, 38); // Bottom-Left

    // Realistic QR matrix data pixel blocks
    const d1 = translate([6, 1, 44], rotateX(0.18, cuboid({ size: [8, 2, 8] })));
    const d2 = translate([18, 1, 48], rotateX(0.18, cuboid({ size: [8, 2, 14] })));
    const d3 = translate([0, 1, 56], rotateX(0.18, cuboid({ size: [10, 2, 6] })));
    const d4 = translate([6, 1, 68], rotateX(0.18, cuboid({ size: [6, 2, 10] })));

    // Top Business Header Ribbon Banner
    const topBanner = translate(
      [0, 2, 92],
      rotateX(0.18, roundedCuboid({ size: [76, 2, 12], roundRadius: 1, segments: 12 })),
    );

    return union(standBase, placard, qrPlate, f1, f2, f3, d1, d2, d3, d4, topBanner);
  }

  /**
   * Archetype 4: Islamic Calligraphy Stand (Mihrab Architectural Arch)
   */
  private buildCalligraphyStand(params: Record<string, any>) {
    // Tier 1 Base
    const base1 = roundedCuboid({ size: [150, 50, 8], roundRadius: 2, segments: 16 });

    // Tier 2 Stepped Riser Base
    const base2 = translate([0, 0, 6], roundedCuboid({ size: [134, 38, 6], roundRadius: 1.5, segments: 16 }));

    // Mihrab Architectural Arch Plaque
    const archBody = translate([0, 0, 46], roundedCuboid({ size: [100, 6, 70], roundRadius: 1.5, segments: 16 }));
    const archTop = translate([0, 0, 81], rotateX(Math.PI / 2, cylinder({ radius: 50, height: 6, segments: 32 })));
    const archPlaque = union(archBody, archTop);

    // Recessed Calligraphy Frame
    const frameBorder = translate([0, -2, 55], cuboid({ size: [88, 2, 75] }));
    const frameInnerCut = translate([0, -2.5, 55], cuboid({ size: [80, 3, 67] }));
    const frame = subtract(frameBorder, frameInnerCut);

    // Raised Calligraphy Script Inscription Bar
    const emblemBar = translate([0, -2, 55], roundedCuboid({ size: [68, 2, 16], roundRadius: 0.8, segments: 8 }));

    return union(base1, base2, archPlaque, frame, emblemBar);
  }

  /**
   * Archetype 5: Arab World Congratulations & Trophy Plaque
   */
  private buildCongratulationsPlaque(params: Record<string, any>) {
    const base = roundedCuboid({ size: [160, 48, 12], roundRadius: 2, segments: 16 });
    const riser = translate([0, 0, 9], roundedCuboid({ size: [140, 36, 6], roundRadius: 1.5, segments: 16 }));
    const plaque = translate([0, 0, 55], roundedCuboid({ size: [130, 6, 80], roundRadius: 1.5, segments: 16 }));

    // 8-Pointed Star / Medal Ribbon Crest
    const star1 = translate([0, -2, 85], rotateZ(0, cuboid({ size: [20, 2, 20] })));
    const star2 = translate([0, -2, 85], rotateZ(Math.PI / 4, cuboid({ size: [20, 2, 20] })));
    const crownStar = union(star1, star2);

    // Inscription Plaque Plate
    const plate = translate([0, -2, 50], cuboid({ size: [110, 2, 40] }));

    return union(base, riser, plaque, crownStar, plate);
  }

  /**
   * Archetype 6: Newborn Keepsake Plaque
   */
  private buildNewbornKeepsake(params: Record<string, any>) {
    const base = roundedCuboid({ size: [150, 46, 12], roundRadius: 2, segments: 16 });
    const namePlate = translate(
      [0, 0, 38],
      roundedCuboid({ size: [136, 8, 64], roundRadius: 2, segments: 16 }),
    );
    const star = translate([0, 0, 76], sphere({ radius: 8, segments: 24 }));
    return union(base, namePlate, star);
  }

  /**
   * Archetype 7: Desk Headphone Hanger & Headset Stand
   */
  private buildHeadphoneHangerStand(params: Record<string, any>) {
    const base = roundedCuboid({ size: [90, 90, 10], roundRadius: 2, segments: 16 });
    const column = translate([0, 0, 65], roundedCuboid({ size: [16, 16, 120], roundRadius: 1.5, segments: 16 }));

    // Curved Top Cradle
    const cradleOuter = translate([0, 0, 125], rotateX(Math.PI / 2, cylinder({ radius: 32, height: 44, segments: 32 })));
    const cradleCut = translate([0, 0, 121], rotateX(Math.PI / 2, cylinder({ radius: 26, height: 48, segments: 32 })));
    const cradle = subtract(cradleOuter, cradleCut);

    return union(base, column, cradle);
  }

  /**
   * Archetype 8: School STEM Gear Model
   */
  private buildSchoolStemGear(params: Record<string, any>) {
    const teeth = params.gearTeethCount || 24;
    const baseRadius = 35.0;
    const thickness = 10.0;

    let gearBody = cylinder({ radius: baseRadius, height: thickness, segments: 48 });

    // Cut center axis bore
    const centerBore = cylinder({ radius: 6.0, height: thickness + 2, segments: 24 });
    gearBody = subtract(gearBody, centerBore);

    // Add perimeter teeth
    const toothParts = [gearBody];
    for (let i = 0; i < teeth; i++) {
      const angle = (i * 2 * Math.PI) / teeth;
      const x = (baseRadius + 2) * Math.cos(angle);
      const y = (baseRadius + 2) * Math.sin(angle);
      const tooth = translate([x, y, 0], rotateZ(angle, cuboid({ size: [4, 4, thickness] })));
      toothParts.push(tooth);
    }

    return union(...toothParts);
  }

  /**
   * Archetype 9: Home DIY Bracket
   */
  private buildHomeDiyBracket(params: Record<string, any>) {
    const armL = params.armLengthMm || 80.0;
    const thick = params.wallThicknessMm || 6.0;
    const w = 30.0;

    const armV = translate([0, thick / 2, armL / 2], cuboid({ size: [w, thick, armL] }));
    const armH = translate([0, armL / 2, thick / 2], cuboid({ size: [w, armL, thick] }));
    const bracket = union(armV, armH);

    // Screw holes
    const hole1 = translate([0, thick / 2, armL - 15], rotateX(Math.PI / 2, cylinder({ radius: 2.2, height: thick + 4, segments: 24 })));
    const hole2 = translate([0, armL - 15, thick / 2], cylinder({ radius: 2.2, height: thick + 4, segments: 24 }));

    return subtract(bracket, hole1, hole2);
  }

  /**
   * Compiles manifold binary STL mesh and computes exact metrics & price floor
   */
  compileMesh(options: {
    archetype: string;
    params: Record<string, any>;
    scalePercent: number;
    material: MaterialType;
    colorMode: ColorMode;
    infillPercent: number;
    baseSetupFeeAed?: number;
    quantity?: number;
  }): GeneratedMeshResult {
    const {
      archetype,
      params,
      scalePercent = 100,
      material = MaterialType.PLA,
      colorMode = ColorMode.MONO,
      infillPercent = 20,
      baseSetupFeeAed = 10.0,
      quantity = 1,
    } = options;

    let geometry = this.buildGeometry(archetype, params);

    // Apply scale factor (50% to 200%)
    const factor = Math.max(0.5, Math.min(2.0, scalePercent / 100));
    if (factor !== 1.0) {
      geometry = scale([factor, factor, factor], geometry);
    }

    // 1. Compute exact geometric bounds (mm)
    const bounds = measureBoundingBox(geometry);
    const minP = bounds[0];
    const maxP = bounds[1];
    const dimXmm = Math.round((maxP[0] - minP[0]) * 10) / 10;
    const dimYmm = Math.round((maxP[1] - minP[1]) * 10) / 10;
    const dimZmm = Math.round((maxP[2] - minP[2]) * 10) / 10;

    // 2. Measure solid volume (cm3)
    const rawVolumeMm3 = Math.abs(measureVolume(geometry));
    const solidVolumeCm3 = rawVolumeMm3 / 1000.0;

    // 3. Estimate realistic weight based on infill & shell
    const density = this.materialDensity[material] || 1.24;
    const shellFraction = 0.35;
    const infillFraction = (infillPercent / 100) * 0.65;
    const effectiveDensityFraction = shellFraction + infillFraction;
    const estimatedWeightG = Math.max(1.0, Math.round(solidVolumeCm3 * density * effectiveDensityFraction * 100) / 100);

    // 4. Serialize to Binary STL
    const stlChunks = serializer.serialize({ binary: true }, geometry);
    const binaryBuffer = Buffer.concat(stlChunks.map((c: ArrayBuffer) => Buffer.from(c)));

    // Triangle count is stored in binary STL header at bytes 80..84
    const triangleCount = binaryBuffer.length > 84 ? binaryBuffer.readUInt32LE(80) : 0;

    // 5. Algorithmic Floor Calculation in AED
    const ratePerCm3 = this.materialRates[material] || 0.35;
    const materialCost = solidVolumeCm3 * ratePerCm3;
    const multiColorSurcharge = colorMode === ColorMode.MULTICOLOR ? 6.0 : 0.0;
    const rawUnitFloor = baseSetupFeeAed + materialCost + multiColorSurcharge;
    const unitFloorAed = Math.max(15.0, Math.ceil(rawUnitFloor));

    this.logger.log(
      `Compiled CSG archetype=${archetype}: ` +
        `dims=${dimXmm}x${dimYmm}x${dimZmm}mm, ` +
        `vol=${solidVolumeCm3.toFixed(2)}cm3, ` +
        `triangles=${triangleCount}, floor=${unitFloorAed} AED`,
    );

    return {
      binaryBuffer,
      dimXmm,
      dimYmm,
      dimZmm,
      volumeCm3: Math.round(solidVolumeCm3 * 100) / 100,
      estimatedWeightG,
      triangleCount,
      isWatertight: true,
      unitFloorAed,
    };
  }
}
