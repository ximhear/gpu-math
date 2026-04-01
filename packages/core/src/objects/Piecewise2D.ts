import type { GPUState } from '../types.js';
import type { CameraUniformData } from '../camera/Camera2D.js';
import { MathObject } from './MathObject.js';
import { hexToRGBA } from '../math/color.js';
import { adaptiveSample } from '../math/Sampling.js';
import { buildLineVertices } from '../engine/LineGeometry.js';
import { getLinePipeline } from '../engine/LinePipeline.js';
import { writeBuffer } from '../engine/gpu.js';

export interface PiecewiseSegment {
  fn: (x: number) => number;
  range: [number, number];
  /** Left endpoint included? default true */
  leftClosed?: boolean;
  /** Right endpoint included? default true */
  rightClosed?: boolean;
}

export interface PiecewiseOptions {
  color?: string;
  lineWidth?: number;
  opacity?: number;
  label?: string;
  /** Show open/closed dots at endpoints. default true */
  showDots?: boolean;
  dotSize?: number;
}

/**
 * A piecewise-defined function rendered as separate segments
 * with automatic open/closed dot markers at boundaries.
 */
export class Piecewise2D extends MathObject {
  private segments: PiecewiseSegment[];
  private options: Required<PiecewiseOptions>;
  readonly hasExplicitColor: boolean;
  private gpu: GPUState | null = null;
  private vertexBuffer: GPUBuffer | null = null;
  private cameraBuffer: GPUBuffer | null = null;
  private lineBuffer: GPUBuffer | null = null;
  private bindGroup: GPUBindGroup | null = null;
  private pipeline: GPURenderPipeline | null = null;
  private vertexCount = 0;

  // Sub-objects for endpoint dots
  private dotObjects: MathObject[] = [];

  get label() { return this.options.label; }
  get color() { return this.options.color; }
  setColor(c: string) { this.options.color = c; this.writeUniforms(); }

  constructor(segments: PiecewiseSegment[], options?: PiecewiseOptions) {
    super();
    this.segments = segments;
    this.hasExplicitColor = options?.color !== undefined;
    this.options = {
      color: options?.color ?? '#3b82f6',
      lineWidth: options?.lineWidth ?? 2,
      opacity: options?.opacity ?? 1,
      label: options?.label ?? '',
      showDots: options?.showDots ?? true,
      dotSize: options?.dotSize ?? 7,
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

    const allParts: { data: Float32Array; vertexCount: number }[] = [];

    for (const seg of this.segments) {
      const points = adaptiveSample(seg.fn, seg.range);
      if (points.length < 2) continue;
      allParts.push(buildLineVertices(points, null));
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

  /**
   * Returns endpoint dot descriptors for the scene to add as Point2D objects.
   * Call after init().
   */
  getEndpointDots(): { pos: [number, number]; filled: boolean }[] {
    if (!this.options.showDots) return [];
    const dots: { pos: [number, number]; filled: boolean }[] = [];

    for (const seg of this.segments) {
      const [xL, xR] = seg.range;
      const yL = seg.fn(xL);
      const yR = seg.fn(xR);
      if (isFinite(yL)) {
        dots.push({ pos: [xL, yL], filled: seg.leftClosed !== false });
      }
      if (isFinite(yR)) {
        dots.push({ pos: [xR, yR], filled: seg.rightClosed !== false });
      }
    }
    return dots;
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

/**
 * Create a piecewise function with automatic open/closed dots.
 *
 * ```typescript
 * const pw = piecewise([
 *   { fn: x => x + 1, range: [-3, 1], rightClosed: false },
 *   { fn: x => 3,     range: [1, 5],  leftClosed: true },
 * ]);
 * scene.add(pw);
 * // Add dots
 * for (const d of pw.getEndpointDots()) {
 *   scene.add(point(d.pos, { filled: d.filled, color: pw.color, size: 7 }));
 * }
 * ```
 */
export function piecewise(segments: PiecewiseSegment[], options?: PiecewiseOptions): Piecewise2D {
  return new Piecewise2D(segments, options);
}
