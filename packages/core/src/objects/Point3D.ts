import type { GPUState, Vec3 } from '../types.js';
import type { Camera3DUniformData } from '../camera/Camera3D.js';
import { MathObject3D } from './MathObject3D.js';
import { hexToRGBA } from '../math/color.js';
import { writeCamera3DUniforms, CAMERA3D_BUFFER_SIZE } from '../engine/camera3dBuffer.js';
import { writeBuffer } from '../engine/gpu.js';
import point3dShaderSource from '../shaders/point3d.wgsl';

export interface Point3DOptions {
  color?: string;
  size?: number;
  label?: string;
  opacity?: number;
}

export class Point3D extends MathObject3D {
  private pos: Vec3;
  private options: Required<Point3DOptions>;
  private gpu: GPUState | null = null;
  private pipeline: GPURenderPipeline | null = null;
  private cameraBuffer: GPUBuffer | null = null;
  private pointBuffer: GPUBuffer | null = null;
  private bindGroup: GPUBindGroup | null = null;

  get label() { return this.options.label; }
  get color() { return this.options.color; }

  constructor(pos: Vec3, options?: Point3DOptions) {
    super();
    this.pos = pos;
    this.options = {
      color: options?.color ?? '#ffffff',
      size: options?.size ?? 6,
      label: options?.label ?? '',
      opacity: options?.opacity ?? 1,
    };
  }

  init(gpu: GPUState): void {
    this.gpu = gpu;
    const { device, format } = gpu;
    this.cameraBuffer = device.createBuffer({ size: CAMERA3D_BUFFER_SIZE, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.pointBuffer = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

    const shaderModule = device.createShaderModule({ code: point3dShaderSource });
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
      depthStencil: { format: 'depth24plus', depthWriteEnabled: false, depthCompare: 'less' },
      primitive: { topology: 'triangle-list' },
    });
    this.writePointUniforms();
  }

  private writePointUniforms(): void {
    if (!this.gpu || !this.pointBuffer) return;
    const [r, g, b] = hexToRGBA(this.options.color);
    writeBuffer(this.gpu.device.queue, this.pointBuffer, 0, new Float32Array([
      r, g, b, this.options.opacity,
      this.pos[0], this.pos[1], this.pos[2], this.options.size,
    ]));
  }

  render(pass: GPURenderPassEncoder, camera: Camera3DUniformData): void {
    if (!this.pipeline || !this.bindGroup) return;
    writeCamera3DUniforms(this.gpu!.device.queue, this.cameraBuffer!, camera);
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.draw(6);
  }

  destroy(): void {
    this.cameraBuffer?.destroy(); this.pointBuffer?.destroy();
  }
}
