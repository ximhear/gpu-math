import type { GPUState, Vec2 } from '../types.js';
import type { CameraUniformData } from '../camera/Camera2D.js';
import { MathObject } from './MathObject.js';
import { hexToRGBA } from '../math/color.js';
import { writeBuffer } from '../engine/gpu.js';
import scatterShaderSource from '../shaders/scatter.wgsl';

export interface ScatterOptions {
  color?: string;
  size?: number;
  opacity?: number;
  label?: string;
}

export class Scatter2D extends MathObject {
  private points: Vec2[];
  private options: Required<ScatterOptions>;
  readonly hasExplicitColor: boolean;
  private gpu: GPUState | null = null;
  private pipeline: GPURenderPipeline | null = null;
  private instanceBuffer: GPUBuffer | null = null;
  private cameraBuffer: GPUBuffer | null = null;
  private scatterBuffer: GPUBuffer | null = null;
  private bindGroup: GPUBindGroup | null = null;
  private instanceCount = 0;

  get label() { return this.options.label; }
  get color() { return this.options.color; }
  setColor(c: string) { this.options.color = c; this.writeUniforms(); }

  constructor(points: Vec2[], options?: ScatterOptions) {
    super();
    this.points = points;
    this.hasExplicitColor = options?.color !== undefined;
    this.options = {
      color: options?.color ?? '#3b82f6',
      size: options?.size ?? 4,
      opacity: options?.opacity ?? 0.8,
      label: options?.label ?? '',
    };
  }

  init(gpu: GPUState): void {
    this.gpu = gpu;
    const { device, format } = gpu;

    this.cameraBuffer = device.createBuffer({ size: 256, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.scatterBuffer = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

    const shaderModule = device.createShaderModule({ code: scatterShaderSource });

    const bindGroupLayout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' as GPUBufferBindingType } },
        { binding: 1, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' as GPUBufferBindingType } },
      ],
    });

    this.bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.cameraBuffer } },
        { binding: 1, resource: { buffer: this.scatterBuffer } },
      ],
    });

    this.pipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
        buffers: [{
          arrayStride: 2 * 4,
          stepMode: 'instance' as GPUVertexStepMode,
          attributes: [
            { shaderLocation: 0, offset: 0, format: 'float32x2' as GPUVertexFormat },
          ],
        }],
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fs_main',
        targets: [{
          format,
          blend: {
            color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
            alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          },
        }],
      },
      depthStencil: { format: 'depth24plus', depthWriteEnabled: false, depthCompare: 'always' },
      primitive: { topology: 'triangle-list' },
    });

    this.buildInstances();
    this.writeUniforms();
  }

  private buildInstances(): void {
    if (!this.gpu) return;
    const data = new Float32Array(this.points.length * 2);
    for (let i = 0; i < this.points.length; i++) {
      data[i * 2] = this.points[i][0];
      data[i * 2 + 1] = this.points[i][1];
    }
    this.instanceCount = this.points.length;

    if (this.instanceBuffer) this.instanceBuffer.destroy();
    this.instanceBuffer = this.gpu.device.createBuffer({
      size: Math.max(data.byteLength, 8),
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    writeBuffer(this.gpu.device.queue, this.instanceBuffer, 0, data);
  }

  private writeUniforms(): void {
    if (!this.gpu || !this.scatterBuffer) return;
    const [r, g, b] = hexToRGBA(this.options.color);
    writeBuffer(this.gpu.device.queue, this.scatterBuffer, 0, new Float32Array([
      r, g, b, this.options.opacity,
      this.options.size, 0, 0, 0,
    ]));
  }

  render(pass: GPURenderPassEncoder, camera: CameraUniformData): void {
    if (!this.pipeline || !this.bindGroup || !this.instanceBuffer || this.instanceCount === 0) return;
    const camData = new Float32Array(36);
    camData.set(camera.viewProjection, 0); camData.set(camera.invViewProjection, 16);
    camData[32] = camera.resolution[0]; camData[33] = camera.resolution[1]; camData[34] = camera.pixelRatio;
    writeBuffer(this.gpu!.device.queue, this.cameraBuffer!, 0, camData);

    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.setVertexBuffer(0, this.instanceBuffer);
    pass.draw(6, this.instanceCount); // 6 vertices per quad, N instances
  }

  destroy(): void {
    this.instanceBuffer?.destroy(); this.cameraBuffer?.destroy(); this.scatterBuffer?.destroy();
  }
}

export function scatter(points: Vec2[], options?: ScatterOptions): Scatter2D {
  return new Scatter2D(points, options);
}
