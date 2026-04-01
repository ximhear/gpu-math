import type { GPUState, Vec2 } from '../types.js';
import type { CameraUniformData } from '../camera/Camera2D.js';
import { MathObject } from './MathObject.js';
import { hexToRGBA } from '../math/color.js';
import { buildLineVertices } from '../engine/LineGeometry.js';
import { getLinePipeline } from '../engine/LinePipeline.js';
import { writeBuffer } from '../engine/gpu.js';

export interface ParametricOptions {
  t?: [number, number];
  color?: string;
  lineWidth?: number;
  dash?: [number, number];
  opacity?: number;
  label?: string;
  samples?: number;
}

const DEFAULT_COLOR = '#3b82f6';

export class Parametric2D extends MathObject {
  private fn: (t: number) => Vec2;
  private options: Required<ParametricOptions>;
  readonly hasExplicitColor: boolean;
  private gpu: GPUState | null = null;
  private vertexBuffer: GPUBuffer | null = null;
  private cameraBuffer: GPUBuffer | null = null;
  private lineBuffer: GPUBuffer | null = null;
  private bindGroup: GPUBindGroup | null = null;
  private pipeline: GPURenderPipeline | null = null;
  private vertexCount = 0;

  constructor(fn: (t: number) => Vec2, options?: ParametricOptions) {
    super();
    this.fn = fn;
    this.hasExplicitColor = options?.color !== undefined;
    this.options = {
      t: options?.t ?? [0, 2 * Math.PI],
      color: options?.color ?? DEFAULT_COLOR,
      lineWidth: options?.lineWidth ?? 2,
      dash: options?.dash ?? [0, 0],
      opacity: options?.opacity ?? 1,
      label: options?.label ?? '',
      samples: options?.samples ?? 256,
    };
  }

  get label(): string { return this.options.label; }
  get color(): string { return this.options.color; }

  setColor(c: string): void {
    this.options.color = c;
    this.updateLineUniforms();
  }

  init(gpu: GPUState): void {
    this.gpu = gpu;
    const { device } = gpu;

    this.cameraBuffer = device.createBuffer({
      size: 256,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.lineBuffer = device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

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
    this.updateLineUniforms();
  }

  private updateGeometry(): void {
    if (!this.gpu) return;
    const [tMin, tMax] = this.options.t;
    const N = this.options.samples;
    const dt = (tMax - tMin) / (N - 1);

    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < N; i++) {
      const t = tMin + i * dt;
      const [x, y] = this.fn(t);
      if (isFinite(x) && isFinite(y)) {
        points.push({ x, y });
      }
    }

    const { data, vertexCount } = buildLineVertices(points, null);
    this.vertexCount = vertexCount;
    if (vertexCount === 0) return;

    if (this.vertexBuffer) this.vertexBuffer.destroy();
    this.vertexBuffer = this.gpu.device.createBuffer({
      size: data.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    writeBuffer(this.gpu.device.queue, this.vertexBuffer, 0, data);
  }

  private updateLineUniforms(): void {
    if (!this.gpu || !this.lineBuffer) return;
    const [r, g, b] = hexToRGBA(this.options.color);
    const [dashOn, dashOff] = this.options.dash;
    const dashLength = dashOn + dashOff;
    const dashRatio = dashLength > 0 ? dashOn / dashLength : 0;
    const data = new Float32Array([
      r, g, b, this.options.opacity,
      this.options.lineWidth, dashLength, dashRatio, 0,
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
    this.vertexBuffer = null;
    this.cameraBuffer = null;
    this.lineBuffer = null;
  }
}

export function parametric(fn: (t: number) => Vec2, options?: ParametricOptions): Parametric2D {
  return new Parametric2D(fn, options);
}
