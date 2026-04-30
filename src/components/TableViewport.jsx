import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import { gsap } from "gsap";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  MATERIAL_PRESETS,
  SCENARIO_PRESETS,
  getShapeProfile
} from "../lib/catalog";
import { DEFAULT_PART_MATERIALS, getEcoMaterial } from "../lib/ecoMaterials";
import { getMaterialTexture } from "../lib/materialTextures";
import {
  createColorDrift,
  generateTriangleCells,
  mapSketchHullToOutline
} from "../lib/triangleModules";
import {
  createTeacherBoardGeometry,
  createTeacherFrameGeometry,
  createTeacherLegGeometry,
  getTeacherFrameworkMetrics,
  getTeacherLegAnchors,
  getTeacherModuleOutline,
  getTeacherSurfaceInset
} from "../lib/teacherFramework";

const INTRO_CAMERA = { x: -1.9, y: 2.55, z: 7.6 };
const DETAIL_DIRECTION = new THREE.Vector3(0.72, 0.48, 1).normalize();
const TRIANGLE_RADIUS = 1 / Math.sqrt(3);

function getLegPartId(index) {
  return `leg-${index + 1}`;
}

function resolvePartOverride(partOverrides, partId, fallbackMaterialKey) {
  return {
    materialKey:
      partOverrides?.[partId]?.materialKey ||
      partOverrides?.[partId]?.ecoMaterial ||
      fallbackMaterialKey,
    tint: partOverrides?.[partId]?.tint || "",
    widthScale: Number(partOverrides?.[partId]?.widthScale || 1),
    depthScale: Number(partOverrides?.[partId]?.depthScale || 1),
    lengthScale: Number(partOverrides?.[partId]?.lengthScale || 1),
    moduleSizeScale: Number(partOverrides?.[partId]?.moduleSizeScale || 1),
    thicknessScale: Number(partOverrides?.[partId]?.thicknessScale || 1)
  };
}

function createTriangleModuleGeometry() {
  const triangleHeight = Math.sqrt(3) / 2;
  const shape = new THREE.Shape();
  shape.moveTo(0, (triangleHeight * 2) / 3);
  shape.lineTo(-0.5, -triangleHeight / 3);
  shape.lineTo(0.5, -triangleHeight / 3);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 1,
    steps: 1,
    bevelEnabled: true,
    bevelThickness: 0.038,
    bevelSize: 0.032,
    bevelSegments: 3,
    curveSegments: 16
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, -0.5, 0);
  geometry.computeVertexNormals();
  return geometry;
}

function createLegGeometry(legShape) {
  if (legShape === "square") {
    return new THREE.BoxGeometry(1, 1, 1);
  }

  if (legShape === "blade") {
    return new THREE.BoxGeometry(0.55, 1, 0.18);
  }

  return new THREE.CylinderGeometry(1, 0.86, 1, 24, 1);
}

function getLegScale(profile) {
  if (profile.legShape === "round") {
    return {
      x: profile.legWidth / 2,
      z: profile.legDepth / 2
    };
  }

  if (profile.legShape === "blade") {
    return {
      x: profile.legWidth / 0.55,
      z: profile.legDepth / 0.18
    };
  }

  return {
    x: profile.legWidth,
    z: profile.legDepth
  };
}

function getLegFootprint(profile) {
  return {
    x: Math.max(0.02, profile.legWidth / 2),
    z: Math.max(0.02, profile.legDepth / 2)
  };
}

function getOutlineCentroid(outlinePoints) {
  if (!outlinePoints.length) {
    return {
      x: 0,
      z: 0
    };
  }

  return outlinePoints.reduce(
    (accumulator, point) => ({
      x: accumulator.x + point.x / outlinePoints.length,
      z: accumulator.z + point.z / outlinePoints.length
    }),
    { x: 0, z: 0 }
  );
}

function getSupportPointForDirection(outlinePoints, direction) {
  return outlinePoints.reduce((bestPoint, point) => {
    const pointScore = point.x * direction.x + point.z * direction.z;
    const bestScore = bestPoint.x * direction.x + bestPoint.z * direction.z;
    return pointScore > bestScore ? point : bestPoint;
  }, outlinePoints[0]);
}

function getSketchLegAnchors(metrics, profile, outlinePoints) {
  if (!Array.isArray(outlinePoints) || outlinePoints.length < 3) {
    return [];
  }

  const centroid = getOutlineCentroid(outlinePoints);
  const inset = Math.max(
    0.028,
    Math.max(profile.moduleSize * 0.56, profile.legWidth * 1.72, 0.04) -
      Math.max(0, profile.legSpread || 0) * 0.6
  );
  const legTopY = metrics.legTopY;
  const count = Math.max(3, Math.min(profile.legCount, 8));
  const startAngle = profile.legCount === 4 ? Math.PI / 4 : -Math.PI / 2;

  return Array.from({ length: count }, (_, index) => {
    const angle = startAngle + (index / count) * Math.PI * 2;
    const direction = {
      x: Math.sin(angle),
      z: Math.cos(angle)
    };
    const supportPoint = getSupportPointForDirection(outlinePoints, direction);
    const position = new THREE.Vector3(
      supportPoint.x - direction.x * inset,
      legTopY,
      supportPoint.z - direction.z * inset
    );

    return {
      position,
      rotationY: Math.atan2(position.x - centroid.x, position.z - centroid.z)
    };
  });
}

function getSuperellipsePoint(radiusX, radiusZ, exponent, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return {
    x: Math.sign(cos) * radiusX * Math.pow(Math.abs(cos), 2 / exponent),
    z: Math.sign(sin) * radiusZ * Math.pow(Math.abs(sin), 2 / exponent)
  };
}

function getOutlineSignature(outlinePoints) {
  if (!Array.isArray(outlinePoints) || outlinePoints.length < 3) {
    return "base";
  }

  const step = Math.max(1, Math.floor(outlinePoints.length / 18));
  return outlinePoints
    .filter((_, index) => index % step === 0)
    .map((point) => `${point.x.toFixed(2)},${point.z.toFixed(2)}`)
    .join(";");
}

