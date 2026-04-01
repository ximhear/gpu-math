import type { GPUState } from '../types.js';
import type { CameraUniformData } from '../camera/Camera2D.js';
import { MathObject } from './MathObject.js';
import { hexToRGBA } from '../math/color.js';
import { buildLineVertices, type LinePoint } from '../engine/LineGeometry.js';
import { getLinePipeline } from '../engine/LinePipeline.js';
import { writeBuffer } from '../engine/gpu.js';

export interface ContourPlotOptions {
  range?: [number, number];
  resolution?: number;
  levels?: number | number[];  // number = auto N levels, array = specific values
  color?: string;
  lineWidth?: number;
  opacity?: number;
  label?: string;
}

// Marching squares edge table (same as ImplicitCurve2D)
const MS_TABLE: (number[] | null)[] = [
  null, [0,3], [0,1], [1,3], [1,2], [0,1,2,3], [0,2], [2,3],
  [2,3], [0,2], [0,3,1,2], [1,2], [1,3], [0,1], [0,3], null,
];

export class ContourPlot2D extends MathObject {
  private fn: (x: number, y: number) => number;
  private options: Required<ContourPlotOptions>;
  readonly hasExplicitColor: boolean;
  private gpu: GPUState | null = null;
  private vertexBuffer: GPUBuffer | null = null;
  private cameraBuffer: GPUBuffer | null = null;
  private lineBuffer: GPUBuffer | null = null;
  private bindGroup: GPUBindGroup | null = null;
  private pipeline: GPURenderPipeline | null = null;
  private vertexCount = 0;

  get label() { return this.options.label; }
  get color() { return this.options.color; }
  setColor(c: string) { this.options.color = c; this.writeUniforms(); }

  constructor(fn: (x: number, y: number) => number, options?: ContourPlotOptions) {
    super();
    this.fn = fn;
    this.hasExplicitColor = options?.color !== undefined;
    this.options = {
      range: options?.range ?? [-5, 5],
      resolution: options?.resolution ?? 150,
      levels: options?.levels ?? 10,
      color: options?.color ?? '#3b82f6',
      lineWidth: options?.lineWidth ?? 1.5,
      opacity: options?.opacity ?? 0.7,
      label: options?.label ?? '',
    };
  }

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
    this.buildGeometry();
    this.writeUniforms();
  }

  private buildGeometry(): void {
    if (!this.gpu) return;
    const [rMin, rMax] = this.options.range;
    const res = this.options.resolution;
    const dx = (rMax - rMin) / res;

    // Evaluate function on grid
    const grid: number[] = new Array((res + 1) * (res + 1));
    let fMin = Infinity, fMax = -Infinity;
    for (let j = 0; j <= res; j++) {
      for (let i = 0; i <= res; i++) {
        const x = rMin + i * dx;
        const y = rMin + j * dx;
        const v = this.fn(x, y);
        grid[j * (res + 1) + i] = v;
        if (isFinite(v)) { fMin = Math.min(fMin, v); fMax = Math.max(fMax, v); }
      }
    }

    // Determine contour levels
    let levels: number[];
    if (Array.isArray(this.options.levels)) {
      levels = this.options.levels;
    } else {
      const n = this.options.levels;
      levels = [];
      for (let i = 1; i < n; i++) {
        levels.push(fMin + (i / n) * (fMax - fMin));
      }
    }

    // March for each level
    const allParts: { data: Float32Array; vertexCount: number }[] = [];

    for (const level of levels) {
      const segments = this.marchLevel(grid, res, rMin, dx, level);
      for (const seg of segments) {
        allParts.push(buildLineVertices(seg, null));
      }
    }

    let totalVerts = 0, totalFloats = 0;
    for (const p of allParts) { totalVerts += p.vertexCount; totalFloats += p.data.length; }
    this.vertexCount = totalVerts;
    if (totalVerts === 0) return;

    const combined = new Float32Array(totalFloats);
    let off = 0;
    for (const p of allParts) { combined.set(p.data, off); off += p.data.length; }

    if (this.vertexBuffer) this.vertexBuffer.destroy();
    this.vertexBuffer = this.gpu.device.createBuffer({ size: combined.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    writeBuffer(this.gpu.device.queue, this.vertexBuffer, 0, combined);
  }

  private marchLevel(grid: number[], res: number, rMin: number, dx: number, level: number): LinePoint[][] {
    const segments: [LinePoint, LinePoint][] = [];
    const cols = res + 1;

    for (let j = 0; j < res; j++) {
      for (let i = 0; i < res; i++) {
        const x = rMin + i * dx;
        const y = rMin + j * dx;
        const v00 = grid[j * cols + i] - level;
        const v10 = grid[j * cols + i + 1] - level;
        const v01 = grid[(j + 1) * cols + i] - level;
        const v11 = grid[(j + 1) * cols + i + 1] - level;

        const idx = (v00 > 0 ? 1 : 0) | (v10 > 0 ? 2 : 0) | (v11 > 0 ? 4 : 0) | (v01 > 0 ? 8 : 0);
        if (idx === 0 || idx === 15) continue;

        const lerp = (a: number, b: number, va: number, vb: number): number => {
          const t = va / (va - vb);
          return a + t * (b - a);
        };

        const bottom: LinePoint = { x: lerp(x, x + dx, v00, v10), y };
        const right: LinePoint  = { x: x + dx, y: lerp(y, y + dx, v10, v11) };
        const top: LinePoint    = { x: lerp(x, x + dx, v01, v11), y: y + dx };
        const left: LinePoint   = { x, y: lerp(y, y + dx, v00, v01) };

        const edges = MS_TABLE[idx];
        if (edges) {
          const pts = [bottom, right, top, left];
          for (let e = 0; e < edges.length; e += 2) {
            segments.push([pts[edges[e]], pts[edges[e + 1]]]);
          }
        }
      }
    }

    return segments.map(([a, b]) => [a, b]);
  }

  private writeUniforms(): void {
    if (!this.gpu || !this.lineBuffer) return;
    const [r, g, b] = hexToRGBA(this.options.color);
    writeBuffer(this.gpu.device.queue, this.lineBuffer, 0, new Float32Array([r, g, b, this.options.opacity, this.options.lineWidth, 0, 0, 0]));
  }

  render(pass: GPURenderPassEncoder, camera: CameraUniformData): void {
    if (!this.pipeline || !this.bindGroup || !this.vertexBuffer || this.vertexCount === 0) return;
    const camData = new Float32Array(36);
    camData.set(camera.viewProjection, 0); camData.set(camera.invViewProjection, 16);
    camData[32] = camera.resolution[0]; camData[33] = camera.resolution[1]; camData[34] = camera.pixelRatio;
    writeBuffer(this.gpu!.device.queue, this.cameraBuffer!, 0, camData);
    pass.setPipeline(this.pipeline); pass.setBindGroup(0, this.bindGroup);
    pass.setVertexBuffer(0, this.vertexBuffer); pass.draw(this.vertexCount);
  }

  destroy(): void { this.vertexBuffer?.destroy(); this.cameraBuffer?.destroy(); this.lineBuffer?.destroy(); }
}

export function contourPlot(fn: (x: number, y: number) => number, options?: ContourPlotOptions): ContourPlot2D {
  return new ContourPlot2D(fn, options);
}
