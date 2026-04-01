import type { GPUState } from '../types.js';
import type { CameraUniformData } from '../camera/Camera2D.js';
import { MathObject } from './MathObject.js';
import { hexToRGBA } from '../math/color.js';
import { getFillPipeline } from '../engine/FillPipeline.js';
import { writeBuffer } from '../engine/gpu.js';

export interface RegionOptions {
  above?: (x: number) => number;  // lower bound function (default: -Infinity visual)
  below?: (x: number) => number;  // upper bound function (default: +Infinity visual)
  range?: [number, number];
  color?: string;
  opacity?: number;
  label?: string;
}

export class Region2D extends MathObject {
  private options: Required<RegionOptions>;
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

  constructor(options: RegionOptions) {
    super();
    this.hasExplicitColor = options.color !== undefined;
    this.options = {
      above: options.above ?? (() => -100),
      below: options.below ?? (() => 100),
      range: options.range ?? [-10, 10],
      color: options.color ?? '#3b82f6',
      opacity: options.opacity ?? 0.2,
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
    const { above, below, range } = this.options;
    const [xMin, xMax] = range;
    const N = 200;
    const dx = (xMax - xMin) / N;

    const triangles: number[] = [];
    for (let i = 0; i < N; i++) {
      const x0 = xMin + i * dx;
      const x1 = x0 + dx;
      const lo0 = above(x0), hi0 = below(x0);
      const lo1 = above(x1), hi1 = below(x1);

      if (!isFinite(lo0) || !isFinite(hi0) || !isFinite(lo1) || !isFinite(hi1)) continue;
      if (hi0 <= lo0 && hi1 <= lo1) continue;

      triangles.push(x0, lo0, x0, hi0, x1, hi1);
      triangles.push(x0, lo0, x1, hi1, x1, lo1);
    }

    const data = new Float32Array(triangles);
    this.vertexCount = data.length / 2;
    if (this.vertexCount === 0) return;

    if (this.vertexBuffer) this.vertexBuffer.destroy();
    this.vertexBuffer = this.gpu.device.createBuffer({ size: data.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
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
    camData[32] = camera.resolution[0]; camData[33] = camera.resolution[1]; camData[34] = camera.pixelRatio;
    writeBuffer(this.gpu!.device.queue, this.cameraBuffer!, 0, camData);
    pass.setPipeline(this.pipeline); pass.setBindGroup(0, this.bindGroup);
    pass.setVertexBuffer(0, this.vertexBuffer); pass.draw(this.vertexCount);
  }

  destroy(): void { this.vertexBuffer?.destroy(); this.cameraBuffer?.destroy(); this.fillBuffer?.destroy(); }
}

export function region(options: RegionOptions): Region2D {
  return new Region2D(options);
}
