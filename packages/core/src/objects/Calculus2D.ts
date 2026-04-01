import type { GPUState, Vec2 } from '../types.js';
import type { CameraUniformData } from '../camera/Camera2D.js';
import { MathObject } from './MathObject.js';
import { hexToRGBA } from '../math/color.js';
import { buildLineVertices, type LinePoint } from '../engine/LineGeometry.js';
import { getLinePipeline } from '../engine/LinePipeline.js';
import { writeBuffer } from '../engine/gpu.js';
import type { Plot2D } from './Plot2D.js';

// === Tangent Line ===

export interface TangentLineOptions {
  at: number;
  color?: string;
  lineWidth?: number;
  length?: number;
  label?: string;
}

export class TangentLine2D extends MathObject {
  private plotRef: Plot2D;
  private options: Required<TangentLineOptions>;
  readonly hasExplicitColor: boolean;
  private gpu: GPUState | null = null;
  private vertexBuffer: GPUBuffer | null = null;
  private cameraBuffer: GPUBuffer | null = null;
  private lineBuffer: GPUBuffer | null = null;
  private bindGroup: GPUBindGroup | null = null;
  private pipeline: GPURenderPipeline | null = null;
  private vertexCount = 0;

  get label() { return this.options.label; }
  get color() { return this.options.color; }
  setColor(c: string) { this.options.color = c; this.updateUniforms(); }

  constructor(plotRef: Plot2D, options: TangentLineOptions) {
    super();
    this.plotRef = plotRef;
    this.hasExplicitColor = options.color !== undefined;
    this.options = {
      at: options.at,
      color: options.color ?? '#ef4444',
      lineWidth: options.lineWidth ?? 2,
      length: options.length ?? 4,
      label: options.label ?? '',
    };
  }

