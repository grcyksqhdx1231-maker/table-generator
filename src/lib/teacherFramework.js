import * as THREE from "three";

export const TEACHER_FRAMEWORK_BASE = {
  width: 1.4,
  depth: 0.65,
  height: 0.76,
  legTopY: 0.73,
  boardThickness: 0.025,
  topCornerRadius: 0.01,
  frameInset: 0.019,
  frameThickness: 0.025,
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
  legSpread: 0,
  legToeSharpness: 0.6,
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
  shape.absarc(
    halfWidth - safeRadius,
    -halfDepth + safeRadius,
    safeRadius,
    -Math.PI / 2,
    0
  );
  shape.lineTo(halfWidth, halfDepth - safeRadius);
  shape.absarc(
    halfWidth - safeRadius,
    halfDepth - safeRadius,
    safeRadius,
    0,
    Math.PI / 2
  );
  shape.lineTo(-halfWidth + safeRadius, halfDepth);
  shape.absarc(
    -halfWidth + safeRadius,
    halfDepth - safeRadius,
    safeRadius,
    Math.PI / 2,
    Math.PI
  );
  shape.lineTo(-halfWidth, -halfDepth + safeRadius);
  shape.absarc(
    -halfWidth + safeRadius,
    -halfDepth + safeRadius,
    safeRadius,
    Math.PI,
    Math.PI * 1.5
  );
  shape.closePath();
  return shape;
}

function shapeToOutlinePoints(shape, segments = 88) {
  const points = shape.getSpacedPoints(segments);

  if (points.length > 1) {
    const first = points[0];
    const last = points[points.length - 1];

    if (Math.hypot(first.x - last.x, first.y - last.y) < 0.000001) {
      points.pop();
    }
  }

  return points.map((point) => ({
    x: point.x,
    z: point.y
  }));
}

function createOutlineShape(outlinePoints) {
  const points = outlinePoints.map((point) => new THREE.Vector2(point.x, point.z));
  const orientedPoints = THREE.ShapeUtils.isClockWise(points) ? points : [...points].reverse();
  const shape = new THREE.Shape(orientedPoints);
  shape.autoClose = true;
  return shape;
}

function insetOutline(outlinePoints, inset) {
  if (!Array.isArray(outlinePoints) || outlinePoints.length < 3) {
    return [];
  }

  const centroid = outlinePoints.reduce(
    (accumulator, point) => ({
      x: accumulator.x + point.x / outlinePoints.length,
      z: accumulator.z + point.z / outlinePoints.length
    }),
    { x: 0, z: 0 }
  );

  return outlinePoints.map((point) => {
    const dx = point.x - centroid.x;
    const dz = point.z - centroid.z;
    const distance = Math.hypot(dx, dz) || 1;
    const scale = Math.max(0.1, (distance - inset) / distance);

    return {
      x: centroid.x + dx * scale,
      z: centroid.z + dz * scale
    };
  });
}

export function getTeacherSurfaceInset(metrics = TEACHER_FRAMEWORK_BASE) {
  return THREE.MathUtils.clamp(
    metrics.frameInset + metrics.frameThickness * 0.72,
    0.028,
    Math.min(metrics.width, metrics.depth) / 2 - 0.055
  );
}

export function getTeacherModuleOutline(
  metrics = TEACHER_FRAMEWORK_BASE,
  outlinePoints = []
) {
  const inset = getTeacherSurfaceInset(metrics);

  if (Array.isArray(outlinePoints) && outlinePoints.length >= 3) {
    return insetOutline(outlinePoints, inset);
  }

  return shapeToOutlinePoints(
    roundedRectShape(
      Math.max(0.04, metrics.width - inset * 2),
      Math.max(0.04, metrics.depth - inset * 2),
      Math.max(0.002, metrics.topCornerRadius - inset * 0.84)
    )
  );
}

