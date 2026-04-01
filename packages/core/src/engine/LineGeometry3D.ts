// 3D line vertex layout: posA(3) + posB(3) + uv(2) + along(1) + pad(1) = 10 floats
export const LINE3D_VERTEX_STRIDE = 10 * 4; // 40 bytes
export const LINE3D_VERTEX_ATTRIBUTES: GPUVertexAttribute[] = [
  { shaderLocation: 0, offset: 0, format: 'float32x3' as GPUVertexFormat },   // posA
  { shaderLocation: 1, offset: 12, format: 'float32x3' as GPUVertexFormat },  // posB
  { shaderLocation: 2, offset: 24, format: 'float32x2' as GPUVertexFormat },  // uv
  { shaderLocation: 3, offset: 32, format: 'float32' as GPUVertexFormat },    // along
];

export interface LinePoint3D {
  x: number;
  y: number;
  z: number;
}

export function buildLineVertices3D(
  points: LinePoint3D[],
): { data: Float32Array; vertexCount: number } {
  if (points.length < 2) return { data: new Float32Array(0), vertexCount: 0 };

  const segCount = points.length - 1;
  const floatsPerVertex = 10;
  const verticesPerSeg = 6;
  const data = new Float32Array(segCount * verticesPerSeg * floatsPerVertex);

  const uvs: [number, number][] = [
    [0, -1], [1, -1], [0, 1],
    [0, 1],  [1, -1], [1, 1],
  ];

  const cumulDist = new Float32Array(points.length);
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const dz = points[i].z - points[i - 1].z;
    cumulDist[i] = cumulDist[i - 1] + Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  let offset = 0;
  for (let i = 0; i < segCount; i++) {
    const a = points[i], b = points[i + 1];
    for (const [u, v] of uvs) {
      data[offset++] = a.x; data[offset++] = a.y; data[offset++] = a.z;
      data[offset++] = b.x; data[offset++] = b.y; data[offset++] = b.z;
      data[offset++] = u; data[offset++] = v;
      data[offset++] = cumulDist[i];
      data[offset++] = 0; // pad
    }
  }

  return { data, vertexCount: segCount * verticesPerSeg };
}
