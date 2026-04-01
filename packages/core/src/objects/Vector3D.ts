import type { GPUState, Vec3 } from '../types.js';
import type { Camera3DUniformData } from '../camera/Camera3D.js';
import { MathObject3D } from './MathObject3D.js';
import { hexToRGBA } from '../math/color.js';
import { buildLineVertices3D } from '../engine/LineGeometry3D.js';
import { getLinePipeline3D } from '../engine/LinePipeline3D.js';
import { writeCamera3DUniforms, CAMERA3D_BUFFER_SIZE } from '../engine/camera3dBuffer.js';
import { writeBuffer } from '../engine/gpu.js';

export interface Vector3DOptions {
  color?: string;
  lineWidth?: number;
  headSize?: number;
  label?: string;
  opacity?: number;
}

export class Vector3D extends MathObject3D {
  private from: Vec3;
  private to: Vec3;
  private options: Required<Vector3DOptions>;
  private gpu: GPUState | null = null;
  private vertexBuffer: GPUBuffer | null = null;
  private cameraBuffer: GPUBuffer | null = null;
  private lineBuffer: GPUBuffer | null = null;
  private bindGroup: GPUBindGroup | null = null;
  private pipeline: GPURenderPipeline | null = null;
  private vertexCount = 0;

  get label() { return this.options.label; }
  get color() { return this.options.color; }

  constructor(from: Vec3, to: Vec3, options?: Vector3DOptions) {
    super();
    this.from = from;
    this.to = to;
    this.options = {
      color: options?.color ?? '#3b82f6',
      lineWidth: options?.lineWidth ?? 2,
      headSize: options?.headSize ?? 0.15,
      label: options?.label ?? '',
      opacity: options?.opacity ?? 1,
    };
  }

  init(gpu: GPUState): void {
    this.gpu = gpu;
    const { device } = gpu;
    this.cameraBuffer = device.createBuffer({ size: CAMERA3D_BUFFER_SIZE, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.lineBuffer = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

    const { pipeline, bindGroupLayout } = getLinePipeline3D(gpu);
    this.pipeline = pipeline;
    this.bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.cameraBuffer } },
        { binding: 1, resource: { buffer: this.lineBuffer } },
      ],
    });
    this.buildGeometry();
    this.writeUniforms();
  }

  private buildGeometry(): void {
    if (!this.gpu) return;
    const [fx, fy, fz] = this.from;
    const [tx, ty, tz] = this.to;
    const dx = tx - fx, dy = ty - fy, dz = tz - fz;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len < 1e-10) { this.vertexCount = 0; return; }

    const ux = dx / len, uy = dy / len, uz = dz / len;
    const hs = this.options.headSize;

    // Cross product to find perpendicular
    const ax = Math.abs(uy) < 0.9 ? 0 : 1;
    const ay = Math.abs(uy) < 0.9 ? 1 : 0;
    const az = 0;
    const p1x = uy * az - uz * ay, p1y = uz * ax - ux * az, p1z = ux * ay - uy * ax;
    const p1l = Math.sqrt(p1x * p1x + p1y * p1y + p1z * p1z) || 1;
    const nx = p1x / p1l, ny = p1y / p1l, nz = p1z / p1l;

    const shaftEnd = { x: tx - ux * hs, y: ty - uy * hs, z: tz - uz * hs };
    const barbW = hs * 0.4;

    const segments = [
      // Shaft
      [{ x: fx, y: fy, z: fz }, shaftEnd],
      // Barb 1
      [{ x: shaftEnd.x + nx * barbW, y: shaftEnd.y + ny * barbW, z: shaftEnd.z + nz * barbW }, { x: tx, y: ty, z: tz }],
      // Barb 2
      [{ x: shaftEnd.x - nx * barbW, y: shaftEnd.y - ny * barbW, z: shaftEnd.z - nz * barbW }, { x: tx, y: ty, z: tz }],
    ];

    const parts = segments.map(s => buildLineVertices3D(s));
    let totalVerts = 0, totalFloats = 0;
    for (const p of parts) { totalVerts += p.vertexCount; totalFloats += p.data.length; }
    this.vertexCount = totalVerts;
    if (totalVerts === 0) return;

    const combined = new Float32Array(totalFloats);
    let off = 0;
    for (const p of parts) { combined.set(p.data, off); off += p.data.length; }

    if (this.vertexBuffer) this.vertexBuffer.destroy();
    this.vertexBuffer = this.gpu.device.createBuffer({ size: combined.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    writeBuffer(this.gpu.device.queue, this.vertexBuffer, 0, combined);
  }

  private writeUniforms(): void {
    if (!this.gpu || !this.lineBuffer) return;
    const [r, g, b] = hexToRGBA(this.options.color);
    writeBuffer(this.gpu.device.queue, this.lineBuffer, 0, new Float32Array([r, g, b, this.options.opacity, this.options.lineWidth, 0, 0, 0]));
  }

  render(pass: GPURenderPassEncoder, camera: Camera3DUniformData): void {
    if (!this.pipeline || !this.bindGroup || !this.vertexBuffer || this.vertexCount === 0) return;
    writeCamera3DUniforms(this.gpu!.device.queue, this.cameraBuffer!, camera);
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.setVertexBuffer(0, this.vertexBuffer);
    pass.draw(this.vertexCount);
  }

  destroy(): void {
    this.vertexBuffer?.destroy(); this.cameraBuffer?.destroy(); this.lineBuffer?.destroy();
  }
}
