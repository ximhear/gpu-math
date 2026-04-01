import type { GPUState } from '../types.js';
import type { CameraUniformData } from '../camera/Camera2D.js';
import { MathObject } from './MathObject.js';
import { hexToRGBA } from '../math/color.js';
import { getFillPipeline } from '../engine/FillPipeline.js';
import { getLinePipeline } from '../engine/LinePipeline.js';
import { buildLineVertices, type LinePoint } from '../engine/LineGeometry.js';
import { writeBuffer } from '../engine/gpu.js';

export interface BarData {
  x: number;    // center x position
  height: number;
  width?: number; // default auto
  color?: string; // per-bar override
}

export interface BarOptions {
  color?: string;
  opacity?: number;
  gap?: number;    // gap between bars as fraction of width (default 0.1)
  label?: string;
  outline?: boolean; // draw outline (default true)
  outlineColor?: string;
}

export class Bar2D extends MathObject {
  private bars: BarData[];
  private options: Required<BarOptions>;
  readonly hasExplicitColor: boolean;
  private gpu: GPUState | null = null;
  // Fill (rectangles)
  private fillVertexBuffer: GPUBuffer | null = null;
  private fillCameraBuffer: GPUBuffer | null = null;
  private fillColorBuffer: GPUBuffer | null = null;
  private fillBindGroup: GPUBindGroup | null = null;
  private fillPipeline: GPURenderPipeline | null = null;
  private fillVertexCount = 0;
  // Outline
  private outlineVertexBuffer: GPUBuffer | null = null;
  private outlineCameraBuffer: GPUBuffer | null = null;
  private outlineLineBuffer: GPUBuffer | null = null;
  private outlineBindGroup: GPUBindGroup | null = null;
  private outlinePipeline: GPURenderPipeline | null = null;
  private outlineVertexCount = 0;

  get label() { return this.options.label; }
  get color() { return this.options.color; }
  setColor(c: string) { this.options.color = c; }

  constructor(bars: BarData[], options?: BarOptions) {
    super();
    this.bars = bars;
    this.hasExplicitColor = options?.color !== undefined;
    this.options = {
      color: options?.color ?? '#3b82f6',
      opacity: options?.opacity ?? 0.6,
      gap: options?.gap ?? 0.1,
      label: options?.label ?? '',
      outline: options?.outline ?? true,
      outlineColor: options?.outlineColor ?? '#ffffff',
    };
  }

  init(gpu: GPUState): void {
    this.gpu = gpu;
    const { device } = gpu;

    // Fill pipeline
    this.fillCameraBuffer = device.createBuffer({ size: 256, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.fillColorBuffer = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const fill = getFillPipeline(gpu);
    this.fillPipeline = fill.pipeline;
    this.fillBindGroup = device.createBindGroup({
      layout: fill.bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.fillCameraBuffer } },
        { binding: 1, resource: { buffer: this.fillColorBuffer } },
      ],
    });

