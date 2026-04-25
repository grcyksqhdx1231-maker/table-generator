import * as THREE from "three";

export const TEACHER_FRAMEWORK_BASE = {
  width: 1.4,
  depth: 0.65,
  height: 0.76,
  legTopY: 0.73,
  boardThickness: 0.025,
  topCornerRadius: 0.01,
  frameInset: 0.019,
  frameEdge: 0.025,
  frameOuterWidth: 1.4 - 0.019 * 2,
  frameOuterDepth: 0.65 - 0.019 * 2,
  frameDrop: 0.04,
  legWidth: 0.04,
  legUpperDepth: 0.076161,
  legLowerDepth: 0.004,
  legBellyDepth: 0,
  footWidth: 0.004,
  footInset: 0,
  legOrientationOffset: Math.PI / 4
};

function roundedRectShape(width, depth, radius) {
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  const safeRadius = Math.max(
    0.001,
    Math.min(radius, halfWidth - 0.001, halfDepth - 0.001)
  );

  const shape = new THREE.Shape();
  shape.moveTo(-halfWidth + safeRadius, -halfDepth);
  shape.lineTo(halfWidth - safeRadius, -halfDepth);
  shape.absarc(halfWidth - safeRadius, -halfDepth + safeRadius, safeRadius, -Math.PI / 2, 0);
  shape.lineTo(halfWidth, halfDepth - safeRadius);
  shape.absarc(halfWidth - safeRadius, halfDepth - safeRadius, safeRadius, 0, Math.PI / 2);
  shape.lineTo(-halfWidth + safeRadius, halfDepth);
  shape.absarc(-halfWidth + safeRadius, halfDepth - safeRadius, safeRadius, Math.PI / 2, Math.PI);
  shape.lineTo(-halfWidth, -halfDepth + safeRadius);
  shape.absarc(-halfWidth + safeRadius, -halfDepth + safeRadius, safeRadius, Math.PI, Math.PI * 1.5);
  shape.closePath();
  return shape;
}

function loftSections(sections) {
  const positions = [];
  const indices = [];
  const ringSize = sections[0].length;

  sections.forEach((section) => {
    section.forEach((point) => {
      positions.push(point.x, point.y, point.z);
    });
  });

  for (let ring = 0; ring < sections.length - 1; ring += 1) {
    const ringOffset = ring * ringSize;
    const nextOffset = (ring + 1) * ringSize;

    for (let index = 0; index < ringSize; index += 1) {
      const nextIndex = (index + 1) % ringSize;
      const a = ringOffset + index;
      const b = ringOffset + nextIndex;
      const c = nextOffset + nextIndex;
      const d = nextOffset + index;

      indices.push(a, b, c, a, c, d);
    }
  }

  for (let index = 1; index < ringSize - 1; index += 1) {
    indices.push(0, index, index + 1);
  }

  const lastOffset = (sections.length - 1) * ringSize;
  for (let index = 1; index < ringSize - 1; index += 1) {
    indices.push(lastOffset, lastOffset + index + 1, lastOffset + index);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function legSection(y, width, depth) {
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  return [
    new THREE.Vector3(-halfWidth, y, -halfDepth),
    new THREE.Vector3(halfWidth, y, -halfDepth),
    new THREE.Vector3(halfWidth, y, halfDepth),
    new THREE.Vector3(-halfWidth, y, halfDepth)
  ];
}

export function getTeacherFrameworkMetrics(profile) {
  const boardThickness = Math.max(0.022, Math.min(0.04, profile.height - profile.legLength));
  const width = Math.max(0.7, profile.width);
  const depth = Math.max(0.6, profile.depth);
  const frameInset = Math.min(0.04, Math.max(0.014, width * 0.0135));
  const frameEdge = Math.min(0.038, Math.max(0.018, depth * 0.038));
  const frameOuterWidth = Math.max(0.16, width - frameInset * 2);
  const frameOuterDepth = Math.max(0.16, depth - frameInset * 2);
  const topCornerRadius = Math.min(0.024, Math.max(0.008, Math.min(width, depth) * 0.015));
  const frameDrop = Math.max(0.028, Math.min(0.055, boardThickness + 0.012));
  const legWidth = Math.max(0.022, profile.legWidth);
  const legUpperDepth = Math.max(legWidth * 1.55, profile.legDepth);
  const legLowerDepth = Math.max(0.004, legWidth * 0.1);
  const footWidth = Math.max(0.004, legWidth * 0.1);

  return {
    width,
    depth,
    height: profile.height,
    legTopY: profile.legLength,
    boardThickness,
    topCornerRadius,
    frameInset,
    frameEdge,
    frameOuterWidth,
    frameOuterDepth,
    frameDrop,
    legWidth,
    legUpperDepth,
    legLowerDepth,
    legBellyDepth: Math.max(0, legUpperDepth * 0.08),
    footWidth,
    footInset: 0,
    legOrientationOffset: TEACHER_FRAMEWORK_BASE.legOrientationOffset
  };
}

export function createTeacherBoardGeometry() {
  const shape = roundedRectShape(
    TEACHER_FRAMEWORK_BASE.width,
    TEACHER_FRAMEWORK_BASE.depth,
    TEACHER_FRAMEWORK_BASE.topCornerRadius
  );

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: TEACHER_FRAMEWORK_BASE.boardThickness,
    bevelEnabled: false,
    curveSegments: 24
  });
  geometry.rotateX(Math.PI / 2);
  geometry.computeBoundingBox();
  const centerY =
    ((geometry.boundingBox?.min.y || 0) + (geometry.boundingBox?.max.y || 0)) / 2;
  geometry.translate(0, -centerY, 0);
  geometry.computeVertexNormals();
  return geometry;
}