function getLegAnchors(profile) {
  const footprint = getLegFootprint(profile);
  const insetX = Math.max(footprint.x * 2.1 + 0.04, profile.width * 0.06);
  const insetZ = Math.max(footprint.z * 2.1 + 0.04, profile.depth * 0.06);
  const radiusX = Math.max(footprint.x * 2.3, profile.radiusX - insetX);
  const radiusZ = Math.max(footprint.z * 2.3, profile.radiusZ - insetZ);
  const startAngle =
    profile.shape === "rectangle" && profile.legCount === 4 ? Math.PI / 4 : -Math.PI / 2;

  return Array.from({ length: profile.legCount }, (_, index) => {
    const angle = startAngle + (index / profile.legCount) * Math.PI * 2;
    const point = getSuperellipsePoint(radiusX, radiusZ, profile.exponent, angle);

    return {
      x: point.x,
      y: profile.legLength / 2,
      z: point.z,
      rotationY: profile.legShape === "blade" ? angle + Math.PI / 2 : angle
    };
  });
}

function createEnvironmentTexture(renderer) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;

  const context = canvas.getContext("2d");
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#faf3e7");
  gradient.addColorStop(0.42, "#ead9bb");
  gradient.addColorStop(1, "#1f1a17");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const radial = context.createRadialGradient(
    canvas.width * 0.52,
    canvas.height * 0.2,
    30,
    canvas.width * 0.52,
    canvas.height * 0.2,
    280
  );
  radial.addColorStop(0, "rgba(255,248,233,0.95)");
  radial.addColorStop(1, "rgba(255,248,233,0)");
  context.fillStyle = radial;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.mapping = THREE.EquirectangularReflectionMapping;

  const generator = new THREE.PMREMGenerator(renderer);
  const renderTarget = generator.fromEquirectangular(texture);

  texture.dispose();
  generator.dispose();

  return renderTarget.texture;
}

function blendHex(baseHex, tintHex, amount) {
  const base = new THREE.Color(baseHex);
  const tint = new THREE.Color(tintHex);
  return `#${base.lerp(tint, amount).getHexString()}`;
}

function tintColor(baseColor, tintHex) {
  if (!tintHex) {
    return baseColor.clone();
  }

  return baseColor.clone().lerp(new THREE.Color(tintHex), 0.78);
}

function applyEcoFinish(material, materialKey, tintHex = "", highlighted = false) {
  const descriptor = getEcoMaterial(materialKey);
  const texture = tintHex ? null : getMaterialTexture(materialKey);
  const baseColor = tintColor(new THREE.Color(descriptor.baseColor), tintHex);

  material.color.copy(baseColor);
  material.map = texture;
  material.roughness = tintHex
    ? Math.max(0.26, descriptor.roughness * 0.86)
    : descriptor.roughness;
  material.metalness = descriptor.metalness;
  material.clearcoat = tintHex
    ? Math.max(0.1, descriptor.clearcoat + 0.08)
    : descriptor.clearcoat;
  material.reflectivity = tintHex
    ? Math.max(0.2, descriptor.reflectivity * 0.82)
    : descriptor.reflectivity;
  material.envMapIntensity = tintHex ? 0.96 : 1.08;
  material.transmission = descriptor.transmission || 0;
  material.transparent = Boolean(descriptor.transmission || descriptor.opacity < 1);
  material.opacity = descriptor.opacity ?? 1;
  material.emissive = material.emissive || new THREE.Color("#000000");
  material.emissive.set(highlighted ? "#d9381e" : "#000000");
  material.emissiveIntensity = highlighted ? 0.12 : 0;
  material.needsUpdate = true;
}

