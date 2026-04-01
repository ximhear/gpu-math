import type { GPUState, Vec2 } from '../types.js';
import type { CameraUniformData } from '../camera/Camera2D.js';
import { MathObject } from './MathObject.js';
import { hexToRGBA } from '../math/color.js';
import pointShaderSource from '../shaders/point.wgsl';
import { writeBuffer } from '../engine/gpu.js';

export interface PointOptions {
  color?: string;
  size?: number;
  label?: string;
  opacity?: number;
  filled?: boolean; // default true. false = open dot (ring)
}

export class Point2D extends MathObject {
  private pos: Vec2;
  private options: Required<PointOptions>;
  readonly hasExplicitColor: boolean;
  private gpu: GPUState | null = null;
  private pipeline: GPURenderPipeline | null = null;
  private cameraBuffer: GPUBuffer | null = null;
  private pointBuffer: GPUBuffer | null = null;
  private bindGroup: GPUBindGroup | null = null;

  constructor(pos: Vec2, options?: PointOptions) {
    super();
    this.pos = pos;
    this.hasExplicitColor = options?.color !== undefined;
    this.options = {
      color: options?.color ?? '#3b82f6',
      size: options?.size ?? 6,
      label: options?.label ?? '',
      opacity: options?.opacity ?? 1,
      filled: options?.filled ?? true,
    };
  }

  get label(): string { return this.options.label; }
  get color(): string { return this.options.color; }
  setColor(c: string): void { this.options.color = c; this.writePointUniforms(); }

  init(gpu: GPUState): void {
    this.gpu = gpu;
    const { device, format } = gpu;

    this.cameraBuffer = device.createBuffer({ size: 256, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.pointBuffer = device.createBuffer({ size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

    const shaderModule = device.createShaderModule({ code: pointShaderSource });

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
        { binding: 1, resource: { buffer: this.pointBuffer } },
      ],
    });

    this.pipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
      vertex: { module: shaderModule, entryPoint: 'vs_main' },
      fragment: {
        module: shaderModule, entryPoint: 'fs_main',
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

    this.writePointUniforms();
  }

  private writePointUniforms(): void {
    if (!this.gpu || !this.pointBuffer) return;
    const [r, g, b] = hexToRGBA(this.options.color);
    const data = new Float32Array([
      r, g, b, this.options.opacity,
      this.pos[0], this.pos[1], this.options.size, this.options.filled ? 1.0 : 0.0,
    ]);
    writeBuffer(this.gpu.device.queue, this.pointBuffer, 0, data);
  }

  render(pass: GPURenderPassEncoder, camera: CameraUniformData): void {
    if (!this.pipeline || !this.bindGroup) return;

    const camData = new Float32Array(36);
    camData.set(camera.viewProjection, 0);
    camData.set(camera.invViewProjection, 16);
    camData[32] = camera.resolution[0];
    camData[33] = camera.resolution[1];
    camData[34] = camera.pixelRatio;
    writeBuffer(this.gpu!.device.queue, this.cameraBuffer!, 0, camData);

    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.draw(6);
  }

  destroy(): void {
    this.cameraBuffer?.destroy();
    this.pointBuffer?.destroy();
  }
}

export function point(pos: Vec2, options?: PointOptions): Point2D {
  return new Point2D(pos, options);
}
