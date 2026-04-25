const SQRT3 = Math.sqrt(3);

function getSuperellipsePoint(radiusX, radiusZ, exponent, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return {
    x: Math.sign(cos) * radiusX * Math.pow(Math.abs(cos), 2 / exponent),
    z: Math.sign(sin) * radiusZ * Math.pow(Math.abs(sin), 2 / exponent)
  };
}

function pointInPolygon(point, polygon) {
  let inside = false;

  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];

    const intersects =
      currentPoint.z > point.z !== previousPoint.z > point.z &&
      point.x <
        ((previousPoint.x - currentPoint.x) * (point.z - currentPoint.z)) /
          ((previousPoint.z - currentPoint.z) || Number.EPSILON) +
          currentPoint.x;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function distancePointToSegment(point, start, end) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const lengthSquared = dx * dx + dz * dz;

  if (!lengthSquared) {
    return Math.hypot(point.x - start.x, point.z - start.z);
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * dx + (point.z - start.z) * dz) / lengthSquared
    )
  );

  const projectionX = start.x + dx * t;
  const projectionZ = start.z + dz * t;
  return Math.hypot(point.x - projectionX, point.z - projectionZ);
}

function distanceToPolygonEdge(point, polygon) {
  if (!polygon.length) {
    return Number.POSITIVE_INFINITY;
  }

  let minDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index];
    const next = polygon[(index + 1) % polygon.length];
    minDistance = Math.min(
      minDistance,
      distancePointToSegment(point, current, next)
    );
  }

  return minDistance;
}

function isTriangleInsideShape(triangle, outline) {
  if (pointInPolygon(triangle.centroid, outline)) {
    return true;
  }

  const insideVertices = triangle.vertices.filter((vertex) =>
    pointInPolygon(vertex, outline)
  ).length;

  return insideVertices >= 2;
}

function getTriangleApex(vertices) {
  const uniqueRows = new Map();

  vertices.forEach((vertex) => {
    const key = vertex.z.toFixed(4);
    uniqueRows.set(key, (uniqueRows.get(key) || 0) + 1);
  });

  return (
    vertices.find((vertex) => uniqueRows.get(vertex.z.toFixed(4)) === 1) ??
    vertices[0]
  );
}

function getTriangleRotation(vertices, centroid) {
  const apex = getTriangleApex(vertices);
  return Math.atan2(apex.x - centroid.x, apex.z - centroid.z);
}

function getTriangleCentroid(vertices) {
  return {
    x: (vertices[0].x + vertices[1].x + vertices[2].x) / 3,
    z: (vertices[0].z + vertices[1].z + vertices[2].z) / 3
  };
}

function getLatticePoint(column, row, side, triangleHeight) {
  return {
    x: column * side + (row % 2 === 0 ? 0 : side / 2),
    z: row * triangleHeight
  };
}

function createTriangleData(vertices, profile) {
  const centroid = getTriangleCentroid(vertices);

  return {
    vertices,
    centroid,
    rotation: getTriangleRotation(vertices, centroid),
    u: (centroid.x + profile.width / 2) / Math.max(profile.width, Number.EPSILON),
    v: (profile.depth / 2 - centroid.z) / Math.max(profile.depth, Number.EPSILON)
  };
}

export function buildShapeOutline(profile, segments = 72) {
  return Array.from({ length: segments }, (_, index) => {
    const angle = (index / segments) * Math.PI * 2;
    return getSuperellipsePoint(profile.radiusX, profile.radiusZ, profile.exponent, angle);
  });
}

export function mapSketchHullToOutline(profile, hullPoints = []) {
  if (!Array.isArray(hullPoints) || hullPoints.length < 3) {
    return [];
  }

  return hullPoints.map((point) => ({
    x: (point.x - 0.5) * profile.width,
    z: (0.5 - point.y) * profile.depth
  }));
}

export function generateTriangleCells(
  profile,
  {
    outlinePoints = [],
    useSketchMask = false,
    localMaskMode = false,
    maskSampler = null
  } = {}
) {
  const side = profile.moduleSize;
  const triangleHeight = (side * SQRT3) / 2;
  const shapeOutline =
    outlinePoints.length >= 3 ? outlinePoints : buildShapeOutline(profile);
  const xs = shapeOutline.map((point) => point.x);
  const zs = shapeOutline.map((point) => point.z);
  const minX = Math.min(...xs) - side;
  const maxX = Math.max(...xs) + side;
  const minZ = Math.min(...zs) - triangleHeight;
  const maxZ = Math.max(...zs) + triangleHeight;

  const minRow = Math.floor(minZ / triangleHeight) - 2;
  const maxRow = Math.ceil(maxZ / triangleHeight) + 2;
  const cells = [];

  for (let row = minRow; row <= maxRow; row += 1) {
    const rowOffset = row % 2 === 0 ? 0 : side / 2;
    const minColumn = Math.floor((minX - rowOffset) / side) - 2;
    const maxColumn = Math.ceil((maxX - rowOffset) / side) + 2;

    for (let column = minColumn; column <= maxColumn; column += 1) {
      const topLeft = getLatticePoint(column, row, side, triangleHeight);
      const topRight = getLatticePoint(column + 1, row, side, triangleHeight);
      const bottomLeft = getLatticePoint(column, row + 1, side, triangleHeight);
      const bottomRight = getLatticePoint(column + 1, row + 1, side, triangleHeight);

      const triangles =
        row % 2 === 0
          ? [
              [topLeft, bottomLeft, bottomRight],
              [topLeft, topRight, bottomRight]
            ]
          : [
              [topLeft, topRight, bottomLeft],
              [topRight, bottomLeft, bottomRight]
            ];

      triangles.forEach((vertices) => {
        const triangle = createTriangleData(vertices, profile);
        const sampleValue = maskSampler
          ? maskSampler(triangle.u, triangle.v)
          : 0;
        const baseInside = isTriangleInsideShape(triangle, shapeOutline);
        const edgeDistance = distanceToPolygonEdge(triangle.centroid, shapeOutline);
        let include = baseInside;

        if (useSketchMask) {
          include = sampleValue > 0.18;
        } else if (localMaskMode && sampleValue > 0.18) {
          if (baseInside) {
            include = edgeDistance > side * 1.05;
          } else {
            include = edgeDistance < side * 1.65;
          }
        }

        if (include) {
          cells.push({
            x: triangle.centroid.x,
            z: triangle.centroid.z,
            rotation: triangle.rotation,
            u: triangle.u,
            v: triangle.v,
            maskValue: sampleValue,
            vertices: triangle.vertices.map((vertex) => ({
              x: vertex.x,
              z: vertex.z
            }))
          });
        }
      });
    }
  }

  return cells;
}

export function createColorDrift(seedX, seedZ) {
  const value = Math.sin(seedX * 12.9898 + seedZ * 78.233) * 43758.5453;
  return value - Math.floor(value);
}