function buildSeamGeometry(cells, seamY) {
  const edgeMap = new Map();

  cells.forEach((cell) => {
    if (!cell.vertices || cell.vertices.length !== 3) {
      return;
    }

    const edges = [
      [cell.vertices[0], cell.vertices[1]],
      [cell.vertices[1], cell.vertices[2]],
      [cell.vertices[2], cell.vertices[0]]
    ];

    edges.forEach(([a, b]) => {
      const keyA = `${a.x.toFixed(4)},${a.z.toFixed(4)}`;
      const keyB = `${b.x.toFixed(4)},${b.z.toFixed(4)}`;
      const key = keyA < keyB ? `${keyA}|${keyB}` : `${keyB}|${keyA}`;

      if (!edgeMap.has(key)) {
        edgeMap.set(key, [a, b]);
      }
    });
  });

  const positions = [];
  edgeMap.forEach(([a, b]) => {
    positions.push(a.x, seamY, a.z, b.x, seamY, b.z);
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}

function applyModuleMaterial(
  material,
  values,
  patternMode,
  highlighted = false,
  tintActive = false,
  baseColor = "#ffffff",
  useVertexColors = false
) {
  material.vertexColors = useVertexColors;
  material.color.set(useVertexColors ? "#ffffff" : baseColor);
  material.map = null;
  material.roughness =
    tintActive
      ? Math.max(0.46, values.roughness * 0.94)
      : patternMode === "metal"
      ? Math.max(0.22, values.roughness * 0.78)
      : Math.max(0.28, values.roughness * 0.92);
  material.metalness =
    tintActive
      ? Math.min(0.14, values.metalness * 0.14)
      : patternMode === "metal"
      ? Math.max(0.18, values.metalness * 0.52)
      : Math.max(0.02, values.metalness * 0.18);
  material.clearcoat =
    tintActive
      ? Math.max(0.06, values.clearcoat * 0.7)
      : patternMode === "metal"
      ? Math.max(0.16, values.clearcoat + 0.12)
      : Math.max(0.08, values.clearcoat + 0.06);
  material.reflectivity =
    tintActive
      ? Math.max(0.12, values.reflectivity * 0.36)
      : patternMode === "metal"
      ? Math.max(0.26, values.reflectivity * 0.82)
      : Math.max(0.16, values.reflectivity * 0.72);
  material.envMapIntensity = tintActive ? 0.34 : patternMode === "metal" ? 0.82 : 0.64;
  material.transmission = 0;
  material.transparent = false;
  material.opacity = 1;
  material.emissive = material.emissive || new THREE.Color("#000000");
  material.emissive.set(highlighted ? "#d9381e" : "#000000");
  material.emissiveIntensity = highlighted ? 0.08 : 0;
  material.needsUpdate = true;
}

function applyLegMaterial(material, values, finishColor) {
  material.color.set(
    finishColor ? blendHex(values.legColor, finishColor, 0.42) : values.legColor
  );
  material.roughness = Math.min(1, values.roughness + 0.06);
  material.metalness = values.metalness;
  material.clearcoat = Math.max(0, values.clearcoat - 0.02);
  material.reflectivity = values.reflectivity;
  material.needsUpdate = true;
}

function getCameraPose(camera, profile, phase) {
  if (phase !== "configurator") {
    return {
      x: INTRO_CAMERA.x,
      y: INTRO_CAMERA.y,
      z: INTRO_CAMERA.z,
      targetY: 0.56,
      minDistance: 2.3,
      maxDistance: 8.8
    };
  }

  const centerY = profile.height * 0.48;
  const halfWidth = profile.width / 2 + 0.26;
  const halfDepth = profile.depth / 2 + 0.26;
  const halfHeight = profile.height / 2 + 0.24;
  const radius = Math.sqrt(
    halfWidth * halfWidth + halfDepth * halfDepth + halfHeight * halfHeight
  );
  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const horizontalFov =
    2 * Math.atan(Math.tan(verticalFov / 2) * Math.max(camera.aspect, 0.7));
  const fitFov = Math.max(0.35, Math.min(verticalFov, horizontalFov));
  const distance = (radius / Math.sin(fitFov / 2)) * 1.12;

  return {
    x: DETAIL_DIRECTION.x * distance,
    y: centerY + DETAIL_DIRECTION.y * distance,
    z: DETAIL_DIRECTION.z * distance,
    targetY: centerY,
    minDistance: Math.max(1.9, distance * 0.72),
    maxDistance: Math.max(6.2, distance * 1.55)
  };
}

function loadImageSampler(dataUrl, maxEdge = 320) {
  return new Promise((resolve) => {
    if (!dataUrl) {
      resolve(null);
      return;
    }

    const image = new window.Image();
    image.onload = () => {
      const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });
      canvas.width = width;
      canvas.height = height;
      context.drawImage(image, 0, 0, width, height);
      resolve({
        width,
        height,
        data: context.getImageData(0, 0, width, height).data
      });
    };
    image.onerror = () => resolve(null);
    image.src = dataUrl;
  });
}

function sampleImagePixel(info, u, v) {
  const x = Math.min(
    info.width - 1,
    Math.max(0, Math.round(THREE.MathUtils.clamp(u, 0, 1) * (info.width - 1)))
  );
  const y = Math.min(
    info.height - 1,
    Math.max(0, Math.round(THREE.MathUtils.clamp(v, 0, 1) * (info.height - 1)))
  );
  const index = (y * info.width + x) * 4;

  return {
    r: info.data[index] / 255,
    g: info.data[index + 1] / 255,
    b: info.data[index + 2] / 255,
    a: info.data[index + 3] / 255
  };
}

function sampleImageColor(info, u, v, fallbackColor = null) {
  const pixel = sampleImagePixel(info, u, v);
  const color = new THREE.Color(pixel.r, pixel.g, pixel.b);

  if (pixel.a >= 0.995 || !fallbackColor) {
    return color;
  }

  return new THREE.Color(fallbackColor).lerp(color, pixel.a);
}

function sampleImageIntensity(info, u, v, fallbackColor = null) {
  if (!info) {
    return 0;
  }

  const color = sampleImageColor(info, u, v, fallbackColor);
  return color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722;
}

function applyContrast(color, contrast) {
  color.r = THREE.MathUtils.clamp((color.r - 0.5) * contrast + 0.5, 0, 1);
  color.g = THREE.MathUtils.clamp((color.g - 0.5) * contrast + 0.5, 0, 1);
  color.b = THREE.MathUtils.clamp((color.b - 0.5) * contrast + 0.5, 0, 1);
  return color;
}

function applyBrightness(color, brightness) {
  color.r = THREE.MathUtils.clamp(color.r * brightness, 0, 1);
  color.g = THREE.MathUtils.clamp(color.g * brightness, 0, 1);
  color.b = THREE.MathUtils.clamp(color.b * brightness, 0, 1);
  return color;
}

function getPatternBaseColor(profile, partStyle = null) {
  if (partStyle?.tint) {
    return new THREE.Color(partStyle.tint);
  }

  if (partStyle?.materialKey) {
    return new THREE.Color(getEcoMaterial(partStyle.materialKey).baseColor);
  }

  if (profile.material === "metal") {
    return new THREE.Color("#aeb4b9");
  }

  const materialColor =
    MATERIAL_PRESETS[profile.material]?.topColor ?? MATERIAL_PRESETS.light_wood.topColor;

  return new THREE.Color(materialColor);
}

