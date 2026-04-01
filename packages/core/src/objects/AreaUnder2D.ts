import type { GPUState } from '../types.js';
import type { CameraUniformData } from '../camera/Camera2D.js';
import { MathObject } from './MathObject.js';
import { hexToRGBA } from '../math/color.js';
import { getFillPipeline } from '../engine/FillPipeline.js';
import { writeBuffer } from '../engine/gpu.js';
import type { Plot2D } from './Plot2D.js';

export interface AreaUnderOptions {
  from: number;
  to: number;
  color?: string;
  opacity?: number;
  baseline?: number; // y value of baseline (default: 0)
  label?: string;
}

export class AreaUnder2D extends MathObject {
  private plotRef: Plot2D;
  private options: Required<AreaUnderOptions>;
  readonly hasExplicitColor: boolean;
  private gpu: GPUState | null = null;
  private vertexBuffer: GPUBuffer | null = null;
  private cameraBuffer: GPUBuffer | null = null;
  private fillBuffer: GPUBuffer | null = null;
  private bindGroup: GPUBindGroup | null = null;
  private pipeline: GPURenderPipeline | null = null;
  private vertexCount = 0;

  get label() { return this.options.label; }
  get color() { return this.options.color; }
  setColor(c: string) { this.options.color = c; this.writeFillUniforms(); }

  constructor(plotRef: Plot2D, options: AreaUnderOptions) {
    super();
    this.plotRef = plotRef;
    this.hasExplicitColor = options.color !== undefined;
    this.options = {
      from: options.from,
      to: options.to,
      color: options.color ?? '#3b82f6',
      opacity: options.opacity ?? 0.3,
      baseline: options.baseline ?? 0,
      label: options.label ?? '',
    };
  }

  init(gpu: GPUState): void {
    this.gpu = gpu;
    const { device } = gpu;

    this.cameraBuffer = device.createBuffer({ size: 256, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.fillBuffer = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

    const { pipeline, bindGroupLayout } = getFillPipeline(gpu);
    this.pipeline = pipeline;
    this.bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.cameraBuffer } },
        { binding: 1, resource: { buffer: this.fillBuffer } },
      ],
    });

    this.buildGeometry();
    this.writeFillUniforms();
  }

  private buildGeometry(): void {
    if (!this.gpu) return;
    const { from, to, baseline } = this.options;
    const fn = this.plotRef.currentFn;

    // Sample the function
    const N = 200;
    const dx = (to - from) / N;
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i <= N; i++) {
      const x = from + i * dx;
      const y = fn(x);
      if (isFinite(y)) {
        points.push({ x, y });
      }
    }

    if (points.length < 2) { this.vertexCount = 0; return; }

    // Build triangle strip between curve and baseline
    // For each pair of adjacent points, create 2 triangles:
    //   (x0, baseline), (x0, y0), (x1, y1)
    //   (x0, baseline), (x1, y1), (x1, baseline)
    const triangles: number[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i], p1 = points[i + 1];
      // Triangle 1
      triangles.push(p0.x, baseline, p0.x, p0.y, p1.x, p1.y);
      // Triangle 2
      triangles.push(p0.x, baseline, p1.x, p1.y, p1.x, baseline);
    }

    const data = new Float32Array(triangles);
    this.vertexCount = data.length / 2;

    if (this.vertexBuffer) this.vertexBuffer.destroy();
    this.vertexBuffer = this.gpu.device.createBuffer({
      size: data.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    writeBuffer(this.gpu.device.queue, this.vertexBuffer, 0, data);
  }

  private writeFillUniforms(): void {
    if (!this.gpu || !this.fillBuffer) return;
    const [r, g, b] = hexToRGBA(this.options.color);
    writeBuffer(this.gpu.device.queue, this.fillBuffer, 0, new Float32Array([r, g, b, this.options.opacity]));
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
    this.fillBuffer?.destroy();
  }
}

export function areaUnder(plotRef: Plot2D, options: AreaUnderOptions): AreaUnder2D {
  return new AreaUnder2D(plotRef, options);
}
