import type { GPUState } from '../types.js';
import type { CameraUniformData } from '../camera/Camera2D.js';
import { MathObject } from './MathObject.js';
import { writeBuffer } from '../engine/gpu.js';
import complexShaderSource from '../shaders/complex.wgsl';

export interface Complex {
  re: number;
  im: number;
}

export interface ComplexPlotOptions {
  range?: [number, number];
  resolution?: number;
  label?: string;
}

type ComplexFn = (z: Complex) => Complex;

export class ComplexPlot2D extends MathObject {
  private fn: ComplexFn;
  private options: Required<ComplexPlotOptions>;
  readonly hasExplicitColor = true;
  private gpu: GPUState | null = null;
  private pipeline: GPURenderPipeline | null = null;
  private cameraBuffer: GPUBuffer | null = null;
  private texture: GPUTexture | null = null;
  private bindGroup: GPUBindGroup | null = null;
  private lastCameraKey = '';

  get label() { return this.options.label; }
  get color() { return ''; }

  constructor(fn: ComplexFn, options?: ComplexPlotOptions) {
    super();
    this.fn = fn;
    this.options = {
      range: options?.range ?? [-5, 5],
      resolution: options?.resolution ?? 256,
      label: options?.label ?? '',
    };
  }

  init(gpu: GPUState): void {
    this.gpu = gpu;
    const { device, format } = gpu;

    this.cameraBuffer = device.createBuffer({ size: 256, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

    const res = this.options.resolution;
    this.texture = device.createTexture({
      size: [res, res],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });

    const shaderModule = device.createShaderModule({ code: complexShaderSource });
    const sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });

    const bindGroupLayout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' as GPUBufferBindingType } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' as GPUTextureSampleType } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
      ],
    });

    this.bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.cameraBuffer } },
        { binding: 1, resource: this.texture.createView() },
        { binding: 2, resource: sampler },
      ],
    });

    this.pipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
      vertex: { module: shaderModule, entryPoint: 'vs_main' },
      fragment: {
        module: shaderModule,
        entryPoint: 'fs_main',
        targets: [{ format }],
      },
      depthStencil: { format: 'depth24plus', depthWriteEnabled: false, depthCompare: 'always' },
      primitive: { topology: 'triangle-list' },
    });

    this.computeTexture();
  }

  private computeTexture(): void {
    if (!this.gpu || !this.texture) return;
    const res = this.options.resolution;
    const [rMin, rMax] = this.options.range;
    const data = new Uint8Array(res * res * 4);

    for (let j = 0; j < res; j++) {
      for (let i = 0; i < res; i++) {
        const re = rMin + (i / (res - 1)) * (rMax - rMin);
        const im = rMin + (j / (res - 1)) * (rMax - rMin);
        const w = this.fn({ re, im });

        // Domain coloring: phase → hue, magnitude → brightness
        const phase = Math.atan2(w.im, w.re); // [-π, π]
        const mag = Math.sqrt(w.re * w.re + w.im * w.im);

        const hue = (phase + Math.PI) / (2 * Math.PI); // [0, 1]
        const brightness = 1 - 1 / (1 + mag * 0.3); // asymptotic [0, 1)
        const saturation = 0.8;

        const [r, g, b] = hslToRgb(hue, saturation, 0.1 + brightness * 0.7);
        const idx = (j * res + i) * 4;
        data[idx] = Math.round(r * 255);
        data[idx + 1] = Math.round(g * 255);
        data[idx + 2] = Math.round(b * 255);
        data[idx + 3] = 255;
      }
    }

    this.gpu.device.queue.writeTexture(
      { texture: this.texture },
      data,
      { bytesPerRow: res * 4, rowsPerImage: res },
      [res, res],
    );
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
    this.texture?.destroy();
  }
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    hueToRgb(p, q, h + 1 / 3),
    hueToRgb(p, q, h),
    hueToRgb(p, q, h - 1 / 3),
  ];
}

function hueToRgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

export function complexPlot(fn: ComplexFn, options?: ComplexPlotOptions): ComplexPlot2D {
  return new ComplexPlot2D(fn, options);
}
