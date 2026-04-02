import type { GPUState, Vec2 } from '../types.js';
import type { CameraUniformData } from '../camera/Camera2D.js';
import { writeBuffer } from './gpu.js';
import textShaderSource from '../shaders/text.wgsl';

export interface TextEntry {
  text: string;
  worldPos: Vec2;
  color: string;
  fontSize: number;
  fontStyle: 'normal' | 'italic';
  fontFamily: string;
  offset: Vec2;
}

interface TextQuad {
  texture: GPUTexture;
  bindGroup: GPUBindGroup;
  uniformBuffer: GPUBuffer;
  texWidth: number;
  texHeight: number;
  entry: TextEntry;
}

export class TextRenderer {
  private gpu: GPUState;
  private pipeline: GPURenderPipeline;
  private bindGroupLayout: GPUBindGroupLayout;
  private cameraBuffer: GPUBuffer;
  private sampler: GPUSampler;
  private quads: TextQuad[] = [];
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;

  constructor(gpu: GPUState) {
    this.gpu = gpu;
    const { device, format } = gpu;

    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;

    this.cameraBuffer = device.createBuffer({
      size: 256,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.sampler = device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
    });

    const shaderModule = device.createShaderModule({ code: textShaderSource });

    this.bindGroupLayout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' as GPUBufferBindingType } },
        { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' as GPUBufferBindingType } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' as GPUTextureSampleType } },
        { binding: 3, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
      ],
    });

    this.pipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [this.bindGroupLayout] }),
      vertex: { module: shaderModule, entryPoint: 'vs_main' },
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
      depthStencil: {
        format: 'depth24plus',
        depthWriteEnabled: false,
        depthCompare: 'always',
      },
      primitive: { topology: 'triangle-list' },
    });
  }

  hasEntries(): boolean {
    return this.quads.length > 0;
  }

  setEntries(entries: TextEntry[]): void {
    // Destroy old quads
    for (const q of this.quads) {
      q.texture.destroy();
      q.uniformBuffer.destroy();
    }
    this.quads = [];

    const { device } = this.gpu;
    const dpr = window.devicePixelRatio || 1;

    for (const entry of entries) {
      if (!entry.text) continue;

      // Measure text
      const ctx = this.offscreenCtx;
      ctx.font = `${entry.fontStyle} ${entry.fontSize * dpr}px ${entry.fontFamily}`;
      const metrics = ctx.measureText(entry.text);
      const texWidth = Math.ceil(metrics.width) + 4;
      const texHeight = Math.ceil(entry.fontSize * dpr * 1.4) + 4;

      if (texWidth <= 0 || texHeight <= 0) continue;

      // Render text to offscreen canvas
      this.offscreenCanvas.width = texWidth;
      this.offscreenCanvas.height = texHeight;
      ctx.clearRect(0, 0, texWidth, texHeight);
      ctx.font = `${entry.fontStyle} ${entry.fontSize * dpr}px ${entry.fontFamily}`;
      ctx.fillStyle = entry.color;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      ctx.fillText(entry.text, 2, 2);

      // Create GPU texture
      const texture = device.createTexture({
        size: [texWidth, texHeight],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
      });

      // Copy canvas pixels to texture
      const imageData = ctx.getImageData(0, 0, texWidth, texHeight);
      device.queue.writeTexture(
        { texture },
        imageData.data,
        { bytesPerRow: texWidth * 4, rowsPerImage: texHeight },
        [texWidth, texHeight],
      );

      // Uniform buffer: worldPos(2) + texSize(2) + offset(2) + opacity(1) + pad(1) = 8 floats
      const uniformBuffer = device.createBuffer({
        size: 32,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      const bindGroup = device.createBindGroup({
        layout: this.bindGroupLayout,
        entries: [
          { binding: 0, resource: { buffer: this.cameraBuffer } },
          { binding: 1, resource: { buffer: uniformBuffer } },
          { binding: 2, resource: texture.createView() },
          { binding: 3, resource: this.sampler },
        ],
      });

      writeBuffer(device.queue, uniformBuffer, 0, new Float32Array([
        entry.worldPos[0], entry.worldPos[1],
        texWidth, texHeight,
        entry.offset[0] * dpr, entry.offset[1] * dpr,
        1.0, 0,
      ]));

      this.quads.push({ texture, bindGroup, uniformBuffer, texWidth, texHeight, entry });
    }
  }

  render(pass: GPURenderPassEncoder, camera: CameraUniformData): void {
    if (this.quads.length === 0) return;

    // Write camera uniforms
    const camData = new Float32Array(36);
    camData.set(camera.viewProjection, 0);
    camData.set(camera.invViewProjection, 16);
    camData[32] = camera.resolution[0];
    camData[33] = camera.resolution[1];
    camData[34] = camera.pixelRatio;
    writeBuffer(this.gpu.device.queue, this.cameraBuffer, 0, camData);

    for (const q of this.quads) {
      pass.setPipeline(this.pipeline);
      pass.setBindGroup(0, q.bindGroup);
      pass.draw(6);
    }
  }

  destroy(): void {
    for (const q of this.quads) {
      q.texture.destroy();
      q.uniformBuffer.destroy();
    }
    this.quads = [];
    this.cameraBuffer.destroy();
  }
}
