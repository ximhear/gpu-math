import type { GPUState, Vec2 } from '../types.js';
import type { CameraUniformData } from '../camera/Camera2D.js';
import { MathObject } from './MathObject.js';
import { hexToRGBA } from '../math/color.js';
import { buildLineVertices, type LinePoint } from '../engine/LineGeometry.js';
import { getLinePipeline } from '../engine/LinePipeline.js';
import { writeBuffer } from '../engine/gpu.js';

export interface TransformOptions {
  showGrid?: boolean;
  showEigen?: boolean;
  animate?: boolean;
  gridRange?: number;
  gridDensity?: number;
  color?: string;
  eigenColor?: string;
  opacity?: number;
}

export class Transform2D extends MathObject {
  private matrix: [[number, number], [number, number]];
  private options: Required<TransformOptions>;
  readonly hasExplicitColor = true;
  private gpu: GPUState | null = null;
  private vertexBuffer: GPUBuffer | null = null;
  private cameraBuffer: GPUBuffer | null = null;
  private lineBuffer: GPUBuffer | null = null;
  private bindGroup: GPUBindGroup | null = null;
  private pipeline: GPURenderPipeline | null = null;
  private vertexCount = 0;
  private t = 1; // animation progress 0→1

  get label() { return ''; }
  get color() { return this.options.color; }

  constructor(m: [[number, number], [number, number]], options?: TransformOptions) {
    super();
    this.matrix = m;
    this.options = {
      showGrid: options?.showGrid ?? true,
      showEigen: options?.showEigen ?? true,
      animate: options?.animate ?? false,
      gridRange: options?.gridRange ?? 5,
      gridDensity: options?.gridDensity ?? 11,
      color: options?.color ?? '#3b82f6',
      eigenColor: options?.eigenColor ?? '#ef4444',
      opacity: options?.opacity ?? 0.4,
    };
  }

  /** Set animation progress (0 = identity, 1 = full transform) */
  setProgress(t: number): void {
    this.t = Math.max(0, Math.min(1, t));
    this.rebuildGeometry();
  }

  getParam(name: string): number {
    if (name === 't') return this.t;
    return 0;
  }

  setParam(name: string, value: number): void {
    if (name === 't') this.setProgress(value);
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

    this.rebuildGeometry();
    this.updateUniforms();
  }

  private applyMatrix(x: number, y: number): [number, number] {
    const [[a, b], [c, d]] = this.matrix;
    const t = this.t;
    // Interpolate from identity to matrix
    const m00 = 1 + (a - 1) * t;
    const m01 = b * t;
    const m10 = c * t;
    const m11 = 1 + (d - 1) * t;
    return [m00 * x + m01 * y, m10 * x + m11 * y];
  }

  private rebuildGeometry(): void {
    if (!this.gpu) return;

    const range = this.options.gridRange;
    const density = this.options.gridDensity;
    const segments: LinePoint[][] = [];

    if (this.options.showGrid) {
      // Vertical grid lines
      for (let i = 0; i < density; i++) {
        const x = -range + (2 * range * i) / (density - 1);
        const line: LinePoint[] = [];
        for (let j = 0; j <= 40; j++) {
          const y = -range + (2 * range * j) / 40;
          const [tx, ty] = this.applyMatrix(x, y);
          line.push({ x: tx, y: ty });
        }
        segments.push(line);
      }
      // Horizontal grid lines
      for (let j = 0; j < density; j++) {
        const y = -range + (2 * range * j) / (density - 1);
        const line: LinePoint[] = [];
        for (let i = 0; i <= 40; i++) {
          const x = -range + (2 * range * i) / 40;
          const [tx, ty] = this.applyMatrix(x, y);
          line.push({ x: tx, y: ty });
        }
        segments.push(line);
      }
    }

    if (this.options.showEigen) {
      const eigens = computeEigen2x2(this.matrix);
      for (const ev of eigens) {
        const len = range;
        segments.push([
          { x: -ev[0] * len, y: -ev[1] * len },
          { x: ev[0] * len, y: ev[1] * len },
        ]);
      }
    }

    // Build all vertices
    const parts = segments.map(s => buildLineVertices(s, null));
    let totalVerts = 0;
    let totalFloats = 0;
    for (const p of parts) {
      totalVerts += p.vertexCount;
      totalFloats += p.data.length;
    }

    this.vertexCount = totalVerts;
    if (totalVerts === 0) return;

    const combined = new Float32Array(totalFloats);
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

  private updateUniforms(): void {
    if (!this.gpu || !this.lineBuffer) return;
    const [r, g, b] = hexToRGBA(this.options.color);
    const data = new Float32Array([r, g, b, this.options.opacity, 1.5, 0, 0, 0]);
    writeBuffer(this.gpu.device.queue, this.lineBuffer, 0, data);
  }

  render(pass: GPURenderPassEncoder, camera: CameraUniformData): void {
    if (!this.pipeline || !this.bindGroup || !this.vertexBuffer || this.vertexCount === 0) return;

    const camData = new Float32Array(36);
    camData.set(camera.viewProjection, 0);
    camData.set(camera.invViewProjection, 16);
    camData[32] = camera.resolution[0];
    camData[33] = camera.resolution[1];
    camData[34] = camera.pixelRatio;
    writeBuffer(this.gpu!.device.queue, this.cameraBuffer!, 0, camData);

    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.setVertexBuffer(0, this.vertexBuffer);
    pass.draw(this.vertexCount);
  }

  destroy(): void {
    this.vertexBuffer?.destroy();
    this.cameraBuffer?.destroy();
    this.lineBuffer?.destroy();
  }
}

function computeEigen2x2(m: [[number, number], [number, number]]): Vec2[] {
  const [[a, b], [c, d]] = m;
  // Eigenvalues of 2x2: λ² - (a+d)λ + (ad-bc) = 0
  const trace = a + d;
  const det = a * d - b * c;
  const disc = trace * trace - 4 * det;
  if (disc < 0) return [];

  const sqrtDisc = Math.sqrt(disc);
  const l1 = (trace + sqrtDisc) / 2;
  const l2 = (trace - sqrtDisc) / 2;

  const eigenvectors: Vec2[] = [];
  for (const l of [l1, l2]) {
    let vx: number, vy: number;
    if (Math.abs(b) > 1e-10) {
      vx = b;
      vy = l - a;
    } else if (Math.abs(c) > 1e-10) {
      vx = l - d;
      vy = c;
    } else {
      vx = 1;
      vy = 0;
    }
    const len = Math.sqrt(vx * vx + vy * vy);
    if (len > 1e-10) {
      eigenvectors.push([vx / len, vy / len]);
    }
  }
  return eigenvectors;
}

export function transform(m: [[number, number], [number, number]], options?: TransformOptions): Transform2D {
  return new Transform2D(m, options);
}
