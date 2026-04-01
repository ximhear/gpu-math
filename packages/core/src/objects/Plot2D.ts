import type { GPUState, PlotOptions } from '../types.js';
import type { CameraUniformData } from '../camera/Camera2D.js';
import { MathObject } from './MathObject.js';
import { hexToRGBA } from '../math/color.js';
import { adaptiveSample } from '../math/Sampling.js';
import { buildLineVertices } from '../engine/LineGeometry.js';
import { getLinePipeline } from '../engine/LinePipeline.js';
import { writeBuffer } from '../engine/gpu.js';

const DEFAULT_COLOR = '#3b82f6';
const DEFAULT_LINE_WIDTH = 2;

export class Plot2D extends MathObject {
  private fn: (x: number) => number;
  private userFn: ((x: number, params: Record<string, number>) => number) | null = null;
  private params: Record<string, number> = {};
  private options: Required<PlotOptions>;
  readonly hasExplicitColor: boolean;
  private gpu: GPUState | null = null;
  private vertexBuffer: GPUBuffer | null = null;
  private cameraBuffer: GPUBuffer | null = null;
  private lineBuffer: GPUBuffer | null = null;
  private bindGroup: GPUBindGroup | null = null;
  private pipeline: GPURenderPipeline | null = null;
  private vertexCount = 0;

  constructor(fn: ((x: number) => number) | ((x: number, params: Record<string, number>) => number), options?: PlotOptions) {
    super();
    this.hasExplicitColor = options?.color !== undefined;
    this.params = { ...(options?.params ?? {}) };

    if (options?.params) {
      this.userFn = fn as (x: number, params: Record<string, number>) => number;
      this.fn = (x: number) => this.userFn!(x, this.params);
    } else {
      this.fn = fn as (x: number) => number;
    }

    this.options = {
      range: options?.range ?? [-10, 10],
      color: options?.color ?? DEFAULT_COLOR,
      lineWidth: options?.lineWidth ?? DEFAULT_LINE_WIDTH,
      dash: options?.dash ?? [0, 0],
      opacity: options?.opacity ?? 1,
      label: options?.label ?? '',
      samples: options?.samples ?? 512,
      params: this.params,
    };
  }

  get label(): string { return this.options.label; }
  get color(): string { return this.options.color; }

  /** Current function — used by morph animation */
  get currentFn(): (x: number) => number { return this.fn; }

  setFn(fn: (x: number) => number): void {
    this.fn = fn;
    this.updateGeometry();
  }

  getParam(name: string): number {
    return this.params[name] ?? 0;
  }

  setParam(name: string, value: number): void {
    this.params[name] = value;
    this.updateGeometry();
  }

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

    const points = adaptiveSample(this.fn, this.options.range);
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

export function plot(fn: (x: number) => number, options?: PlotOptions): Plot2D {
  return new Plot2D(fn, options);
}
