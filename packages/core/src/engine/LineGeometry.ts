import type { CameraUniformData } from '../camera/Camera2D.js';

export interface LinePoint {
  x: number;
  y: number;
}

// Vertex layout: posA(2) + posB(2) + uv(2) + along(1) + pad(1) = 8 floats
export const LINE_VERTEX_STRIDE = 8 * 4; // 32 bytes
export const LINE_VERTEX_ATTRIBUTES: GPUVertexAttribute[] = [
  { shaderLocation: 0, offset: 0, format: 'float32x2' as GPUVertexFormat },   // posA
  { shaderLocation: 1, offset: 8, format: 'float32x2' as GPUVertexFormat },   // posB
  { shaderLocation: 2, offset: 16, format: 'float32x2' as GPUVertexFormat },  // uv
  { shaderLocation: 3, offset: 24, format: 'float32' as GPUVertexFormat },    // along
];

/**
 * Build triangle-list vertex data for thick-line rendering.
 * Returns { data, vertexCount }.
 *
 * Screen-space cumulative distance (`along`) is approximated using
 * the camera's current viewProjection so that dash patterns are stable.
 */
export function buildLineVertices(
  points: LinePoint[],
  camera: CameraUniformData | null,
): { data: Float32Array; vertexCount: number } {
  if (points.length < 2) {
    return { data: new Float32Array(0), vertexCount: 0 };
  }

  const segCount = points.length - 1;
  const floatsPerVertex = 8;
  const verticesPerSeg = 6;
  const data = new Float32Array(segCount * verticesPerSeg * floatsPerVertex);

  const uvs: [number, number][] = [
    [0, -1], [1, -1], [0, 1],
    [0, 1],  [1, -1], [1, 1],
  ];

  // Precompute cumulative screen-space distance for dashing
  const cumulDist = new Float32Array(points.length);
  cumulDist[0] = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    // Use world-space distance as fallback, scaled by a rough factor
    cumulDist[i] = cumulDist[i - 1] + Math.sqrt(dx * dx + dy * dy);
  }

  let offset = 0;
  for (let i = 0; i < segCount; i++) {
    const a = points[i];
    const b = points[i + 1];

    for (const [u, v] of uvs) {
      data[offset++] = a.x;           // posA.x
      data[offset++] = a.y;           // posA.y
      data[offset++] = b.x;           // posB.x
      data[offset++] = b.y;           // posB.y
      data[offset++] = u;             // uv.x
      data[offset++] = v;             // uv.y
      data[offset++] = cumulDist[i];  // along (at point A)
      data[offset++] = 0;             // pad
    }
  }

  return { data, vertexCount: segCount * verticesPerSeg };
}