function createInnerPath(outlinePoints) {
  const points = outlinePoints.map((point) => new THREE.Vector2(point.x, point.z));
  const orientedPoints = THREE.ShapeUtils.isClockWise(points) ? [...points].reverse() : points;
  return new THREE.Path(orientedPoints);
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

function createExtrudedPlanGeometry(shape, thickness) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
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

export function getTeacherFrameworkMetrics(profile) {
  const boardThickness = Math.max(0.022, Math.min(0.04, profile.height - profile.legLength));
  const width = Math.max(0.7, profile.width);
  const depth = Math.max(0.6, profile.depth);
  const frameInset = Math.min(
    Math.max(0.02, Math.min(width, depth) / 2 - 0.08),
    Math.max(0.008, Number(profile.frameInset ?? TEACHER_FRAMEWORK_BASE.frameInset))
  );
  const frameThickness = Math.min(
    Math.max(0.014, Math.min(width, depth) / 2 - frameInset - 0.02),
    Math.max(
      0.012,
      Number(profile.frameThickness ?? TEACHER_FRAMEWORK_BASE.frameThickness)
    )
  );
  const frameOuterWidth = Math.max(0.16, width - frameInset * 2);
  const frameOuterDepth = Math.max(0.16, depth - frameInset * 2);
  const topCornerRadius = Math.min(0.024, Math.max(0.008, Math.min(width, depth) * 0.015));
  const frameDrop = Math.max(0.028, Math.min(0.058, boardThickness + 0.012));
  const legWidth = Math.max(0.022, profile.legWidth);
  const legUpperDepth = Math.max(
    legWidth * 0.95,
    Number(profile.legTopDepth ?? profile.legDepth ?? TEACHER_FRAMEWORK_BASE.legUpperDepth)
  );
  const legLowerDepth = Math.min(
    legUpperDepth,
    Math.max(
      0.004,
      Number(profile.legBottomDepth ?? TEACHER_FRAMEWORK_BASE.legLowerDepth)
    )
  );
  const legBellyDepth = Math.max(
    0,
    Number(profile.legBellyDepth ?? TEACHER_FRAMEWORK_BASE.legBellyDepth)
  );
  const footWidth = Math.min(
    legWidth,
    Math.max(0.004, Number(profile.legToeWidth ?? TEACHER_FRAMEWORK_BASE.footWidth))
  );
  const legSpread = Math.max(
    -0.04,
    Math.min(0.08, Number(profile.legSpread ?? TEACHER_FRAMEWORK_BASE.legSpread))
  );
  const legToeSharpness = Math.max(
    0,
    Math.min(1, Number(profile.legToeSharpness ?? TEACHER_FRAMEWORK_BASE.legToeSharpness))
  );

  return {
    width,
    depth,
    height: profile.height,
    legTopY: profile.legLength,
    boardThickness,
    topCornerRadius,
    frameInset,
    frameThickness,
    frameEdge: frameThickness,
    frameOuterWidth,
    frameOuterDepth,
    frameDrop,
    legWidth,
    legUpperDepth,
    legLowerDepth,
    legBellyDepth,
    footWidth,
    footInset: 0,
    legSpread,
    legToeSharpness,
    legOrientationOffset: TEACHER_FRAMEWORK_BASE.legOrientationOffset
  };
}

export function createTeacherBoardGeometry(
  metrics = TEACHER_FRAMEWORK_BASE,
  outlinePoints = []
) {
  const outer =
    Array.isArray(outlinePoints) && outlinePoints.length >= 3
      ? createOutlineShape(outlinePoints)
      : roundedRectShape(metrics.width, metrics.depth, metrics.topCornerRadius);
  const surfaceInset = getTeacherSurfaceInset(metrics);

  if (Array.isArray(outlinePoints) && outlinePoints.length >= 3) {
    const innerOutline = getTeacherModuleOutline(metrics, outlinePoints);
    if (innerOutline.length >= 3) {
      outer.holes.push(createInnerPath(innerOutline));
    }
  } else {
    outer.holes.push(
      roundedRectShape(
        Math.max(0.04, metrics.width - surfaceInset * 2),
        Math.max(0.04, metrics.depth - surfaceInset * 2),
        Math.max(0.002, metrics.topCornerRadius - surfaceInset * 0.84)
      )
    );
  }

  return createExtrudedPlanGeometry(outer, metrics.boardThickness);
}

export function createTeacherFrameGeometry(
  metrics = TEACHER_FRAMEWORK_BASE,
  outlinePoints = []
) {
  const outer =
    Array.isArray(outlinePoints) && outlinePoints.length >= 3
      ? createOutlineShape(outlinePoints)
      : roundedRectShape(
          metrics.frameOuterWidth,
          metrics.frameOuterDepth,
          Math.max(0.004, metrics.topCornerRadius - metrics.frameInset * 0.2)
        );

  if (Array.isArray(outlinePoints) && outlinePoints.length >= 3) {
    const innerOutline = insetOutline(outlinePoints, metrics.frameThickness);
    if (innerOutline.length >= 3) {
      outer.holes.push(createInnerPath(innerOutline));
    }
  } else {
    outer.holes.push(
      roundedRectShape(
        Math.max(0.04, metrics.frameOuterWidth - metrics.frameThickness * 2),
        Math.max(0.04, metrics.frameOuterDepth - metrics.frameThickness * 2),
        Math.max(0.002, metrics.topCornerRadius - metrics.frameThickness)
      )
    );
  }

  const geometry = createExtrudedPlanGeometry(outer, metrics.frameDrop);
  geometry.translate(0, metrics.frameDrop / 2, 0);
  geometry.computeVertexNormals();
  return geometry;
}

export function createTeacherLegGeometry(metrics = TEACHER_FRAMEWORK_BASE) {
  const topWidth = metrics.legWidth;
  const topDepth = metrics.legUpperDepth;
  const bellyDepth = topDepth + metrics.legBellyDepth;
  const toeSharpness = Math.max(0, Math.min(1, metrics.legToeSharpness ?? 0.6));
  const shoulderWidth = topWidth * (0.9 - toeSharpness * 0.08);
  const bellyWidth = topWidth * (0.74 - toeSharpness * 0.08);
  const ankleWidth = Math.max(metrics.footWidth * 2.2, topWidth * (0.48 - toeSharpness * 0.1));
  const ankleDepth = Math.max(
    metrics.legLowerDepth * 2.2,
    topDepth * (0.2 - toeSharpness * 0.06) + metrics.legBellyDepth * 0.28
  );
  const sections = [
    legSection(0, topWidth, topDepth),
    legSection(-metrics.legTopY * (0.24 + toeSharpness * 0.08), shoulderWidth, bellyDepth),
    legSection(-metrics.legTopY * 0.56, bellyWidth, Math.max(topDepth * 0.54, bellyDepth)),
    legSection(
      -metrics.legTopY * (0.82 + toeSharpness * 0.06),
      ankleWidth,
      ankleDepth
    ),
    legSection(-metrics.legTopY, metrics.footWidth, metrics.legLowerDepth)
  ];

  return loftSections(sections);
}

export function getTeacherLegAnchors(metrics, legCount = 4) {
  const anchorWidth = THREE.MathUtils.clamp(
    metrics.frameOuterWidth / 2 - metrics.frameThickness * 0.7 + metrics.legSpread,
    metrics.legWidth * 0.9,
    metrics.width / 2 - metrics.legWidth * 0.65
  );
  const anchorDepth = THREE.MathUtils.clamp(
    metrics.frameOuterDepth / 2 - metrics.frameThickness * 0.7 + metrics.legSpread * 0.7,
    metrics.legLowerDepth * 1.6,
    metrics.depth / 2 - metrics.legLowerDepth * 2.2
  );
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
