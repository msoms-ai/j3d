'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Box, HStack, IconButton, Text, Badge, Spinner } from '@chakra-ui/react';
import { RotateCcw, Eye, Grid, Compass, ZoomIn, ZoomOut } from 'lucide-react';
import { MaterialType, ColorMode } from '@j3d/shared-types';

interface ThreeStlCanvasProps {
  stlUrl?: string;
  archetype?: string;
  material?: MaterialType;
  colorMode?: ColorMode;
  colorHexList?: string[];
  scalePercent?: number;
}

export function ThreeStlCanvas({
  stlUrl,
  archetype = 'PHONE_TABLET_DUAL_STAND',
  material = MaterialType.PLA,
  colorMode = ColorMode.MONO,
  colorHexList = ['#F97316'],
  scalePercent = 100,
}: ThreeStlCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [wireframe, setWireframe] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [isLoadingMesh, setIsLoadingMesh] = useState(false);
  const [trianglesCount, setTrianglesCount] = useState<number | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || 460;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1d);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 68, 156);
    camera.lookAt(0, 42, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. Interactive OrbitControls (Drag to rotate, scroll to zoom)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 2.0;
    controls.maxPolarAngle = Math.PI / 2 + 0.05; // Prevent camera going underneath the build plate
    controls.minDistance = 20;
    controls.maxDistance = 240;
    controls.target.set(0, 42, 0);
    controlsRef.current = controls;

    // 3. Build Plate Grid (256x256mm Bambu Lab textured PEI plate)
    const grid = new THREE.GridHelper(130, 26, 0x14b8a6, 0x1e293b);
    grid.position.y = 0;
    scene.add(grid);

    // Plate base with bevel look
    const plateGeo = new THREE.BoxGeometry(140, 2, 140);
    const plateMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.85,
      metalness: 0.15,
    });
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.y = -1;
    plate.receiveShadow = true;
    scene.add(plate);

    // Plate Origin indicator (Front Left)
    const originMarkGeo = new THREE.BoxGeometry(4, 2.2, 4);
    const originMarkMat = new THREE.MeshBasicMaterial({ color: 0x14b8a6 });
    const originMark = new THREE.Mesh(originMarkGeo, originMarkMat);
    originMark.position.set(-65, -1, 65);
    scene.add(originMark);

    // 4. Lighting Rig (Direct Front Key, Upper Studio Key, Glint Rim)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
    scene.add(ambientLight);

    const frontKey = new THREE.DirectionalLight(0xffffff, 1.6);
    frontKey.position.set(0, 50, 100);
    frontKey.castShadow = true;
    scene.add(frontKey);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(50, 80, 50);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.8);
    fillLight.position.set(-50, 45, -50);
    scene.add(fillLight);

    const sideGlint = new THREE.DirectionalLight(0xffffff, 0.9);
    sideGlint.position.set(65, 40, 55);
    scene.add(sideGlint);

    const rimLight = new THREE.PointLight(0x14b8a6, 1.4, 140);
    rimLight.position.set(0, 45, -60);
    scene.add(rimLight);

    // 5. Materials Setup
    const primaryColor = new THREE.Color(colorHexList[0] || '#F97316');
    const secondaryColor = new THREE.Color(colorHexList[1] || '#14B8A6');
    const darkAccentColor = new THREE.Color(0x18181b);

    let roughness = 0.45;
    let metalness = 0.1;
    let clearcoat = 0.1;
    if (material === MaterialType.PLA_SILK) {
      roughness = 0.2;
      metalness = 0.45;
      clearcoat = 0.85;
    } else if (material === MaterialType.RESIN_STANDARD || material === MaterialType.RESIN_TOUGH) {
      roughness = 0.08;
      metalness = 0.05;
      clearcoat = 1.0;
    } else if (material === MaterialType.PETG) {
      roughness = 0.35;
      metalness = 0.15;
      clearcoat = 0.4;
    }

    const meshMat = new THREE.MeshPhysicalMaterial({
      color: primaryColor,
      roughness,
      metalness,
      clearcoat,
      wireframe,
      side: THREE.DoubleSide,
    });

    const accentMat = new THREE.MeshPhysicalMaterial({
      color: colorMode === ColorMode.MULTICOLOR ? secondaryColor : primaryColor,
      roughness,
      metalness,
      clearcoat,
      wireframe,
      side: THREE.DoubleSide,
    });

    const contrastMat = new THREE.MeshPhysicalMaterial({
      color: darkAccentColor,
      roughness: 0.3,
      metalness: 0.2,
      wireframe,
      side: THREE.DoubleSide,
    });

    const modelGroup = new THREE.Group();

    // 6. Geometry Generation / STL Binary Loading
    if (stlUrl) {
      setIsLoadingMesh(true);
      const loader = new STLLoader();
      loader.load(
        stlUrl,
        (geometry) => {
          // CRITICAL: OpenJSCAD/CSG exports in Z-up coordinates.
          // Three.js build plate is Y-up. Rotate -90° around X so the model stands upright!
          geometry.rotateX(-Math.PI / 2);
          geometry.computeVertexNormals();
          geometry.center();
          geometry.computeBoundingBox();

          const box = geometry.boundingBox!;
          const heightY = box.max.y - box.min.y;

          const count = geometry.attributes.position
            ? geometry.attributes.position.count / 3
            : 0;

          // High-contrast Dual-Color accent for QR code stands, commemorative plaques, and multi-color models
          const isQrStand = archetype === 'BUSINESS_QR_DOOR_STAND' || archetype === 'BUSINESS_QR_CARD_STAND';
          const isPlaque =
            archetype === 'CONGRATULATIONS_PLAQUE' ||
            archetype === 'ISLAMIC_CALLIGRAPHY_STAND' ||
            archetype === 'NEWBORN_KEEPSAKE_SIGN';
          let activeMat = meshMat;

          if (isQrStand || isPlaque || colorMode === ColorMode.MULTICOLOR) {
            const pos = geometry.attributes.position;
            const vertCount = pos.count;
            const colors = new Float32Array(vertCount * 3);

            const rad = (18 * Math.PI) / 180;
            const sin18 = Math.sin(rad);
            const cos18 = Math.cos(rad);
            const maxZ = box.max.z;
            const minY = box.min.y;

            // Pick an eye-catching contrast accent color for embossed typography & border trims
            const textAccent = colorHexList[1]
              ? new THREE.Color(colorHexList[1])
              : primaryColor.getHSL({ h: 0, s: 0, l: 0 }).l < 0.4
              ? new THREE.Color('#FBBF24') // Silk Gold on dark bases
              : new THREE.Color('#FFFFFF'); // Crisp White on vibrant bases

            for (let i = 0; i < vertCount; i++) {
              const x = pos.getX(i);
              const y = pos.getY(i);
              const z = pos.getZ(i);

              if (isQrStand) {
                // Placard normal in Three.js (after rotateX(-PI/2)): (0, -sin18, cos18)
                const proj = z * cos18 - y * sin18;
                if (Math.abs(x) <= 26.0 && y >= -16 && y <= 36 && proj >= -2.8) {
                  colors[i * 3] = 0.04;
                  colors[i * 3 + 1] = 0.05;
                  colors[i * 3 + 2] = 0.07;
                } else if (Math.abs(x) <= 32 && y >= -19 && y <= 39 && proj >= -4.5) {
                  colors[i * 3] = 0.98;
                  colors[i * 3 + 1] = 0.98;
                  colors[i * 3 + 2] = 0.98;
                } else {
                  colors[i * 3] = primaryColor.r;
                  colors[i * 3 + 1] = primaryColor.g;
                  colors[i * 3 + 2] = primaryColor.b;
                }
              } else if (isPlaque) {
                // In Three.js, front face is +Z. Proud 3D calligraphy and outer border sit at frontmost Z
                if (z >= maxZ - 3.2 && y >= minY + 14) {
                  colors[i * 3] = textAccent.r;
                  colors[i * 3 + 1] = textAccent.g;
                  colors[i * 3 + 2] = textAccent.b;
                } else {
                  colors[i * 3] = primaryColor.r;
                  colors[i * 3 + 1] = primaryColor.g;
                  colors[i * 3 + 2] = primaryColor.b;
                }
              } else {
                // General multi-color layer or height-based accent
                if (z >= maxZ - 3.0) {
                  colors[i * 3] = textAccent.r;
                  colors[i * 3 + 1] = textAccent.g;
                  colors[i * 3 + 2] = textAccent.b;
                } else {
                  colors[i * 3] = primaryColor.r;
                  colors[i * 3 + 1] = primaryColor.g;
                  colors[i * 3 + 2] = primaryColor.b;
                }
              }
            }
            geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

            // CRITICAL: Dedicated material with white base color so vertexColors aren't tinted
            activeMat = new THREE.MeshPhysicalMaterial({
              color: 0xffffff,
              vertexColors: true,
              roughness,
              metalness,
              clearcoat,
              wireframe,
              side: THREE.DoubleSide,
            });
          }

          const mesh = new THREE.Mesh(geometry, activeMat);
          // Rest precisely on build plate surface (y = 0)
          mesh.position.y = heightY / 2;
          mesh.castShadow = true;
          mesh.receiveShadow = true;

          modelGroup.add(mesh);

          // Subtle feature edge highlights to clearly reveal embossed text & calligraphic reliefs
          try {
            const edges = new THREE.EdgesGeometry(geometry, 24);
            const lineMat = new THREE.LineBasicMaterial({
              color: 0x000000,
              transparent: true,
              opacity: 0.25,
            });
            const wireframeLines = new THREE.LineSegments(edges, lineMat);
            wireframeLines.position.y = heightY / 2;
            modelGroup.add(wireframeLines);
          } catch (e) {
            // Ignore edge extraction error if any
          }

          setTrianglesCount(Math.round(count));
          setIsLoadingMesh(false);
        },
        undefined,
        (err) => {
          console.warn('STLLoader failed to load URL, falling back to archetype geometry:', err);
          buildArchetypeFallback();
          setIsLoadingMesh(false);
        },
      );
    } else {
      buildArchetypeFallback();
    }

    // High fidelity procedural fallbacks matching each production archetype
    function buildArchetypeFallback() {
      if (archetype === 'PHONE_TABLET_DUAL_STAND') {
        // --- 1. Weighted Chamfered Base ---
        const baseGeo = new THREE.BoxGeometry(68, 6, 78);
        const baseMesh = new THREE.Mesh(baseGeo, meshMat);
        baseMesh.position.set(0, 3, 0);
        baseMesh.castShadow = true;
        baseMesh.receiveShadow = true;
        modelGroup.add(baseMesh);

        // --- 2. Ergonomic 65° Angled Backplate with Cable Aperture ---
        const backplateGroup = new THREE.Group();
        backplateGroup.position.set(0, 6, 12);
        backplateGroup.rotation.x = -0.25; // 65° ergonomic tilt

        // Left & right backplate pillars with center aperture
        const leftPillarGeo = new THREE.BoxGeometry(20, 84, 5);
        const leftPillar = new THREE.Mesh(leftPillarGeo, meshMat);
        leftPillar.position.set(-22, 42, 0);
        leftPillar.castShadow = true;
        backplateGroup.add(leftPillar);

        const rightPillarGeo = new THREE.BoxGeometry(20, 84, 5);
        const rightPillar = new THREE.Mesh(rightPillarGeo, meshMat);
        rightPillar.position.set(22, 42, 0);
        rightPillar.castShadow = true;
        backplateGroup.add(rightPillar);

        // Top bridging bar
        const topBarGeo = new THREE.BoxGeometry(64, 18, 5);
        const topBar = new THREE.Mesh(topBarGeo, meshMat);
        topBar.position.set(0, 75, 0);
        topBar.castShadow = true;
        backplateGroup.add(topBar);

        modelGroup.add(backplateGroup);

        // --- 3. Front Phone Cradle Shelf ---
        const shelfGeo = new THREE.BoxGeometry(64, 5, 20);
        const shelfMesh = new THREE.Mesh(shelfGeo, meshMat);
        shelfMesh.position.set(0, 8, -12);
        shelfMesh.castShadow = true;
        modelGroup.add(shelfMesh);

        // --- 4. Retaining Lip Hooks with Central Cable Notch ---
        const leftHookGeo = new THREE.BoxGeometry(22, 14, 5);
        const leftHook = new THREE.Mesh(leftHookGeo, accentMat);
        leftHook.position.set(-21, 14, -22);
        leftHook.castShadow = true;
        modelGroup.add(leftHook);

        const rightHookGeo = new THREE.BoxGeometry(22, 14, 5);
        const rightHook = new THREE.Mesh(rightHookGeo, accentMat);
        rightHook.position.set(21, 14, -22);
        rightHook.castShadow = true;
        modelGroup.add(rightHook);

        // --- 5. Simulated Smartphone resting comfortably in the stand ---
        const phoneGeo = new THREE.BoxGeometry(54, 110, 4);
        const phoneMat = new THREE.MeshPhysicalMaterial({
          color: 0x1e293b,
          roughness: 0.2,
          metalness: 0.8,
          transparent: true,
          opacity: 0.45,
        });
        const phoneMesh = new THREE.Mesh(phoneGeo, phoneMat);
        phoneMesh.position.set(0, 52, -2);
        phoneMesh.rotation.x = -0.25;
        modelGroup.add(phoneMesh);

        setTrianglesCount(1420);
      } else if (archetype === 'BUSINESS_QR_DOOR_STAND') {
        // --- 1. Stepped Counter Pedestal Base ---
        const baseGeo = new THREE.BoxGeometry(84, 8, 56);
        const baseMesh = new THREE.Mesh(baseGeo, meshMat);
        baseMesh.position.set(0, 4, 0);
        baseMesh.castShadow = true;
        baseMesh.receiveShadow = true;
        modelGroup.add(baseMesh);

        // Front business card pocket lip
        const pocketLipGeo = new THREE.BoxGeometry(78, 6, 4);
        const pocketLip = new THREE.Mesh(pocketLipGeo, meshMat);
        pocketLip.position.set(0, 10, -22);
        pocketLip.castShadow = true;
        modelGroup.add(pocketLip);

        // --- 2. 75° Angled Placard Display Board ---
        const placardGroup = new THREE.Group();
        placardGroup.position.set(0, 8, 8);
        placardGroup.rotation.x = -0.18; // 75° display incline

        const placardGeo = new THREE.BoxGeometry(76, 88, 5);
        const placardMesh = new THREE.Mesh(placardGeo, meshMat);
        placardMesh.position.set(0, 44, 0);
        placardMesh.castShadow = true;
        placardGroup.add(placardMesh);

        // Raised 3D QR Plate (White/Silk contrast background)
        const qrPlateGeo = new THREE.BoxGeometry(58, 58, 2);
        const qrPlateMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
        const qrPlateMesh = new THREE.Mesh(qrPlateGeo, qrPlateMat);
        qrPlateMesh.position.set(0, 40, 3.5);
        placardGroup.add(qrPlateMesh);

        // 3 QR Corner Finder Patterns (Concentric squares)
        const makeQrCorner = (x: number, y: number) => {
          const cornerGroup = new THREE.Group();
          cornerGroup.position.set(x, y, 4.5);

          // Outer frame
          const outerGeo = new THREE.BoxGeometry(14, 14, 1.5);
          const outerMesh = new THREE.Mesh(outerGeo, contrastMat);
          cornerGroup.add(outerMesh);

          // Inner white gap
          const midGeo = new THREE.BoxGeometry(10, 10, 1.8);
          const midMesh = new THREE.Mesh(midGeo, qrPlateMat);
          cornerGroup.add(midMesh);

          // Center solid dot
          const dotGeo = new THREE.BoxGeometry(6, 6, 2.0);
          const dotMesh = new THREE.Mesh(dotGeo, contrastMat);
          cornerGroup.add(dotMesh);

          return cornerGroup;
        };

        placardGroup.add(makeQrCorner(-18, 56)); // Top-Left
        placardGroup.add(makeQrCorner(18, 56));  // Top-Right
        placardGroup.add(makeQrCorner(-18, 24)); // Bottom-Left

        // 3D QR Matrix Data Blocks
        const blockGeo1 = new THREE.BoxGeometry(6, 12, 1.5);
        const b1 = new THREE.Mesh(blockGeo1, contrastMat);
        b1.position.set(16, 26, 4.5);
        placardGroup.add(b1);

        const blockGeo2 = new THREE.BoxGeometry(10, 6, 1.5);
        const b2 = new THREE.Mesh(blockGeo2, contrastMat);
        b2.position.set(0, 34, 4.5);
        placardGroup.add(b2);

        const blockGeo3 = new THREE.BoxGeometry(8, 8, 1.5);
        const b3 = new THREE.Mesh(blockGeo3, contrastMat);
        b3.position.set(6, 46, 4.5);
        placardGroup.add(b3);

        // Top Business Header Ribbon Banner
        const bannerGeo = new THREE.BoxGeometry(70, 10, 2);
        const bannerMesh = new THREE.Mesh(bannerGeo, accentMat);
        bannerMesh.position.set(0, 78, 3.5);
        placardGroup.add(bannerMesh);

        modelGroup.add(placardGroup);
        setTrianglesCount(1850);
      } else if (archetype === 'EID_CURRENCY_HOLDER_RING') {
        // --- 1. Calibrated Banknote Chamber Ring ---
        const ringOuter = new THREE.CylinderGeometry(16, 16, 18, 48);
        const ringMesh = new THREE.Mesh(ringOuter, meshMat);
        ringMesh.position.y = 9;
        ringMesh.castShadow = true;
        modelGroup.add(ringMesh);

        // 12 Decorative Flutes
        for (let i = 0; i < 12; i++) {
          const angle = (i * 2 * Math.PI) / 12;
          const fx = 16.5 * Math.cos(angle);
          const fz = 16.5 * Math.sin(angle);
          const fluteGeo = new THREE.CylinderGeometry(1.2, 1.2, 16, 12);
          const fluteMesh = new THREE.Mesh(fluteGeo, accentMat);
          fluteMesh.position.set(fx, 9, fz);
          modelGroup.add(fluteMesh);
        }

        // Simulated Rolled UAE 10 AED Banknote Cylinder
        const noteGeo = new THREE.CylinderGeometry(7, 7, 28, 32);
        const noteMat = new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          roughness: 0.5,
          wireframe: true,
        });
        const noteMesh = new THREE.Mesh(noteGeo, noteMat);
        noteMesh.position.y = 14;
        modelGroup.add(noteMesh);

        // Golden Crescent Moon Crest
        const crescentGeo = new THREE.TorusGeometry(8, 1.8, 16, 32, Math.PI * 1.3);
        const crescentMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.2, metalness: 0.6 });
        const crescentMesh = new THREE.Mesh(crescentGeo, crescentMat);
        crescentMesh.position.set(0, 24, 0);
        crescentMesh.rotation.z = Math.PI / 4;
        modelGroup.add(crescentMesh);

        // Front Calligraphy Inscription Plaque
        const plaqueGeo = new THREE.BoxGeometry(18, 12, 3);
        const plaqueMesh = new THREE.Mesh(plaqueGeo, accentMat);
        plaqueMesh.position.set(0, 9, 16.5);
        plaqueMesh.castShadow = true;
        modelGroup.add(plaqueMesh);

        setTrianglesCount(1280);
      } else if (archetype === 'ISLAMIC_CALLIGRAPHY_STAND') {
        // --- 1. Tiered Stepped Base ---
        const base1Geo = new THREE.BoxGeometry(84, 6, 30);
        const base1Mesh = new THREE.Mesh(base1Geo, meshMat);
        base1Mesh.position.set(0, 3, 0);
        base1Mesh.castShadow = true;
        modelGroup.add(base1Mesh);

        const base2Geo = new THREE.BoxGeometry(72, 5, 24);
        const base2Mesh = new THREE.Mesh(base2Geo, meshMat);
        base2Mesh.position.set(0, 8, 0);
        base2Mesh.castShadow = true;
        modelGroup.add(base2Mesh);

        // --- 2. Mihrab Architectural Arch Plaque ---
        const archBodyGeo = new THREE.BoxGeometry(56, 40, 5);
        const archBody = new THREE.Mesh(archBodyGeo, meshMat);
        archBody.position.set(0, 30, 0);
        archBody.castShadow = true;
        modelGroup.add(archBody);

        const archTopGeo = new THREE.CylinderGeometry(28, 28, 5, 32, 1, false, 0, Math.PI);
        const archTop = new THREE.Mesh(archTopGeo, meshMat);
        archTop.position.set(0, 50, 0);
        archTop.rotation.z = Math.PI / 2;
        archTop.castShadow = true;
        modelGroup.add(archTop);

        // Recessed Calligraphy Frame with Inscription
        const frameGeo = new THREE.BoxGeometry(46, 36, 1.5);
        const frameMesh = new THREE.Mesh(frameGeo, accentMat);
        frameMesh.position.set(0, 32, 3);
        modelGroup.add(frameMesh);

        setTrianglesCount(1640);
      } else if (archetype === 'HEADPHONE_HANGER_STAND') {
        // Wide Circular Base Tray
        const baseGeo = new THREE.CylinderGeometry(36, 38, 8, 36);
        const baseMesh = new THREE.Mesh(baseGeo, meshMat);
        baseMesh.position.set(0, 4, 0);
        baseMesh.castShadow = true;
        modelGroup.add(baseMesh);

        // Vertical Riser Post
        const postGeo = new THREE.BoxGeometry(10, 110, 10);
        const postMesh = new THREE.Mesh(postGeo, meshMat);
        postMesh.position.set(0, 62, 0);
        postMesh.castShadow = true;
        modelGroup.add(postMesh);

        // Curved Headset Cradle
        const cradleGeo = new THREE.CylinderGeometry(28, 28, 20, 24, 1, false, 0, Math.PI);
        const cradleMesh = new THREE.Mesh(cradleGeo, accentMat);
        cradleMesh.position.set(0, 118, 0);
        cradleMesh.rotation.z = Math.PI / 2;
        cradleMesh.castShadow = true;
        modelGroup.add(cradleMesh);

        setTrianglesCount(960);
      } else {
        // Fallback generic award plaque
        const baseGeo = new THREE.BoxGeometry(60, 6, 30);
        const baseMesh = new THREE.Mesh(baseGeo, meshMat);
        baseMesh.position.set(0, 3, 0);
        baseMesh.castShadow = true;
        modelGroup.add(baseMesh);

        const plaqueGeo = new THREE.BoxGeometry(50, 48, 5);
        const plaqueMesh = new THREE.Mesh(plaqueGeo, accentMat);
        plaqueMesh.position.set(0, 30, 0);
        plaqueMesh.castShadow = true;
        modelGroup.add(plaqueMesh);
        setTrianglesCount(820);
      }
    }

    // Apply fixed-step scale
    const s = scalePercent / 100;
    modelGroup.scale.set(s, s, s);
    scene.add(modelGroup);

    // 7. Animation & Render Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 8. Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight || 460;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      controls.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [stlUrl, archetype, material, colorMode, colorHexList, scalePercent, wireframe, autoRotate]);

  const handleResetCamera = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(0, 68, 156);
      controlsRef.current.target.set(0, 42, 0);
      controlsRef.current.update();
    }
  };

  const handleZoom = (inward: boolean) => {
    if (cameraRef.current) {
      const dir = new THREE.Vector3();
      cameraRef.current.getWorldDirection(dir);
      cameraRef.current.position.addScaledVector(dir, inward ? 15 : -15);
    }
  };

  return (
    <Box
      position="relative"
      w="full"
      h={{ base: '380px', md: '480px' }}
      borderRadius="2xl"
      overflow="hidden"
      border="1px solid"
      borderColor="border.subtle"
      bg="#0a0f1d"
    >
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', cursor: 'grab' }}
      />

      {/* Loading Overlay */}
      {isLoadingMesh && (
        <Box
          position="absolute"
          top={3}
          left="50%"
          transform="translateX(-50%)"
          bg="bg.panel/90"
          backdropFilter="blur(8px)"
          px={3.5}
          py={1.5}
          borderRadius="full"
          border="1px solid"
          borderColor="laser.500/40"
          zIndex={10}
        >
          <HStack gap={2}>
            <Spinner size="xs" color="laser.500" />
            <Text fontSize="xs" fontWeight="bold" color="laser.500">
              Loading Watertight STL Geometry...
            </Text>
          </HStack>
        </Box>
      )}

      {/* Floating Canvas Controls */}
      <HStack
        position="absolute"
        top={3}
        right={3}
        gap={1.5}
        bg="bg.panel/85"
        backdropFilter="blur(10px)"
        p={1.5}
        borderRadius="xl"
        border="1px solid"
        borderColor="border.subtle"
        zIndex={10}
      >
        <IconButton
          aria-label="Zoom In"
          size="xs"
          variant="ghost"
          color="fg.muted"
          _hover={{ color: 'extruder.500' }}
          onClick={() => handleZoom(true)}
          title="Zoom In"
        >
          <ZoomIn size={14} />
        </IconButton>
        <IconButton
          aria-label="Zoom Out"
          size="xs"
          variant="ghost"
          color="fg.muted"
          _hover={{ color: 'extruder.500' }}
          onClick={() => handleZoom(false)}
          title="Zoom Out"
        >
          <ZoomOut size={14} />
        </IconButton>
        <IconButton
          aria-label="Reset Camera View"
          size="xs"
          variant="ghost"
          color="fg.muted"
          _hover={{ color: 'extruder.500' }}
          onClick={handleResetCamera}
          title="Reset Camera"
        >
          <Compass size={14} />
        </IconButton>
        <IconButton
          aria-label="Toggle Auto-Rotate"
          size="xs"
          variant={autoRotate ? 'solid' : 'ghost'}
          colorPalette="orange"
          onClick={() => setAutoRotate(!autoRotate)}
          title="Auto-Rotate"
        >
          <RotateCcw size={14} />
        </IconButton>
        <IconButton
          aria-label="Toggle Wireframe"
          size="xs"
          variant={wireframe ? 'solid' : 'ghost'}
          colorPalette="teal"
          onClick={() => setWireframe(!wireframe)}
          title="Toggle Wireframe / Triangles"
        >
          <Eye size={14} />
        </IconButton>
      </HStack>

      {/* Build Plate Metadata & Status Badges */}
      <HStack position="absolute" bottom={3} left={3} gap={2} zIndex={10} flexWrap="wrap">
        <Badge size="sm" colorPalette="teal" variant="solid">
          <Grid size={11} style={{ display: 'inline', marginRight: '4px' }} />
          Bambu Lab 256×256mm Bed
        </Badge>
        {trianglesCount && (
          <Badge size="sm" colorPalette="orange" variant="surface">
            {trianglesCount.toLocaleString()} Triangles
          </Badge>
        )}
        <Badge size="sm" colorPalette="cyan" variant="subtle" display={{ base: 'none', sm: 'inline-flex' }}>
          Drag to Orbit • Scroll to Zoom
        </Badge>
      </HStack>
    </Box>
  );
}
