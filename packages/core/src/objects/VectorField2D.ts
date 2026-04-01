import type { GPUState, Vec2 } from '../types.js';
import type { CameraUniformData } from '../camera/Camera2D.js';
import { MathObject } from './MathObject.js';
import { hexToRGBA } from '../math/color.js';
import { buildLineVertices, type LinePoint } from '../engine/LineGeometry.js';
import { getLinePipeline } from '../engine/LinePipeline.js';
import { writeBuffer } from '../engine/gpu.js';

export interface VectorFieldOptions {
  density?: number;
  scale?: number;
  color?: string;
  colorMap?: 'magnitude' | 'none';
  lineWidth?: number;
  label?: string;
  opacity?: number;
}

export class VectorField2D extends MathObject {
  private fn: (x: number, y: number) => Vec2;
  private options: Required<VectorFieldOptions>;
  readonly hasExplicitColor: boolean;
  private gpu: GPUState | null = null;
  private vertexBuffer: GPUBuffer | null = null;
  private cameraBuffer: GPUBuffer | null = null;
  private lineBuffer: GPUBuffer | null = null;
  private bindGroup: GPUBindGroup | null = null;
  private pipeline: GPURenderPipeline | null = null;
  private vertexCount = 0;
  private lastCameraKey = '';

  constructor(fn: (x: number, y: number) => Vec2, options?: VectorFieldOptions) {
    super();
    this.fn = fn;
    this.hasExplicitColor = options?.color !== undefined;
    this.options = {
      density: options?.density ?? 15,
      scale: options?.scale ?? 0.8,
      color: options?.color ?? '#3b82f6',
      colorMap: options?.colorMap ?? 'none',
      lineWidth: options?.lineWidth ?? 1.5,
      label: options?.label ?? '',
      opacity: options?.opacity ?? 0.7,
    };
  }

