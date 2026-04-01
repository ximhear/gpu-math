import type { GPUState, Vec3 } from '../types.js';
import type { Camera3DUniformData } from '../camera/Camera3D.js';
import { MathObject3D } from './MathObject3D.js';
import { hexToRGBA } from '../math/color.js';
import { buildLineVertices3D } from '../engine/LineGeometry3D.js';
import { getLinePipeline3D } from '../engine/LinePipeline3D.js';
import { writeCamera3DUniforms, CAMERA3D_BUFFER_SIZE } from '../engine/camera3dBuffer.js';
import { writeBuffer } from '../engine/gpu.js';

export interface Parametric3DOptions {
  t?: [number, number];
  color?: string;
  lineWidth?: number;
  opacity?: number;
  label?: string;
  samples?: number;
}

export class Parametric3D extends MathObject3D {
  private fn: (t: number) => Vec3;
  private options: Required<Parametric3DOptions>;
  private gpu: GPUState | null = null;
  private vertexBuffer: GPUBuffer | null = null;
  private cameraBuffer: GPUBuffer | null = null;
  private lineBuffer: GPUBuffer | null = null;
  private bindGroup: GPUBindGroup | null = null;
  private pipeline: GPURenderPipeline | null = null;
  private vertexCount = 0;

  get label() { return this.options.label; }
  get color() { return this.options.color; }

  constructor(fn: (t: number) => Vec3, options?: Parametric3DOptions) {
    super();
    this.fn = fn;
    this.options = {
      t: options?.t ?? [0, 2 * Math.PI],
      color: options?.color ?? '#3b82f6',
      lineWidth: options?.lineWidth ?? 2,
      opacity: options?.opacity ?? 1,
      label: options?.label ?? '',
      samples: options?.samples ?? 512,
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
    const [tMin, tMax] = this.options.t;
    const N = this.options.samples;
    const dt = (tMax - tMin) / (N - 1);
    const points: { x: number; y: number; z: number }[] = [];
    for (let i = 0; i < N; i++) {
      const t = tMin + i * dt;
      const [x, y, z] = this.fn(t);
      if (isFinite(x) && isFinite(y) && isFinite(z)) points.push({ x, y, z });
    }
    const { data, vertexCount } = buildLineVertices3D(points);
    this.vertexCount = vertexCount;
    if (vertexCount === 0) return;
    if (this.vertexBuffer) this.vertexBuffer.destroy();
    this.vertexBuffer = this.gpu.device.createBuffer({ size: data.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    writeBuffer(this.gpu.device.queue, this.vertexBuffer, 0, data);
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
