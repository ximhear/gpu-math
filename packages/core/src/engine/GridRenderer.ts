import type { GPUState, Theme } from '../types.js';
import type { CameraUniformData } from '../camera/Camera2D.js';
import { hexToRGBA } from '../math/color.js';
import gridShaderSource from '../shaders/grid.wgsl';
import { writeBuffer } from './gpu.js';

export class GridRenderer {
  private gpu: GPUState;
  private pipeline: GPURenderPipeline | null = null;
  private cameraBuffer: GPUBuffer;
  private gridBuffer: GPUBuffer;
  private bindGroup: GPUBindGroup | null = null;

  constructor(gpu: GPUState) {
    this.gpu = gpu;
    const { device } = gpu;

    this.cameraBuffer = device.createBuffer({
      size: 256, // 2 mat4 + vec2 + 2 floats, padded
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.gridBuffer = device.createBuffer({
      size: 96, // 4 vec4 + 2 floats + padding
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.initPipeline();
    this.writeGridDefaults();
  }

  private initPipeline(): void {
    const { device, format } = this.gpu;

    const shaderModule = device.createShaderModule({
      code: gridShaderSource,
    });

    const bindGroupLayout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' as GPUBufferBindingType } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' as GPUBufferBindingType } },
      ],
    });

    this.bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.cameraBuffer } },
        { binding: 1, resource: { buffer: this.gridBuffer } },
      ],
    });

    const pipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    });

    this.pipeline = device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fs_main',
        targets: [{ format }],
      },
      depthStencil: {
        format: 'depth24plus',
        depthWriteEnabled: false,
        depthCompare: 'always',
      },
      primitive: {
        topology: 'triangle-list',
      },
    });
  }

  private writeGridDefaults(): void {
    this.applyTheme({
      background: '#1c1c1c',
      grid: { color: '#333333', majorColor: '#555555' },
      axis: { color: '#ffffff', labelColor: '#aaaaaa' },
      palette: [],
      font: { family: 'system-ui', size: 14 },
    });
  }

  applyTheme(theme: Theme): void {
    const bg = hexToRGBA(theme.background);
    const gc = hexToRGBA(theme.grid.color);
    const gm = hexToRGBA(theme.grid.majorColor);
    const ac = hexToRGBA(theme.axis.color);
    const data = new Float32Array([
      ...bg, ...gc, ...gm, ...ac,
      1.0, 5.0, 0.0, 0.0,
    ]);
    writeBuffer(this.gpu.device.queue, this.gridBuffer, 0, data);
  }

  getClearColor(theme: Theme): { r: number; g: number; b: number; a: number } {
    const [r, g, b, a] = hexToRGBA(theme.background);
    return { r, g, b, a };
  }

  render(pass: GPURenderPassEncoder, cameraData: CameraUniformData): void {
    if (!this.pipeline || !this.bindGroup) return;

    // Write camera uniforms
    const camData = new Float32Array(36); // 16 + 16 + 2 + 1 + 1 = 36
    camData.set(cameraData.viewProjection, 0);
    camData.set(cameraData.invViewProjection, 16);
    camData[32] = cameraData.resolution[0];
    camData[33] = cameraData.resolution[1];
    camData[34] = cameraData.pixelRatio;
    camData[35] = 0; // pad
    writeBuffer(this.gpu.device.queue, this.cameraBuffer, 0, camData);

    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.draw(6);
  }

  destroy(): void {
    this.cameraBuffer.destroy();
    this.gridBuffer.destroy();
  }
}
