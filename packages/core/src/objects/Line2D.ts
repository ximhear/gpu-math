import type { GPUState, Vec2 } from '../types.js';
import type { CameraUniformData } from '../camera/Camera2D.js';
import { MathObject } from './MathObject.js';
import { hexToRGBA } from '../math/color.js';
import { buildLineVertices } from '../engine/LineGeometry.js';
import { getLinePipeline } from '../engine/LinePipeline.js';
import { writeBuffer } from '../engine/gpu.js';

export interface LineOptions {
  color?: string;
  lineWidth?: number;
  dash?: [number, number];
  opacity?: number;
  label?: string;
}

export class Line2D extends MathObject {
  private from: Vec2;
  private to: Vec2;
  private options: Required<LineOptions>;
  readonly hasExplicitColor: boolean;
  private gpu: GPUState | null = null;
  private vertexBuffer: GPUBuffer | null = null;
  private cameraBuffer: GPUBuffer | null = null;
  private lineBuffer: GPUBuffer | null = null;
  private bindGroup: GPUBindGroup | null = null;
  private pipeline: GPURenderPipeline | null = null;
  private vertexCount = 0;

  constructor(from: Vec2, to: Vec2, options?: LineOptions) {
    super();
    this.from = from;
    this.to = to;
    this.hasExplicitColor = options?.color !== undefined;
    this.options = {
      color: options?.color ?? '#3b82f6',
      lineWidth: options?.lineWidth ?? 1,
      dash: options?.dash ?? [0, 0],
      opacity: options?.opacity ?? 1,
      label: options?.label ?? '',
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
    const points = [
      { x: this.from[0], y: this.from[1] },
      { x: this.to[0], y: this.to[1] },
    ];
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

  private updateUniforms(): void {
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
  }
}

export function line(from: Vec2, to: Vec2, options?: LineOptions): Line2D {
  return new Line2D(from, to, options);
}
