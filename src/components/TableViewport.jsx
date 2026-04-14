import { useEffect, useRef } from "react";
import * as THREE from "three";
import { gsap } from "gsap";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  MATERIAL_PRESETS,
  SCENARIO_PRESETS,
  getShapeProfile
} from "../lib/catalog";

const INTRO_CAMERA = { x: -1.9, y: 2.55, z: 7.6 };
const DETAIL_CAMERA = { x: 2.4, y: 1.62, z: 4.15 };
const TABLE_HEIGHT = 0.72;
const LEG_HEIGHT = 0.72;

function buildSuperellipseShape(radiusX, radiusZ, exponent, segments = 96) {
  const shape = new THREE.Shape();

  for (let index = 0; index <= segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const x =
      Math.sign(cos) * radiusX * Math.pow(Math.abs(cos), 2 / exponent);
    const z =
      Math.sign(sin) * radiusZ * Math.pow(Math.abs(sin), 2 / exponent);

    if (index === 0) {
      shape.moveTo(x, z);
    } else {
      shape.lineTo(x, z);
    }
  }

  return shape;
}

function createTopGeometry(profile) {
  const geometry = new THREE.ExtrudeGeometry(
    buildSuperellipseShape(profile.radiusX, profile.radiusZ, profile.exponent),
    {
      depth: profile.thickness,
      bevelEnabled: false,
      curveSegments: 48
    }
  );

  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, -profile.thickness / 2, 0);
  geometry.computeVertexNormals();
  return geometry;
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

function applyMaterial(material, values) {
  material.color.set(values.topColor);
  material.roughness = values.roughness;
  material.metalness = values.metalness;
  material.clearcoat = values.clearcoat;
  material.reflectivity = values.reflectivity;
  material.needsUpdate = true;
}

function applyLegMaterial(material, values) {
  material.color.set(values.legColor);
  material.roughness = Math.min(1, values.roughness + 0.06);
  material.metalness = values.metalness;
  material.clearcoat = Math.max(0, values.clearcoat - 0.02);
  material.reflectivity = values.reflectivity;
  material.needsUpdate = true;
}

export default function TableViewport({ config, phase }) {
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
    controls.maxDistance = 8.6;
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

    const topMaterial = new THREE.MeshPhysicalMaterial();
    const legMaterial = new THREE.MeshPhysicalMaterial();
    const tabletop = new THREE.Mesh(
      createTopGeometry(getShapeProfile(config)),
      topMaterial
    );
    tabletop.castShadow = true;
    tabletop.receiveShadow = true;
    tableGroup.add(tabletop);

    const legGeometry = new THREE.CylinderGeometry(1, 0.84, 1, 24, 1);
    const legs = Array.from({ length: 4 }, () => {
      const leg = new THREE.Mesh(legGeometry, legMaterial);
      leg.castShadow = true;
      leg.receiveShadow = true;
      tableGroup.add(leg);
      return leg;
    });

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

    function updateTable(profile) {
      const nextGeometry = createTopGeometry(profile);
      tabletop.geometry.dispose();
      tabletop.geometry = nextGeometry;
      tabletop.position.y = TABLE_HEIGHT + profile.thickness / 2;

      const positions = [
        [profile.legSpreadX, LEG_HEIGHT / 2, profile.legSpreadZ],
        [-profile.legSpreadX, LEG_HEIGHT / 2, profile.legSpreadZ],
        [profile.legSpreadX, LEG_HEIGHT / 2, -profile.legSpreadZ],
        [-profile.legSpreadX, LEG_HEIGHT / 2, -profile.legSpreadZ]
      ];

      legs.forEach((leg, index) => {
        const [x, y, z] = positions[index];
        leg.position.set(x, y, z);
        leg.scale.set(profile.legRadius, LEG_HEIGHT, profile.legRadius);
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
    applyMaterial(
      topMaterial,
      MATERIAL_PRESETS[config.material] ?? MATERIAL_PRESETS.light_wood
    );
    applyLegMaterial(
      legMaterial,
      MATERIAL_PRESETS[config.material] ?? MATERIAL_PRESETS.light_wood
    );
    applyScenario(config.scenario);

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
    }

    window.addEventListener("resize", handleResize);
    render();

    sceneRef.current = {
      camera,
      controls,
      lookAtTarget,
      topMaterial,
      legMaterial,
      shapeState,
      applyScenario,
      updateTable
    };

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      controls.dispose();
      tabletop.geometry.dispose();
      legGeometry.dispose();
      topMaterial.dispose();
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
      return;
    }

    const targetCamera = phase === "configurator" ? DETAIL_CAMERA : INTRO_CAMERA;
    const targetLook =
      phase === "configurator"
        ? { x: 0, y: 0.78, z: 0 }
        : { x: 0, y: 0.56, z: 0 };

    gsap.to(state.camera.position, {
      duration: 1.8,
      x: targetCamera.x,
      y: targetCamera.y,
      z: targetCamera.z,
      ease: "power3.inOut"
    });
    gsap.to(state.lookAtTarget, {
      duration: 1.8,
      x: targetLook.x,
      y: targetLook.y,
      z: targetLook.z,
      ease: "power3.inOut"
    });
    state.controls.enabled = phase === "configurator";
    state.controls.enableZoom = phase === "configurator";
    state.controls.autoRotate = phase !== "configurator";
  }, [phase]);

  useEffect(() => {
    const state = sceneRef.current;
    if (!state) {
      return;
    }

    const profile = getShapeProfile(config);
    gsap.killTweensOf(state.shapeState);
    gsap.to(state.shapeState, {
      duration: 1.1,
      ...profile,
      ease: "power2.out",
      onUpdate: () => {
        state.updateTable(state.shapeState);
      }
    });

    const materialValues =
      MATERIAL_PRESETS[config.material] ?? MATERIAL_PRESETS.light_wood;
    applyMaterial(state.topMaterial, materialValues);
    applyLegMaterial(state.legMaterial, materialValues);
    state.applyScenario(config.scenario);
  }, [config]);

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