function getModuleColor(profile, cell, patternInfo, partStyle = null) {
  if (profile.patternMode === "uploaded" && patternInfo) {
    const baseColor = getPatternBaseColor(profile, partStyle);
    const color = sampleImageColor(patternInfo, cell.u, cell.v, baseColor);

    if (profile.material === "metal") {
      color.lerp(new THREE.Color("#d8dbde"), 0.02);
    }

    color.lerp(
      baseColor,
      THREE.MathUtils.clamp(0.82 - profile.patternPresence * 0.38, 0, 0.78)
    );
    applyBrightness(color, profile.patternBrightness);
    applyContrast(color, profile.patternContrast);

    const hsl = {};
    color.getHSL(hsl);
    color.setHSL(
      hsl.h,
      Math.min(1, hsl.s * (0.95 + profile.patternPresence * 0.38) + 0.03),
      THREE.MathUtils.clamp(
        (hsl.l - 0.5) * (0.9 + profile.patternContrast * 0.22) + 0.5,
        0,
        1
      )
    );

    return partStyle?.tint ? tintColor(color, partStyle.tint) : color;
  }

  if (partStyle?.materialKey) {
    return getPatternBaseColor(profile, partStyle);
  }

  const baseHex =
    profile.material === "metal"
      ? "#a7adb2"
      : blendHex(MATERIAL_PRESETS[profile.material].topColor, "#fff7ea", 0.18);

  return new THREE.Color(profile.finishColor || baseHex);
}