export function createTeacherFrameGeometry() {
  const outer = roundedRectShape(
    TEACHER_FRAMEWORK_BASE.frameOuterWidth,
    TEACHER_FRAMEWORK_BASE.frameOuterDepth,
    Math.max(0.004, TEACHER_FRAMEWORK_BASE.topCornerRadius - TEACHER_FRAMEWORK_BASE.frameInset * 0.2)
  );
  const inner = roundedRectShape(
    TEACHER_FRAMEWORK_BASE.frameOuterWidth - TEACHER_FRAMEWORK_BASE.frameEdge * 2,
    TEACHER_FRAMEWORK_BASE.frameOuterDepth - TEACHER_FRAMEWORK_BASE.frameEdge * 2,
    Math.max(0.002, TEACHER_FRAMEWORK_BASE.topCornerRadius - TEACHER_FRAMEWORK_BASE.frameEdge)
  );
  outer.holes.push(inner);

  const geometry = new THREE.ExtrudeGeometry(outer, {
    depth: TEACHER_FRAMEWORK_BASE.frameDrop,
    bevelEnabled: false,
    curveSegments: 18
  });
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, TEACHER_FRAMEWORK_BASE.frameDrop / 2, 0);
  geometry.computeVertexNormals();
  return geometry;
}

export function createTeacherLegGeometry() {
  const base = TEACHER_FRAMEWORK_BASE;
  const sections = [
    legSection(0, base.legWidth, base.legUpperDepth),
    legSection(
      -base.legTopY * 0.35,
      base.legWidth * 0.84,
      base.legUpperDepth + base.legBellyDepth
    ),
    legSection(
      -base.legTopY * 0.78,
      Math.max(base.footWidth * 2.4, base.legWidth * 0.42),
      Math.max(base.legLowerDepth * 2.2, base.legUpperDepth * 0.18)
    ),
    legSection(-base.legTopY, base.footWidth, base.legLowerDepth)
  ];

  return loftSections(sections);
}

export function getTeacherLegAnchors(metrics, legCount = 4) {
  const anchorWidth = metrics.frameOuterWidth / 2 - metrics.frameEdge * 0.8;
  const anchorDepth = metrics.frameOuterDepth / 2 - metrics.frameEdge * 0.8;
  const anchors = [
    new THREE.Vector3(anchorWidth, metrics.legTopY, anchorDepth),
    new THREE.Vector3(-anchorWidth, metrics.legTopY, anchorDepth),
    new THREE.Vector3(-anchorWidth, metrics.legTopY, -anchorDepth),
    new THREE.Vector3(anchorWidth, metrics.legTopY, -anchorDepth)
  ];
  const rotations = [
    Math.PI / 4,
    -Math.PI / 4,
    -Math.PI * 3 / 4,
    Math.PI * 3 / 4
  ];

  return Array.from({ length: Math.min(legCount, anchors.length) }, (_, index) => ({
    position: anchors[index],
    rotationY: rotations[index]
  }));
}