  get label(): string { return this.options.label; }
  get color(): string { return this.options.color; }
  setColor(c: string): void { this.options.color = c; }

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
  }

  private rebuildForCamera(camera: CameraUniformData): void {
    if (!this.gpu) return;

    // Compute visible world bounds from inverse VP
    const inv = camera.invViewProjection;
    const bl = transformPoint(inv, -1, -1);
    const tr = transformPoint(inv, 1, 1);
    const xMin = bl[0], xMax = tr[0];
    const yMin = bl[1], yMax = tr[1];

    const d = this.options.density;
    const cellW = (xMax - xMin) / d;
    const cellH = (yMax - yMin) / d;
    const arrowScale = Math.min(cellW, cellH) * this.options.scale;

    const allPoints: LinePoint[] = [];
    let maxMag = 0;
    const arrows: { cx: number; cy: number; vx: number; vy: number; mag: number }[] = [];

    for (let j = 0; j < d; j++) {
      for (let i = 0; i < d; i++) {
        const cx = xMin + (i + 0.5) * cellW;
        const cy = yMin + (j + 0.5) * cellH;
        const [vx, vy] = this.fn(cx, cy);
        if (!isFinite(vx) || !isFinite(vy)) continue;
        const mag = Math.sqrt(vx * vx + vy * vy);
        if (mag < 1e-10) continue;
        maxMag = Math.max(maxMag, mag);
        arrows.push({ cx, cy, vx, vy, mag });
      }
    }

    if (maxMag < 1e-10) maxMag = 1;

    // Build arrow geometry (shaft + 2 barbs) for each arrow
    for (const a of arrows) {
      const len = (a.mag / maxMag) * arrowScale;
      const ux = a.vx / a.mag;
      const uy = a.vy / a.mag;
      const tx = a.cx + ux * len;
      const ty = a.cy + uy * len;
      const headLen = len * 0.25;
      const px = -uy, py = ux;

      // Shaft
      allPoints.push({ x: a.cx, y: a.cy });
      allPoints.push({ x: tx, y: ty });
      // Sentinel NaN to break the line
      allPoints.push({ x: NaN, y: NaN });

      // Barbs
      const b1x = tx - ux * headLen + px * headLen * 0.4;
      const b1y = ty - uy * headLen + py * headLen * 0.4;
      const b2x = tx - ux * headLen - px * headLen * 0.4;
      const b2y = ty - uy * headLen - py * headLen * 0.4;
      allPoints.push({ x: b1x, y: b1y });
      allPoints.push({ x: tx, y: ty });
      allPoints.push({ x: NaN, y: NaN });
      allPoints.push({ x: b2x, y: b2y });
      allPoints.push({ x: tx, y: ty });
      allPoints.push({ x: NaN, y: NaN });
    }

    // Split by NaN sentinels and build line segments
    const segments: LinePoint[][] = [];
    let current: LinePoint[] = [];
    for (const p of allPoints) {
      if (!isFinite(p.x) || !isFinite(p.y)) {
        if (current.length >= 2) segments.push(current);
        current = [];
      } else {
        current.push(p);
      }
    }
    if (current.length >= 2) segments.push(current);

    // Build all vertices
    let totalVertices = 0;
    const parts: { data: Float32Array; vertexCount: number }[] = [];
    for (const seg of segments) {
      const r = buildLineVertices(seg, null);
      parts.push(r);
      totalVertices += r.vertexCount;
    }

    this.vertexCount = totalVertices;
    if (totalVertices === 0) return;

    let totalSize = 0;
    for (const p of parts) totalSize += p.data.byteLength;

    const combined = new Float32Array(totalSize / 4);
    let offset = 0;
    for (const p of parts) {
      combined.set(p.data, offset);
      offset += p.data.length;
    }

    if (this.vertexBuffer) this.vertexBuffer.destroy();
    this.vertexBuffer = this.gpu.device.createBuffer({
      size: combined.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    writeBuffer(this.gpu.device.queue, this.vertexBuffer, 0, combined);
  }

  render(pass: GPURenderPassEncoder, camera: CameraUniformData): void {
    if (!this.pipeline || !this.bindGroup || !this.gpu) return;

    // Rebuild geometry when camera changes significantly
    const key = `${camera.viewProjection[0].toFixed(3)}_${camera.viewProjection[12].toFixed(3)}_${camera.viewProjection[5].toFixed(3)}_${camera.viewProjection[13].toFixed(3)}`;
    if (key !== this.lastCameraKey) {
      this.lastCameraKey = key;
      this.rebuildForCamera(camera);
      this.updateLineUniforms();
    }

    if (!this.vertexBuffer || this.vertexCount === 0) return;

    const camData = new Float32Array(36);
    camData.set(camera.viewProjection, 0);
    camData.set(camera.invViewProjection, 16);
    camData[32] = camera.resolution[0];
    camData[33] = camera.resolution[1];
    camData[34] = camera.pixelRatio;
    writeBuffer(this.gpu.device.queue, this.cameraBuffer!, 0, camData);

    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.setVertexBuffer(0, this.vertexBuffer);
    pass.draw(this.vertexCount);
  }

  private updateLineUniforms(): void {
    if (!this.gpu || !this.lineBuffer) return;
    const [r, g, b] = hexToRGBA(this.options.color);
    const data = new Float32Array([
      r, g, b, this.options.opacity,
      this.options.lineWidth, 0, 0, 0,
    ]);
    writeBuffer(this.gpu.device.queue, this.lineBuffer, 0, data);
  }

  destroy(): void {
    this.vertexBuffer?.destroy();
    this.cameraBuffer?.destroy();
    this.lineBuffer?.destroy();
  }
}

function transformPoint(inv: Float32Array, ndcX: number, ndcY: number): [number, number] {
  const x = inv[0] * ndcX + inv[4] * ndcY + inv[12];
  const y = inv[1] * ndcX + inv[5] * ndcY + inv[13];
  return [x, y];
}

export function vectorField(fn: (x: number, y: number) => Vec2, options?: VectorFieldOptions): VectorField2D {
  return new VectorField2D(fn, options);
}