    // Outline pipeline
    if (this.options.outline) {
      this.outlineCameraBuffer = device.createBuffer({ size: 256, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      this.outlineLineBuffer = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      const line = getLinePipeline(gpu);
      this.outlinePipeline = line.pipeline;
      this.outlineBindGroup = device.createBindGroup({
        layout: line.bindGroupLayout,
        entries: [
          { binding: 0, resource: { buffer: this.outlineCameraBuffer } },
          { binding: 1, resource: { buffer: this.outlineLineBuffer } },
        ],
      });
    }

    this.buildGeometry();
    this.writeUniforms();
  }

  private buildGeometry(): void {
    if (!this.gpu) return;

    // Auto-calculate width if not specified
    const autoWidth = this.bars.length > 1
      ? Math.abs(this.bars[1].x - this.bars[0].x) * (1 - this.options.gap)
      : 1;

    // Fill triangles
    const fillTris: number[] = [];
    const outlineSegs: LinePoint[][] = [];

    for (const bar of this.bars) {
      const w = (bar.width ?? autoWidth) / 2;
      const x0 = bar.x - w, x1 = bar.x + w;
      const y0 = 0, y1 = bar.height;

      // Two triangles per bar
      fillTris.push(x0, y0, x0, y1, x1, y1);
      fillTris.push(x0, y0, x1, y1, x1, y0);

      // Outline: rectangle path
      if (this.options.outline) {
        outlineSegs.push([
          { x: x0, y: y0 }, { x: x0, y: y1 }, { x: x1, y: y1 }, { x: x1, y: y0 }, { x: x0, y: y0 },
        ]);
      }
    }

    // Fill buffer
    const fillData = new Float32Array(fillTris);
    this.fillVertexCount = fillData.length / 2;
    if (this.fillVertexBuffer) this.fillVertexBuffer.destroy();
    this.fillVertexBuffer = this.gpu.device.createBuffer({ size: Math.max(fillData.byteLength, 8), usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    writeBuffer(this.gpu.device.queue, this.fillVertexBuffer, 0, fillData);

    // Outline buffer
    if (this.options.outline && outlineSegs.length > 0) {
      const parts = outlineSegs.map(s => buildLineVertices(s, null));
      let total = 0;
      for (const p of parts) total += p.data.length;
      const outData = new Float32Array(total);
      let off = 0;
      for (const p of parts) { outData.set(p.data, off); off += p.data.length; }
      this.outlineVertexCount = parts.reduce((s, p) => s + p.vertexCount, 0);

      if (this.outlineVertexBuffer) this.outlineVertexBuffer.destroy();
      this.outlineVertexBuffer = this.gpu.device.createBuffer({ size: outData.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
      writeBuffer(this.gpu.device.queue, this.outlineVertexBuffer, 0, outData);
    }
  }

  private writeUniforms(): void {
    if (!this.gpu) return;
    const [r, g, b] = hexToRGBA(this.options.color);
    if (this.fillColorBuffer) {
      writeBuffer(this.gpu.device.queue, this.fillColorBuffer, 0, new Float32Array([r, g, b, this.options.opacity]));
    }
    if (this.outlineLineBuffer) {
      const [or, og, ob] = hexToRGBA(this.options.outlineColor);
      writeBuffer(this.gpu.device.queue, this.outlineLineBuffer, 0, new Float32Array([or, og, ob, 0.8, 1, 0, 0, 0]));
    }
  }

  private writeCamera(buffer: GPUBuffer, camera: CameraUniformData): void {
    const camData = new Float32Array(36);
    camData.set(camera.viewProjection, 0); camData.set(camera.invViewProjection, 16);
    camData[32] = camera.resolution[0]; camData[33] = camera.resolution[1]; camData[34] = camera.pixelRatio;
    writeBuffer(this.gpu!.device.queue, buffer, 0, camData);
  }

  render(pass: GPURenderPassEncoder, camera: CameraUniformData): void {
    // Fill
    if (this.fillPipeline && this.fillBindGroup && this.fillVertexBuffer && this.fillVertexCount > 0) {
      this.writeCamera(this.fillCameraBuffer!, camera);
      pass.setPipeline(this.fillPipeline);
      pass.setBindGroup(0, this.fillBindGroup);
      pass.setVertexBuffer(0, this.fillVertexBuffer);
      pass.draw(this.fillVertexCount);
    }
    // Outline
    if (this.outlinePipeline && this.outlineBindGroup && this.outlineVertexBuffer && this.outlineVertexCount > 0) {
      this.writeCamera(this.outlineCameraBuffer!, camera);
      pass.setPipeline(this.outlinePipeline);
      pass.setBindGroup(0, this.outlineBindGroup);
      pass.setVertexBuffer(0, this.outlineVertexBuffer);
      pass.draw(this.outlineVertexCount);
    }
  }

  destroy(): void {
    this.fillVertexBuffer?.destroy(); this.fillCameraBuffer?.destroy(); this.fillColorBuffer?.destroy();
    this.outlineVertexBuffer?.destroy(); this.outlineCameraBuffer?.destroy(); this.outlineLineBuffer?.destroy();
  }
}

export function bar(bars: BarData[], options?: BarOptions): Bar2D {
  return new Bar2D(bars, options);
}

/** Convenience: create histogram from data array */
export function histogram(
  data: number[],
  bins = 10,
  options?: BarOptions,
): Bar2D {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const binWidth = (max - min) / bins;
  const counts = new Array(bins).fill(0);
  for (const v of data) {
    const idx = Math.min(Math.floor((v - min) / binWidth), bins - 1);
    counts[idx]++;
  }
  const bars: BarData[] = counts.map((count, i) => ({
    x: min + (i + 0.5) * binWidth,
    height: count,
    width: binWidth * 0.9,
  }));
  return new Bar2D(bars, options);
}
