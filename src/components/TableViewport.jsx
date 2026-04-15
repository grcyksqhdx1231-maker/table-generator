import { useEffect, useRef } from "react";
import * as THREE from "three";
import { gsap } from "gsap";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  MATERIAL_PRESETS,
  SCENARIO_PRESETS,
  getShapeProfile
} from "../lib/catalog";
import {
  createColorDrift,
  generateTriangleCells,
  mapSketchHullToOutline
} from "../lib/triangleModules";

const INTRO_CAMERA = { x: -1.9, y: 2.55, z: 7.6 };
const DETAIL_DIRECTION = new THREE.Vector3(0.72, 0.48, 1).normalize();
const TRIANGLE_RADIUS = 1 / Math.sqrt(3);

function createTriangleModuleGeometry() {
  const geometry = new THREE.CylinderGeometry(
    TRIANGLE_RADIUS,
    TRIANGLE_RADIUS,
    1,
    3,
    1,
    false
  );
  geometry.rotateY(Math.PI / 2);
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

function getSuperellipsePoint(radiusX, radiusZ, exponent, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return {
    x: Math.sign(cos) * radiusX * Math.pow(Math.abs(cos), 2 / exponent),
    z: Math.sign(sin) * radiusZ * Math.pow(Math.abs(sin), 2 / exponent)
  };
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

function applyModuleMaterial(material, values, patternMode) {
  material.color.set("#ffffff");
  material.roughness =
    patternMode === "metal" ? Math.max(0.18, values.roughness * 0.36) : values.roughness;
  material.metalness =
    patternMode === "metal" ? Math.max(0.78, values.metalness) : values.metalness * 0.4;
  material.clearcoat =
    patternMode === "metal" ? Math.max(0.14, values.clearcoat) : values.clearcoat;
  material.reflectivity =
    patternMode === "metal" ? Math.max(0.42, values.reflectivity) : values.reflectivity;
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

function getPatternBaseColor(profile) {
  if (profile.material === "metal") {
    return new THREE.Color("#aeb4b9");
  }

  const materialColor =
    MATERIAL_PRESETS[profile.material]?.topColor ?? MATERIAL_PRESETS.light_wood.topColor;

  return new THREE.Color(materialColor);
}

function getModuleColor(profile, cell, patternInfo) {
  if (profile.patternMode === "uploaded" && patternInfo) {
    const baseColor = getPatternBaseColor(profile);
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

    return color;
  }

  const baseHex =
    profile.material === "metal"
      ? "#a7adb2"
      : blendHex(MATERIAL_PRESETS[profile.material].topColor, "#c3c7cb", 0.58);

  const color = new THREE.Color(profile.finishColor || baseHex);
  const drift = createColorDrift(cell.x * 3.2, cell.z * 2.1);
  color.offsetHSL((drift - 0.5) * 0.028, 0, (drift - 0.5) * 0.11);
  return color;
}

export default function TableViewport({
  config,
  phase,
  patternAsset,
  sketchMaskDataUrl,
  sketchOutline
}) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
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
    scene.environmentIntensity = 1.05;
    scene.background = new THREE.Color("#f4f1eb");
    scene.fog = new THREE.Fog("#f4f1eb", 6, 16);

    const root = new THREE.Group();
    scene.add(root);

    const tableGroup = new THREE.Group();
    root.add(tableGroup);

    const moduleMaterial = new THREE.MeshPhysicalMaterial({
      vertexColors: true
    });
    const legMaterial = new THREE.MeshPhysicalMaterial();
    const moduleState = {
      geometry: createTriangleModuleGeometry(),
      mesh: null,
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
      count: 0
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

    function rebuildLegMeshes(profile) {
      if (legState.geometry) {
        legState.geometry.dispose();
      }

      legState.meshes.forEach((mesh) => {
        legGroup.remove(mesh);
      });

      legState.geometry = createLegGeometry(profile.legShape);
      legState.meshes = Array.from({ length: profile.legCount }, () => {
        const leg = new THREE.Mesh(legState.geometry, legMaterial);
        leg.castShadow = true;
        leg.receiveShadow = true;
        legGroup.add(leg);
        return leg;
      });
      legState.shape = profile.legShape;
      legState.count = profile.legCount;
    }

    function ensureLegMeshes(profile) {
      if (
        !legState.geometry ||
        legState.shape !== profile.legShape ||
        legState.count !== profile.legCount
      ) {
        rebuildLegMeshes(profile);
      }
    }

    function rebuildModuleMesh(profile) {
      const outlinePoints =
        profile.silhouetteMode === "sketch"
          ? mapSketchHullToOutline(profile, moduleState.sketchOutline)
          : [];
      const useSketchMask =
        profile.silhouetteMode === "sketch" && Boolean(moduleState.maskInfo);
      const cells = generateTriangleCells(profile, {
        outlinePoints,
        useSketchMask,
        maskSampler: moduleState.maskInfo
          ? (u, v) => sampleImageIntensity(moduleState.maskInfo, u, v)
          : null
      });

      if (moduleState.mesh) {
        tableGroup.remove(moduleState.mesh);
      }

      const mesh = new THREE.InstancedMesh(
        moduleState.geometry,
        moduleMaterial,
        Math.max(cells.length, 1)
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const tileEdge = Math.max(0.026, profile.moduleSize - profile.moduleGap);
      const baseModuleThickness = Math.max(
        0.012,
        profile.thickness * profile.moduleThicknessScale
      );
      const topLift = baseModuleThickness * 0.045;
      const reliefStrength =
        profile.patternMode === "uploaded" ? Math.max(0, profile.patternRelief) : 0;

      cells.forEach((cell, index) => {
        const drift = createColorDrift(cell.x * 1.4, cell.z * 0.9);
        const patternBaseColor = getPatternBaseColor(profile);
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
          (drift - 0.5) * topLift +
          (patternStrength - 0.5) *
            (profile.patternMode === "uploaded"
              ? baseModuleThickness * (0.14 + reliefStrength * 0.56)
              : 0);
        const thicknessFactor =
          profile.patternMode === "uploaded"
            ? 0.88 + (patternStrength - 0.5) * (0.18 + reliefStrength * 0.5)
            : 1;
        const moduleThickness = Math.max(
          0.01,
          baseModuleThickness * Math.max(0.46, thicknessFactor)
        );
        moduleState.dummy.position.set(
          cell.x,
          profile.legLength + moduleThickness / 2 + lift,
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
        mesh.setColorAt(index, getModuleColor(profile, cell, moduleState.patternInfo));
      });

      mesh.count = cells.length;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }

      tableGroup.add(mesh);
      moduleState.mesh = mesh;
    }

    function updateTable(profile) {
      ensureLegMeshes(profile);
      rebuildModuleMesh(profile);

      const anchors = getLegAnchors(profile);
      const legScale = getLegScale(profile);

      legState.meshes.forEach((leg, index) => {
        const anchor = anchors[index];
        leg.position.set(anchor.x, anchor.y, anchor.z);
        leg.rotation.y = anchor.rotationY;
        leg.scale.set(legScale.x, profile.legLength, legScale.z);
      });
    }

    function applyScenario(scenarioKey) {
      const preset = SCENARIO_PRESETS[scenarioKey] ?? SCENARIO_PRESETS.daylight;
      const background = new THREE.Color(preset.background);
      const fog = new THREE.Color(preset.fog);
      const key = new THREE.Color(preset.keyColor);
      const fill = new THREE.Color(preset.fillColor);
      const rim = new THREE.Color(preset.rimColor);

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
      gsap.to(fillLight, {
        duration: 1.3,
        intensity: preset.fillIntensity
      });
      gsap.to(hemisphere, {
        duration: 1.3,
        intensity: preset.hemiIntensity
      });
      gsap.to(ground.material, {
        duration: 1.3,
        opacity: scenarioKey === "late_night" ? 0.22 : 0.16
      });
    }

    updateTable(shapeState);
    applyModuleMaterial(
      moduleMaterial,
      MATERIAL_PRESETS[shapeState.material] ?? MATERIAL_PRESETS.light_wood,
      shapeState.patternMode
    );
    applyLegMaterial(
      legMaterial,
      MATERIAL_PRESETS[shapeState.material] ?? MATERIAL_PRESETS.light_wood,
      shapeState.finishColor
    );
    applyScenario(shapeState.scenario);

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

    window.addEventListener("resize", handleResize);
    render();

    sceneRef.current = {
      camera,
      controls,
      lookAtTarget,
      moduleMaterial,
      legMaterial,
      shapeState,
      applyScenario,
      updateTable,
      phase,
      moduleState
    };

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      controls.dispose();
      if (legState.geometry) {
        legState.geometry.dispose();
      }
      moduleState.geometry.dispose();
      moduleMaterial.dispose();
      legMaterial.dispose();
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

    const profile = getShapeProfile(config);
    state.phase = phase;
    state.shapeState.shape = profile.shape;
    state.shapeState.material = profile.material;
    state.shapeState.finishColor = profile.finishColor;
    state.shapeState.scenario = profile.scenario;
    state.shapeState.legShape = profile.legShape;
    state.shapeState.legCount = profile.legCount;
    state.shapeState.legLength = profile.legLength;
    state.shapeState.legWidth = profile.legWidth;
    state.shapeState.legDepth = profile.legDepth;
    state.shapeState.patternMode = profile.patternMode;
    state.shapeState.silhouetteMode = profile.silhouetteMode;
    state.shapeState.moduleThicknessScale = profile.moduleThicknessScale;
    state.shapeState.patternPresence = profile.patternPresence;
    state.shapeState.patternContrast = profile.patternContrast;
    state.shapeState.patternBrightness = profile.patternBrightness;
    state.shapeState.patternRelief = profile.patternRelief;

    const pose = getCameraPose(state.camera, profile, phase);
    state.controls.minDistance = pose.minDistance;
    state.controls.maxDistance = pose.maxDistance;
    state.controls.enabled = phase === "configurator";
    state.controls.enableZoom = phase === "configurator";
    state.controls.autoRotate = phase !== "configurator";

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
    gsap.to(state.shapeState, {
      duration: 1.05,
      width: profile.width,
      depth: profile.depth,
      radiusX: profile.radiusX,
      radiusZ: profile.radiusZ,
      exponent: profile.exponent,
      thickness: profile.thickness,
      topY: profile.topY,
      legLength: profile.legLength,
      legWidth: profile.legWidth,
      legDepth: profile.legDepth,
      moduleSize: profile.moduleSize,
      moduleGap: profile.moduleGap,
      moduleThicknessScale: profile.moduleThicknessScale,
      patternPresence: profile.patternPresence,
      patternContrast: profile.patternContrast,
      patternBrightness: profile.patternBrightness,
      patternRelief: profile.patternRelief,
      ease: "power2.out",
      onUpdate: () => {
        state.updateTable(state.shapeState);
      }
    });

    const materialValues =
      MATERIAL_PRESETS[config.material] ?? MATERIAL_PRESETS.light_wood;
    applyModuleMaterial(state.moduleMaterial, materialValues, config.patternMode);
    applyLegMaterial(state.legMaterial, materialValues, config.finishColor);
    state.applyScenario(config.scenario);
  }, [config, phase]);

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
      <div className="scene-shell__canvas" ref={containerRef} />
    </div>
  );
}
