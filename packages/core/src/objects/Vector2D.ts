import type { GPUState, Vec2 } from '../types.js';
import type { CameraUniformData } from '../camera/Camera2D.js';
import { MathObject } from './MathObject.js';
import { hexToRGBA } from '../math/color.js';
import { buildLineVertices } from '../engine/LineGeometry.js';
import { getLinePipeline } from '../engine/LinePipeline.js';
import { writeBuffer } from '../engine/gpu.js';

export interface VectorOptions {
  color?: string;
  lineWidth?: number;
  headSize?: number;
  label?: string;
  opacity?: number;
}

export class Vector2D extends MathObject {
  private from: Vec2;
  private to: Vec2;
  private options: Required<VectorOptions>;
  readonly hasExplicitColor: boolean;
  private gpu: GPUState | null = null;
  private vertexBuffer: GPUBuffer | null = null;
  private cameraBuffer: GPUBuffer | null = null;
  private lineBuffer: GPUBuffer | null = null;
  private bindGroup: GPUBindGroup | null = null;
  private pipeline: GPURenderPipeline | null = null;
  private vertexCount = 0;

  constructor(from: Vec2, to: Vec2, options?: VectorOptions) {
    super();
    this.from = from;
    this.to = to;
    this.hasExplicitColor = options?.color !== undefined;
    this.options = {
      color: options?.color ?? '#3b82f6',
      lineWidth: options?.lineWidth ?? 2,
      headSize: options?.headSize ?? 0.15,
      label: options?.label ?? '',
      opacity: options?.opacity ?? 1,
    };
  }

  get label(): string { return this.options.label; }
  get color(): string { return this.options.color; }
  setColor(c: string): void { this.options.color = c; this.updateUniforms(); }

  init(gpu: GPUState): void {
    this.gpu = gpu;
    const { device } = gpu;

    this.cameraBuffer = device.createBuffer({ size: 256, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.lineBuffer = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

    const { pipeline, bindGroupLayout } = getLinePipeline(gpu);
    this.pipeline = pipeline;

    this.bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.cameraBuffer } },
        { binding: 1, resource: { buffer: this.lineBuffer } },
      ],
    });

    this.updateGeometry();
    this.updateUniforms();
  }

  private updateGeometry(): void {
    if (!this.gpu) return;

    const [fx, fy] = this.from;
    const [tx, ty] = this.to;
    const dx = tx - fx;
    const dy = ty - fy;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1e-10) { this.vertexCount = 0; return; }

    const ux = dx / len;
    const uy = dy / len;
    const hs = this.options.headSize;

    // Arrow shaft (from → to minus head)
    const shaftEnd = [tx - ux * hs, ty - uy * hs] as const;
    // Arrow head: two barbs
    const perpX = -uy;
    const perpY = ux;
    const barb1 = [shaftEnd[0] + perpX * hs * 0.4, shaftEnd[1] + perpY * hs * 0.4] as const;
    const barb2 = [shaftEnd[0] - perpX * hs * 0.4, shaftEnd[1] - perpY * hs * 0.4] as const;

    const points = [
      // Shaft
      { x: fx, y: fy },
      { x: shaftEnd[0], y: shaftEnd[1] },
      // Head — left barb
      { x: barb1[0], y: barb1[1] },
      { x: tx, y: ty },
      // Head — right barb (break to avoid connecting)
      { x: tx, y: ty },
      { x: barb2[0], y: barb2[1] },
    ];

    // Build shaft + head lines separately then concatenate
    const shaft = [points[0], points[1]];
    const headL = [points[2], points[3]];
    const headR = [points[4], points[5]];

    const s = buildLineVertices(shaft, null);
    const hl = buildLineVertices(headL, null);
    const hr = buildLineVertices(headR, null);

    const total = s.data.length + hl.data.length + hr.data.length;
    const combined = new Float32Array(total);
    combined.set(s.data, 0);
    combined.set(hl.data, s.data.length);
    combined.set(hr.data, s.data.length + hl.data.length);

    this.vertexCount = s.vertexCount + hl.vertexCount + hr.vertexCount;

    if (this.vertexBuffer) this.vertexBuffer.destroy();
    this.vertexBuffer = this.gpu.device.createBuffer({
      size: combined.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    writeBuffer(this.gpu.device.queue, this.vertexBuffer, 0, combined);
  }

  private updateUniforms(): void {
    if (!this.gpu || !this.lineBuffer) return;
    const [r, g, b] = hexToRGBA(this.options.color);
    const data = new Float32Array([
      r, g, b, this.options.opacity,
      this.options.lineWidth, 0, 0, 0,
    ]);
    writeBuffer(this.gpu.device.queue, this.lineBuffer, 0, data);
  }

  render(pass: GPURenderPassEncoder, camera: CameraUniformData): void {
    if (!this.pipeline || !this.bindGroup || !this.vertexBuffer || this.vertexCount === 0) return;

    const camData = new Float32Array(36);
    camData.set(camera.viewProjection, 0);
    camData.set(camera.invViewProjection, 16);
    camData[32] = camera.resolution[0];
    camData[33] = camera.resolution[1];
    camData[34] = camera.pixelRatio;
    writeBuffer(this.gpu!.device.queue, this.cameraBuffer!, 0, camData);

    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.setVertexBuffer(0, this.vertexBuffer);
    pass.draw(this.vertexCount);
  }

  destroy(): void {
    this.vertexBuffer?.destroy();
    this.cameraBuffer?.destroy();
    this.lineBuffer?.destroy();
  }
}

export function vector(from: Vec2, to: Vec2, options?: VectorOptions): Vector2D {
  return new Vector2D(from, to, options);
}