function buildGhPreviewGeometry(previewMesh) {
  if (
    !previewMesh ||
    !Array.isArray(previewMesh.vertices) ||
    !Array.isArray(previewMesh.faces)
  ) {
    return null;
  }

  const scale = previewMesh.unit === "mm" ? 0.001 : 1;
  const positions = [];

  previewMesh.vertices.forEach((vertex) => {
    if (!Array.isArray(vertex) || vertex.length < 3) {
      return;
    }

    positions.push(
      Number(vertex[0]) * scale,
      Number(vertex[1]) * scale,
      Number(vertex[2]) * scale
    );
  });

  const indices = [];
  previewMesh.faces.forEach((face) => {
    if (!Array.isArray(face) || face.length < 3) {
      return;
    }

    indices.push(Number(face[0]), Number(face[1]), Number(face[2]));
  });

  if (!positions.length || !indices.length) {
    return null;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  return geometry;
}

const TableViewport = forwardRef(function TableViewport({
  config,
  phase,
  ghPreviewMesh = null,
  patternAsset,
  sketchMaskDataUrl,
  sketchOutline,
  interactive = true,
  transparentScene = false,
  variantLabel = "",
  selectedPartId = "",
  onSelectPart = null,
  partOverrides = {}
}, ref) {
  const ghPreviewActive = Boolean(ghPreviewMesh);
  const containerRef = useRef(null);
  const sceneRef = useRef(null);

  useImperativeHandle(
    ref,
    () => ({
      captureImage(mimeType = "image/png", quality) {
        const state = sceneRef.current;

        if (!state?.renderer || !state?.scene || !state?.camera) {
          return "";
        }

        state.renderer.render(state.scene, state.camera);
        if (mimeType === "image/jpeg") {
          const sourceCanvas = state.renderer.domElement;
          const exportCanvas = document.createElement("canvas");
          const context = exportCanvas.getContext("2d");
          exportCanvas.width = sourceCanvas.width;
          exportCanvas.height = sourceCanvas.height;
          context.fillStyle = "#f4f1eb";
          context.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
          context.drawImage(sourceCanvas, 0, 0);
          return exportCanvas.toDataURL(mimeType, quality);
        }

        return state.renderer.domElement.toDataURL(mimeType, quality);
      }
    }),
    []
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      32,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 2.3;
    controls.maxDistance = 8.8;
    controls.minPolarAngle = Math.PI * 0.16;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.55;
    controls.target.set(0, 0.56, 0);

    const envTexture = createEnvironmentTexture(renderer);
    scene.environment = envTexture;
    scene.environmentIntensity = 1.2;
    scene.background = transparentScene ? null : new THREE.Color("#f4f1eb");
    scene.fog = transparentScene ? null : new THREE.Fog("#f4f1eb", 6, 16);

    const root = new THREE.Group();
    scene.add(root);

    const tableGroup = new THREE.Group();
    root.add(tableGroup);

    const ghPreviewGroup = new THREE.Group();
    root.add(ghPreviewGroup);

    const ghPreviewState = {
      mesh: null,
      edges: null,
      material: new THREE.MeshPhysicalMaterial({
        color: "#00e5ff",
        emissive: "#00e5ff",
        emissiveIntensity: 0.34,
        roughness: 0.2,
        metalness: 0.05,
        clearcoat: 0.1,
        transparent: true,
        opacity: 0.46,
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false,
        wireframe: false
      }),
      edgeMaterial: new THREE.LineBasicMaterial({
        color: "#00e5ff",
        transparent: false,
        opacity: 1,
        depthTest: false
      })
    };

    const moduleMaterial = new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      roughness: 0.42,
      metalness: 0.08,
      clearcoat: 0.14
    });
    const moduleState = {
      geometry: createTriangleModuleGeometry(),
      mesh: null,
      seamLines: null,
      seamMaterial: new THREE.LineBasicMaterial({
        color: "#8f7358",
        transparent: true,
        opacity: 0.55
      }),
      patternInfo: null,
      maskInfo: null,
      sketchOutline: [],
      dummy: new THREE.Object3D()
    };

    const legGroup = new THREE.Group();
    tableGroup.add(legGroup);
    const legState = {
      geometry: null,
      meshes: [],
      shape: "",
      count: 0,
      signature: ""
    };
    const frameworkGroup = new THREE.Group();
    tableGroup.add(frameworkGroup);
    const teacherState = {
      board: null,
      frame: null,
      boardGeometry: null,
      frameGeometry: null,
      boardSignature: "",
      frameSignature: ""
    };

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.ShadowMaterial({ color: "#1a1a1a", opacity: 0.16 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const hemisphere = new THREE.HemisphereLight("#fff8ee", "#7d7168", 1.1);
    scene.add(hemisphere);

    const ambient = new THREE.AmbientLight("#fff4e7", 0.42);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight("#fff5de", 2.4);
    keyLight.position.set(4.2, 5.2, 3.4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.left = -6;
    keyLight.shadow.camera.right = 6;
    keyLight.shadow.camera.top = 6;
    keyLight.shadow.camera.bottom = -6;
    keyLight.shadow.bias = -0.0002;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight("#f3e3cf", 1.25);
    fillLight.position.set(-3.8, 2.5, -3.6);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight("#efe8df", 1.05);
    rimLight.position.set(-1.2, 3.2, 4.8);
    scene.add(rimLight);

    camera.position.set(INTRO_CAMERA.x, INTRO_CAMERA.y, INTRO_CAMERA.z);
    const lookAtTarget = { x: 0, y: 0.56, z: 0 };
    const shapeState = { ...getShapeProfile(config) };

    function ensureTeacherMeshes() {
      if (!teacherState.boardGeometry) {
        teacherState.boardGeometry = createTeacherBoardGeometry();
      }

      if (!teacherState.frameGeometry) {
        teacherState.frameGeometry = createTeacherFrameGeometry();
      }

      if (!teacherState.board) {
        teacherState.board = new THREE.Mesh(
          teacherState.boardGeometry,
          new THREE.MeshPhysicalMaterial()
        );
        teacherState.board.castShadow = true;
        teacherState.board.receiveShadow = true;
        teacherState.board.userData.partId = "tabletop";
        frameworkGroup.add(teacherState.board);
      }

      if (!teacherState.frame) {
        teacherState.frame = new THREE.Mesh(
          teacherState.frameGeometry,
          new THREE.MeshPhysicalMaterial()
        );
        teacherState.frame.castShadow = true;
        teacherState.frame.receiveShadow = true;
        teacherState.frame.userData.partId = "tabletop";
        frameworkGroup.add(teacherState.frame);
      }
    }

    function rebuildLegMeshes(profile, metrics) {
      if (legState.geometry) {
        legState.geometry.dispose();
      }

      legState.meshes.forEach((mesh) => {
        mesh.material.dispose();
        legGroup.remove(mesh);
      });

      legState.geometry = createTeacherLegGeometry(metrics);
      legState.meshes = Array.from({ length: profile.legCount }, (_, index) => {
        const leg = new THREE.Mesh(legState.geometry, new THREE.MeshPhysicalMaterial());
        leg.castShadow = true;
        leg.receiveShadow = true;
        leg.userData.partId = getLegPartId(index);
        legGroup.add(leg);
        return leg;
      });
      legState.shape = "teacher-framework";
      legState.count = profile.legCount;
      legState.signature = [
        metrics.legTopY,
        metrics.legWidth,
        metrics.legUpperDepth,
        metrics.legLowerDepth,
        metrics.legBellyDepth,
        metrics.footWidth,
        metrics.legToeSharpness
      ]
        .map((value) => Number(value).toFixed(3))
        .join("|");
    }

    function ensureLegMeshes(profile, metrics) {
      const signature = [
        metrics.legTopY,
        metrics.legWidth,
        metrics.legUpperDepth,
        metrics.legLowerDepth,
        metrics.legBellyDepth,
        metrics.footWidth,
        metrics.legToeSharpness
      ]
        .map((value) => Number(value).toFixed(3))
        .join("|");

      if (
        !legState.geometry ||
        legState.shape !== "teacher-framework" ||
        legState.count !== profile.legCount ||
        legState.signature !== signature
      ) {
        rebuildLegMeshes(profile, metrics);
      }
    }

    function syncTeacherFrameworkGeometry(metrics, outlinePoints) {
      ensureTeacherMeshes();
      const outlineSignature = getOutlineSignature(outlinePoints);
      const boardSignature = [
        metrics.width,
        metrics.depth,
        metrics.boardThickness,
        outlineSignature
      ]
        .map((value) => (typeof value === "number" ? value.toFixed(3) : value))
        .join("|");
      const frameSignature = [
        metrics.frameOuterWidth,
        metrics.frameOuterDepth,
        metrics.frameThickness,
        metrics.frameDrop,
        outlineSignature
      ]
        .map((value) => (typeof value === "number" ? value.toFixed(3) : value))
        .join("|");

      if (teacherState.boardSignature !== boardSignature) {
        const nextGeometry = createTeacherBoardGeometry(metrics, outlinePoints);
        const previousGeometry = teacherState.boardGeometry;
        teacherState.boardGeometry = nextGeometry;
        teacherState.board.geometry = nextGeometry;
        teacherState.boardSignature = boardSignature;
        if (previousGeometry) {
          previousGeometry.dispose();
        }
      }

      if (teacherState.frameSignature !== frameSignature) {
        const nextGeometry = createTeacherFrameGeometry(metrics, outlinePoints);
        const previousGeometry = teacherState.frameGeometry;
        teacherState.frameGeometry = nextGeometry;
        teacherState.frame.geometry = nextGeometry;
        teacherState.frameSignature = frameSignature;
        if (previousGeometry) {
          previousGeometry.dispose();
        }
      }
    }

    function rebuildModuleMesh(profile) {
      const metrics = getTeacherFrameworkMetrics(profile);
      const moduleStyle = resolvePartOverride(
        sceneRef.current?.partOverrides,
        "modules",
        DEFAULT_PART_MATERIALS.tabletop
      );
      const outlinePoints =
        profile.silhouetteMode === "sketch"
          ? mapSketchHullToOutline(profile, moduleState.sketchOutline)
          : [];
      const insetOutlinePoints = getTeacherModuleOutline(metrics, outlinePoints);
      const useModuleOutline = insetOutlinePoints.length >= 3;
      const applyLocalMaskEdit =
        profile.silhouetteMode !== "sketch" && Boolean(moduleState.maskInfo);
      const useInstanceColors =
        profile.patternMode === "uploaded" && Boolean(moduleState.patternInfo);
      const surfaceInset = getTeacherSurfaceInset(metrics);
      const moduleBaseColor = getPatternBaseColor(profile, moduleStyle);
      const effectiveProfile = {
        ...profile,
        width: Math.max(0.12, profile.width - surfaceInset * 2),
        depth: Math.max(0.12, profile.depth - surfaceInset * 2),
        radiusX: Math.max(0.06, profile.radiusX - surfaceInset),
        radiusZ: Math.max(0.06, profile.radiusZ - surfaceInset),
        moduleSize: profile.moduleSize * moduleStyle.moduleSizeScale,
        moduleThicknessScale:
          profile.moduleThicknessScale * moduleStyle.thicknessScale
      };
      const cells = generateTriangleCells(effectiveProfile, {
        outlinePoints: useModuleOutline ? insetOutlinePoints : [],
        useSketchMask: false,
        localMaskMode: applyLocalMaskEdit,
        maskSampler: moduleState.maskInfo
          ? (u, v) => sampleImageIntensity(moduleState.maskInfo, u, v)
          : null
      });

      if (moduleState.mesh) {
        tableGroup.remove(moduleState.mesh);
      }
      if (moduleState.seamLines) {
        tableGroup.remove(moduleState.seamLines);
        moduleState.seamLines.geometry.dispose();
        moduleState.seamLines = null;
      }

      const mesh = new THREE.InstancedMesh(
        moduleState.geometry,
        moduleMaterial,
        Math.max(cells.length, 1)
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.partId = "modules";
      const tileEdge = Math.max(
        0.02,
        effectiveProfile.moduleSize * 1.08 - profile.moduleGap * 0.02
      );
      const baseModuleThickness = Math.max(
        0.006,
        Math.min(
          metrics.boardThickness * 0.48,
          profile.thickness * effectiveProfile.moduleThicknessScale * 0.26
        )
      );
      const reliefStrength =
        profile.patternMode === "uploaded" ? Math.max(0, profile.patternRelief) : 0;
      const topLift =
        profile.patternMode === "uploaded"
          ? baseModuleThickness * (0.03 + reliefStrength * 0.06)
          : 0;
      const moduleTopY = metrics.height - Math.min(0.0015, metrics.boardThickness * 0.06);

      cells.forEach((cell, index) => {
        const drift =
          profile.patternMode === "uploaded"
            ? createColorDrift(cell.x * 1.4, cell.z * 0.9)
            : 0.5;
        const patternBaseColor = getPatternBaseColor(profile, moduleStyle);
        const patternStrength =
          profile.patternMode === "uploaded" && moduleState.patternInfo
            ? sampleImageIntensity(
                moduleState.patternInfo,
                cell.u,
                cell.v,
                patternBaseColor
              )
            : 0.5;
        const lift =
          profile.patternMode === "uploaded"
            ? (drift - 0.5) * topLift +
              (patternStrength - 0.5) *
                (baseModuleThickness * (0.05 + reliefStrength * 0.16))
            : 0;
        const thicknessFactor =
          profile.patternMode === "uploaded"
            ? 0.96 + (patternStrength - 0.5) * (0.06 + reliefStrength * 0.12)
            : 1;
        const moduleThickness = Math.max(
          0.006,
          baseModuleThickness * Math.max(0.84, thicknessFactor)
        );
        moduleState.dummy.position.set(
          cell.x,
          moduleTopY - moduleThickness / 2 + lift * 0.55,
          cell.z
        );
        moduleState.dummy.rotation.set(0, cell.rotation, 0);
        moduleState.dummy.scale.set(
          tileEdge,
          moduleThickness,
          tileEdge
        );
        moduleState.dummy.updateMatrix();
        mesh.setMatrixAt(index, moduleState.dummy.matrix);
        if (useInstanceColors) {
          mesh.setColorAt(
            index,
            getModuleColor(profile, cell, moduleState.patternInfo, moduleStyle)
          );
        }
      });

      mesh.count = cells.length;
      mesh.instanceMatrix.needsUpdate = true;
      if (useInstanceColors && mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }

      applyModuleMaterial(
        moduleMaterial,
        getEcoMaterial(moduleStyle.materialKey),
        profile.patternMode,
        (sceneRef.current?.selectedPartId || "") === "modules",
        Boolean(moduleStyle.tint || profile.finishColor),
        `#${moduleBaseColor.getHexString()}`,
        useInstanceColors
      );
      tableGroup.add(mesh);
      moduleState.mesh = mesh;
    }

    function updateTable(profile) {
      const metrics = getTeacherFrameworkMetrics(profile);
      const tabletopStyle = resolvePartOverride(
        sceneRef.current?.partOverrides,
        "tabletop",
        DEFAULT_PART_MATERIALS.tabletop
      );
      const sketchOutlinePoints =
        profile.silhouetteMode === "sketch"
          ? mapSketchHullToOutline(profile, moduleState.sketchOutline)
          : [];
      const sketchSilhouetteActive = sketchOutlinePoints.length >= 3;

      syncTeacherFrameworkGeometry(
        metrics,
        sketchSilhouetteActive ? sketchOutlinePoints : []
      );
      ensureLegMeshes(profile, metrics);
      rebuildModuleMesh(profile);

      const tabletopWidthScale = THREE.MathUtils.clamp(tabletopStyle.widthScale, 0.55, 1.8);
      const tabletopDepthScale = THREE.MathUtils.clamp(tabletopStyle.depthScale, 0.55, 1.8);
      teacherState.board.scale.set(
        tabletopWidthScale,
        1,
        tabletopDepthScale
      );
      teacherState.board.position.set(0, metrics.height - metrics.boardThickness / 2, 0);
      teacherState.board.visible = true;
      teacherState.frame.scale.set(
        tabletopWidthScale,
        1,
        tabletopDepthScale
      );
      teacherState.frame.position.set(
        0,
        metrics.height - metrics.boardThickness - metrics.frameDrop / 2,
        0
      );
      teacherState.frame.visible = true;
      applyEcoFinish(
        teacherState.board.material,
        tabletopStyle.materialKey,
        tabletopStyle.tint,
        (sceneRef.current?.selectedPartId || "") === "tabletop"
      );
      applyEcoFinish(
        teacherState.frame.material,
        tabletopStyle.materialKey,
        tabletopStyle.tint,
        (sceneRef.current?.selectedPartId || "") === "tabletop"
      );

      const anchors = sketchSilhouetteActive
        ? getSketchLegAnchors(metrics, profile, sketchOutlinePoints)
        : getTeacherLegAnchors(metrics, profile.legCount);

      legState.meshes.forEach((leg, index) => {
        const partId = getLegPartId(index);
        const legStyle = resolvePartOverride(
          sceneRef.current?.partOverrides,
          partId,
          DEFAULT_PART_MATERIALS.legs
        );
        const anchor = anchors[index];
        if (!anchor) {
          leg.visible = false;
          return;
        }
        leg.visible = true;
        const widthScale = THREE.MathUtils.clamp(legStyle.widthScale, 0.45, 1.9);
        const depthScale = THREE.MathUtils.clamp(legStyle.depthScale, 0.45, 1.9);
        const lengthScale = THREE.MathUtils.clamp(legStyle.lengthScale, 0.45, 1.7);
        leg.position.copy(anchor.position);
        leg.rotation.set(0, anchor.rotationY, 0);
        leg.scale.set(
          widthScale,
          lengthScale,
          depthScale
        );
        applyEcoFinish(
          leg.material,
          legStyle.materialKey,
          legStyle.tint,
          (sceneRef.current?.selectedPartId || "") === partId
        );
      });
    }

    function clearGhPreviewMesh() {
      if (ghPreviewState.mesh) {
        ghPreviewGroup.remove(ghPreviewState.mesh);
        ghPreviewState.mesh.geometry.dispose();
        ghPreviewState.mesh = null;
      }

      if (ghPreviewState.edges) {
        ghPreviewGroup.remove(ghPreviewState.edges);
        ghPreviewState.edges.geometry.dispose();
        ghPreviewState.edges = null;
      }
    }

    function applyGhPreviewMesh(previewMesh) {
      clearGhPreviewMesh();

      const geometry = buildGhPreviewGeometry(previewMesh);

      if (!geometry) {
        tableGroup.visible = true;
        return;
      }

      tableGroup.visible = false;

      const mesh = new THREE.Mesh(geometry, ghPreviewState.material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.partId = "gh-preview";
      mesh.renderOrder = 40;
      mesh.position.y = 0.06;

      ghPreviewGroup.add(mesh);
      ghPreviewState.mesh = mesh;
      ghPreviewState.edges = null;
    }

    function applyScenario(scenarioKey, lightAngle = 38) {
      const preset = SCENARIO_PRESETS[scenarioKey] ?? SCENARIO_PRESETS.daylight;
      const background = new THREE.Color(preset.background);
      const fog = new THREE.Color(preset.fog);
      const key = new THREE.Color(preset.keyColor);
      const fill = new THREE.Color(preset.fillColor);
      const rim = new THREE.Color(preset.rimColor);
      const angle = THREE.MathUtils.degToRad(Number(lightAngle) || 0);
      const keyX = Math.cos(angle) * 4.2;
      const keyZ = Math.sin(angle) * 3.8;
      const fillX = -Math.cos(angle) * 3.8;
      const fillZ = -Math.sin(angle) * 3.6;
      const rimX = Math.cos(angle + Math.PI * 0.72) * 3.2;
      const rimZ = Math.sin(angle + Math.PI * 0.72) * 4.6;

      if (transparentScene) {
        scene.background = null;
        scene.fog = null;
      } else {
        gsap.to(scene.background, {
          duration: 1.3,
          r: background.r,
          g: background.g,
          b: background.b
        });
        gsap.to(scene.fog.color, {
          duration: 1.3,
          r: fog.r,
          g: fog.g,
          b: fog.b
        });
      }
      gsap.to(keyLight.color, {
        duration: 1.3,
        r: key.r,
        g: key.g,
        b: key.b
      });
      gsap.to(fillLight.color, {
        duration: 1.3,
        r: fill.r,
        g: fill.g,
        b: fill.b
      });
      gsap.to(rimLight.color, {
        duration: 1.3,
        r: rim.r,
        g: rim.g,
        b: rim.b
      });
      gsap.to(keyLight, {
        duration: 1.3,
        intensity: preset.keyIntensity
      });
      gsap.to(keyLight.position, {
        duration: 1.3,
        x: keyX,
        y: 5.2,
        z: keyZ
      });
      gsap.to(fillLight, {
        duration: 1.3,
        intensity: preset.fillIntensity
      });
      gsap.to(fillLight.position, {
        duration: 1.3,
        x: fillX,
        y: 2.5,
        z: fillZ
      });
      gsap.to(rimLight.position, {
        duration: 1.3,
        x: rimX,
        y: 3.2,
        z: rimZ
      });
      gsap.to(hemisphere, {
        duration: 1.3,
        intensity: preset.hemiIntensity
      });
      gsap.to(ambient, {
        duration: 1.3,
        intensity: Math.max(0.3, preset.hemiIntensity * 0.36)
      });
      gsap.to(ground.material, {
        duration: 1.3,
        opacity: scenarioKey === "late_night" ? 0.22 : 0.16
      });
    }

    updateTable(shapeState);
    applyScenario(shapeState.scenario, shapeState.lightAngle);

    let frameId = 0;

    function render() {
      controls.target.set(lookAtTarget.x, lookAtTarget.y, lookAtTarget.z);
      controls.update();
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(render);
    }

    function handleResize() {
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);

      const pose = getCameraPose(
        camera,
        sceneRef.current?.shapeState ?? shapeState,
        sceneRef.current?.phase ?? phase
      );
      controls.minDistance = pose.minDistance;
      controls.maxDistance = pose.maxDistance;

      if ((sceneRef.current?.phase ?? phase) === "configurator") {
        camera.position.set(pose.x, pose.y, pose.z);
        lookAtTarget.y = pose.targetY;
      }
    }

    function handlePointerDown(event) {
      if (!interactive || !onSelectPart) {
        return;
      }

      if (ghPreviewState.mesh) {
        onSelectPart(null);
        return;
      }

      const rect = renderer.domElement.getBoundingClientRect();
      const pointer = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(
        [moduleState.mesh, ...legState.meshes].filter(Boolean)
      );

      if (!intersects.length) {
        onSelectPart(null);
        return;
      }

      const partId = intersects[0].object.userData.partId || "tabletop";
      const partStyle = resolvePartOverride(
        sceneRef.current?.partOverrides,
        partId,
        partId === "tabletop" || partId === "modules"
          ? DEFAULT_PART_MATERIALS.tabletop
          : DEFAULT_PART_MATERIALS.legs
      );
      const materialLabel = getEcoMaterial(partStyle.materialKey).label;
      const legNumber = Number(String(partId).split("-")[1] || 0);

      onSelectPart({
        id: partId,
        kind: partId === "tabletop" || partId === "modules" ? partId : "leg",
        label:
          partId === "tabletop"
            ? `${materialLabel} Tabletop`
            : partId === "modules"
              ? `${materialLabel} Modules`
            : `${materialLabel} Leg ${legNumber}`,
        anchor: {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top
        }
      });
    }

    window.addEventListener("resize", handleResize);
    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    render();

    sceneRef.current = {
      camera,
      controls,
      renderer,
      scene,
      lookAtTarget,
      moduleMaterial,
      shapeState,
      applyScenario,
      updateTable,
      applyGhPreviewMesh,
      phase,
      moduleState,
      partOverrides,
      selectedPartId
    };
    applyGhPreviewMesh(ghPreviewMesh);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      controls.dispose();
      if (legState.geometry) {
        legState.geometry.dispose();
      }
      legState.meshes.forEach((mesh) => mesh.material.dispose());
      if (teacherState.boardGeometry) {
        teacherState.boardGeometry.dispose();
      }
      if (teacherState.frameGeometry) {
        teacherState.frameGeometry.dispose();
      }
      if (teacherState.board) {
        teacherState.board.material.dispose();
      }
      if (teacherState.frame) {
        teacherState.frame.material.dispose();
      }
      if (moduleState.seamLines) {
        moduleState.seamLines.geometry.dispose();
      }
      clearGhPreviewMesh();
      ghPreviewState.material.dispose();
      ghPreviewState.edgeMaterial.dispose();
      moduleState.seamMaterial.dispose();
      moduleState.geometry.dispose();
      moduleMaterial.dispose();
      ground.geometry.dispose();
      ground.material.dispose();
      envTexture.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    const state = sceneRef.current;
    if (!state) {
      return;
    }

    state.applyGhPreviewMesh(ghPreviewMesh);
  }, [ghPreviewMesh]);

  useEffect(() => {
    const state = sceneRef.current;
    if (!state) {
      return undefined;
    }

    let cancelled = false;

    loadImageSampler(patternAsset?.dataUrl || "").then((patternInfo) => {
      if (cancelled || !sceneRef.current) {
        return;
      }

      sceneRef.current.moduleState.patternInfo = patternInfo;
      sceneRef.current.updateTable(sceneRef.current.shapeState);
    });

    return () => {
      cancelled = true;
    };
  }, [patternAsset]);

  useEffect(() => {
    const state = sceneRef.current;
    if (!state) {
      return undefined;
    }

    let cancelled = false;
    state.moduleState.sketchOutline = sketchOutline || [];

    loadImageSampler(sketchMaskDataUrl || "", 260).then((maskInfo) => {
      if (cancelled || !sceneRef.current) {
        return;
      }

      sceneRef.current.moduleState.maskInfo = maskInfo;
      sceneRef.current.updateTable(sceneRef.current.shapeState);
    });

    return () => {
      cancelled = true;
    };
  }, [sketchMaskDataUrl, sketchOutline]);

  useEffect(() => {
    const state = sceneRef.current;
    if (!state) {
      return;
    }

    state.partOverrides = partOverrides;
    state.selectedPartId = selectedPartId;
    state.updateTable(state.shapeState);
  }, [partOverrides, selectedPartId]);

  useEffect(() => {
    const state = sceneRef.current;
    if (!state) {
      return;
    }

    const profile = getShapeProfile(config);
    state.phase = phase;
    Object.assign(state.shapeState, profile);

    const pose = getCameraPose(state.camera, profile, phase);
    state.controls.minDistance = pose.minDistance;
    state.controls.maxDistance = pose.maxDistance;
    state.controls.enabled = interactive && phase === "configurator";
    state.controls.enableZoom = interactive && phase === "configurator";
    state.controls.autoRotate = !interactive || phase !== "configurator";

    gsap.to(state.camera.position, {
      duration: phase === "configurator" ? 1.15 : 1.8,
      x: pose.x,
      y: pose.y,
      z: pose.z,
      ease: "power3.inOut"
    });
    gsap.to(state.lookAtTarget, {
      duration: phase === "configurator" ? 1.15 : 1.8,
      x: 0,
      y: pose.targetY,
      z: 0,
      ease: "power3.inOut"
    });

    gsap.killTweensOf(state.shapeState);
    state.updateTable(state.shapeState);

    state.applyScenario(config.scenario, config.lightAngle);
  }, [config, interactive, phase]);

  const vignette =
    SCENARIO_PRESETS[config.scenario]?.vignette ??
    SCENARIO_PRESETS.daylight.vignette;

  return (
    <div
      className={`scene-shell ${phase === "landing" ? "is-intro" : "is-detail"}`}
    >
      <div
        aria-hidden="true"
        className="scene-shell__vignette"
        style={{ backgroundImage: vignette }}
      />
      {ghPreviewActive ? (
        <div className="scene-shell__badge">
          {variantLabel ? `${variantLabel} · GH PREVIEW` : "GH PREVIEW ACTIVE"}
        </div>
      ) : variantLabel ? (
        <div className="scene-shell__badge">{variantLabel}</div>
      ) : null}
      <div className="scene-shell__canvas" ref={containerRef} />
    </div>
  );
});

export default TableViewport;
