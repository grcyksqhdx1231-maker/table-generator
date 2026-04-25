import * as THREE from "three";
import { getEcoMaterial } from "./ecoMaterials";

const TEXTURE_CACHE = new Map();

function randomFromSeed(seed) {
  const value = Math.sin(seed * 127.1) * 43758.5453123;
  return value - Math.floor(value);
}

function createCanvas(size = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function paintSpeckle(context, descriptor, size) {
  context.fillStyle = descriptor.baseColor;
  context.fillRect(0, 0, size, size);
  for (let index = 0; index < 1400; index += 1) {
    const x = randomFromSeed(index + 1) * size;
    const y = randomFromSeed(index + 2.5) * size;
    const radius = 0.8 + randomFromSeed(index + 7) * 1.8;
    context.fillStyle =
      index % 4 === 0
        ? "rgba(255,255,255,0.16)"
        : index % 3 === 0
          ? "rgba(0,0,0,0.06)"
          : `${descriptor.tintColor}22`;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }
}

function paintWood(context, descriptor, size) {
  const gradient = context.createLinearGradient(0, 0, size, size * 0.12);
  gradient.addColorStop(0, descriptor.baseColor);
  gradient.addColorStop(1, descriptor.tintColor);
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  for (let row = 0; row < size; row += 6) {
    const wave = Math.sin(row * 0.08) * 8;
    context.strokeStyle = row % 12 === 0 ? "rgba(95,63,39,0.22)" : "rgba(255,255,255,0.08)";
    context.lineWidth = row % 12 === 0 ? 1.2 : 0.6;
    context.beginPath();
    context.moveTo(0, row + wave);
    for (let x = 0; x <= size; x += 18) {
      context.lineTo(x, row + Math.sin((x + row) * 0.08) * 5 + wave);
    }
    context.stroke();
  }
}

function paintCork(context, descriptor, size) {
  context.fillStyle = descriptor.baseColor;
  context.fillRect(0, 0, size, size);
  for (let index = 0; index < 1200; index += 1) {
    const x = randomFromSeed(index + 17) * size;
    const y = randomFromSeed(index + 38) * size;
    const radius = 0.8 + randomFromSeed(index + 9) * 3.4;
    context.fillStyle =
      index % 5 === 0 ? "rgba(255,255,255,0.1)" : "rgba(43,24,18,0.14)";
    context.beginPath();
    context.ellipse(x, y, radius, radius * 0.74, 0, 0, Math.PI * 2);
    context.fill();
  }
}

function paintFiber(context, descriptor, size) {
  context.fillStyle = descriptor.baseColor;
  context.fillRect(0, 0, size, size);

  for (let index = 0; index < 420; index += 1) {
    const x = randomFromSeed(index + 80) * size;
    const y = randomFromSeed(index + 120) * size;
    const length = 10 + randomFromSeed(index + 150) * 24;
    const angle = randomFromSeed(index + 190) * Math.PI;
    context.strokeStyle =
      index % 4 === 0 ? "rgba(255,255,255,0.16)" : "rgba(72,63,48,0.14)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    context.stroke();
  }
}

function paintResin(context, descriptor, size) {
  const gradient = context.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, descriptor.baseColor);
  gradient.addColorStop(1, descriptor.tintColor);
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  for (let index = 0; index < 24; index += 1) {
    const x = randomFromSeed(index + 31) * size;
    const y = randomFromSeed(index + 61) * size;
    const radius = 16 + randomFromSeed(index + 93) * 28;
    const radial = context.createRadialGradient(x, y, 0, x, y, radius);
    radial.addColorStop(0, "rgba(255,255,255,0.18)");
    radial.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = radial;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
}

function paintChalk(context, descriptor, size) {
  context.fillStyle = descriptor.baseColor;
  context.fillRect(0, 0, size, size);
  for (let index = 0; index < 1800; index += 1) {
    const x = randomFromSeed(index + 11) * size;
    const y = randomFromSeed(index + 22) * size;
    const alpha = 0.02 + randomFromSeed(index + 33) * 0.08;
    context.fillStyle = `rgba(255,255,255,${alpha})`;
    context.fillRect(x, y, 2, 2);
  }
}

function createTexture(descriptor) {
  const size = 256;
  const canvas = createCanvas(size);
  const context = canvas.getContext("2d");

  switch (descriptor.texture) {
    case "wood":
      paintWood(context, descriptor, size);
      break;
    case "cork":
      paintCork(context, descriptor, size);
      break;
    case "fiber":
      paintFiber(context, descriptor, size);
      break;
    case "resin":
      paintResin(context, descriptor, size);
      break;
    case "chalk":
      paintChalk(context, descriptor, size);
      break;
    case "speckle":
    default:
      paintSpeckle(context, descriptor, size);
      break;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.4, 2.4);
  return texture;
}

export function getMaterialTexture(materialKey) {
  if (TEXTURE_CACHE.has(materialKey)) {
    return TEXTURE_CACHE.get(materialKey);
  }

  const descriptor = getEcoMaterial(materialKey);
  const texture = createTexture(descriptor);
  TEXTURE_CACHE.set(materialKey, texture);
  return texture;
}