  getParam(name: string): number { return name === 'at' ? this.options.at : 0; }
  setParam(name: string, value: number): void {
    if (name === 'at') { this.options.at = value; this.rebuildGeometry(); }
  }

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
    this.rebuildGeometry();
    this.updateUniforms();
  }

  private rebuildGeometry(): void {
    if (!this.gpu) return;
    const x0 = this.options.at;
    const fn = this.plotRef.currentFn;
    const y0 = fn(x0);
    const h = 1e-6;
    const slope = (fn(x0 + h) - fn(x0 - h)) / (2 * h);
    const half = this.options.length / 2;

    const points: LinePoint[] = [
      { x: x0 - half, y: y0 - slope * half },
      { x: x0 + half, y: y0 + slope * half },
    ];

    const { data, vertexCount } = buildLineVertices(points, null);
    this.vertexCount = vertexCount;
    if (this.vertexBuffer) this.vertexBuffer.destroy();
    if (vertexCount === 0) return;
    this.vertexBuffer = this.gpu.device.createBuffer({ size: data.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    writeBuffer(this.gpu.device.queue, this.vertexBuffer, 0, data);
  }

  private updateUniforms(): void {
    if (!this.gpu || !this.lineBuffer) return;
    const [r, g, b] = hexToRGBA(this.options.color);
    writeBuffer(this.gpu.device.queue, this.lineBuffer, 0, new Float32Array([r, g, b, 1, this.options.lineWidth, 0, 0, 0]));
  }

  render(pass: GPURenderPassEncoder, camera: CameraUniformData): void {
    if (!this.pipeline || !this.bindGroup || !this.vertexBuffer || this.vertexCount === 0) return;
    const camData = new Float32Array(36);
    camData.set(camera.viewProjection, 0); camData.set(camera.invViewProjection, 16);
    camData[32] = camera.resolution[0]; camData[33] = camera.resolution[1]; camData[34] = camera.pixelRatio;
    writeBuffer(this.gpu!.device.queue, this.cameraBuffer!, 0, camData);
    pass.setPipeline(this.pipeline); pass.setBindGroup(0, this.bindGroup);
    pass.setVertexBuffer(0, this.vertexBuffer); pass.draw(this.vertexCount);
  }

  destroy(): void { this.vertexBuffer?.destroy(); this.cameraBuffer?.destroy(); this.lineBuffer?.destroy(); }
}

export function tangentLine(plotRef: Plot2D, options: TangentLineOptions): TangentLine2D {
  return new TangentLine2D(plotRef, options);
}

// === Riemann Sum ===

export interface RiemannSumOptions {
  from: number;
  to: number;
  n?: number;
  method?: 'left' | 'right' | 'midpoint';
  color?: string;
  opacity?: number;
  label?: string;
}

export class RiemannSum2D extends MathObject {
  private plotRef: Plot2D;
  private options: Required<RiemannSumOptions>;
  readonly hasExplicitColor: boolean;
  private gpu: GPUState | null = null;
  private vertexBuffer: GPUBuffer | null = null;
  private cameraBuffer: GPUBuffer | null = null;
  private lineBuffer: GPUBuffer | null = null;
  private bindGroup: GPUBindGroup | null = null;
  private pipeline: GPURenderPipeline | null = null;
  private vertexCount = 0;

  get label() { return this.options.label; }
  get color() { return this.options.color; }
  setColor(c: string) { this.options.color = c; this.updateUniforms(); }

  constructor(plotRef: Plot2D, options: RiemannSumOptions) {
    super();
    this.plotRef = plotRef;
    this.hasExplicitColor = options.color !== undefined;
    this.options = {
      from: options.from,
      to: options.to,
      n: options.n ?? 10,
      method: options.method ?? 'left',
      color: options.color ?? '#3b82f6',
      opacity: options.opacity ?? 0.3,
      label: options.label ?? '',
    };
  }

  getParam(name: string): number {
    if (name === 'n') return this.options.n;
    return 0;
  }

  setParam(name: string, value: number): void {
    if (name === 'n') { this.options.n = Math.max(1, Math.round(value)); this.rebuildGeometry(); }
  }

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
    this.rebuildGeometry();
    this.updateUniforms();
  }

  private rebuildGeometry(): void {
    if (!this.gpu) return;
    const { from, to, n, method } = this.options;
    const fn = this.plotRef.currentFn;
    const dx = (to - from) / n;

    const segments: LinePoint[][] = [];

    for (let i = 0; i < n; i++) {
      const xLeft = from + i * dx;
      const xRight = xLeft + dx;
      let sampleX: number;
      if (method === 'left') sampleX = xLeft;
      else if (method === 'right') sampleX = xRight;
      else sampleX = (xLeft + xRight) / 2;

      const h = fn(sampleX);
      if (!isFinite(h)) continue;

      // Rectangle outline: bottom-left → top-left → top-right → bottom-right → bottom-left
      segments.push([
        { x: xLeft, y: 0 },
        { x: xLeft, y: h },
        { x: xRight, y: h },
        { x: xRight, y: 0 },
        { x: xLeft, y: 0 },
      ]);
    }

    const parts = segments.map(s => buildLineVertices(s, null));
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

  private updateUniforms(): void {
    if (!this.gpu || !this.lineBuffer) return;
    const [r, g, b] = hexToRGBA(this.options.color);
    writeBuffer(this.gpu.device.queue, this.lineBuffer, 0, new Float32Array([r, g, b, this.options.opacity, 1.5, 0, 0, 0]));
  }

  render(pass: GPURenderPassEncoder, camera: CameraUniformData): void {
    if (!this.pipeline || !this.bindGroup || !this.vertexBuffer || this.vertexCount === 0) return;
    const camData = new Float32Array(36);
    camData.set(camera.viewProjection, 0); camData.set(camera.invViewProjection, 16);
    camData[32] = camera.resolution[0]; camData[33] = camera.resolution[1]; camData[34] = camera.pixelRatio;
    writeBuffer(this.gpu!.device.queue, this.cameraBuffer!, 0, camData);
    pass.setPipeline(this.pipeline); pass.setBindGroup(0, this.bindGroup);
    pass.setVertexBuffer(0, this.vertexBuffer); pass.draw(this.vertexCount);
  }

  destroy(): void { this.vertexBuffer?.destroy(); this.cameraBuffer?.destroy(); this.lineBuffer?.destroy(); }
}

export function riemannSum(plotRef: Plot2D, options: RiemannSumOptions): RiemannSum2D {
  return new RiemannSum2D(plotRef, options);
}
