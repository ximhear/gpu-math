import type { GPUState, Vec3 } from '../types.js';
import type { Camera3DUniformData } from '../camera/Camera3D.js';
import { MathObject3D } from './MathObject3D.js';
import { hexToRGBA } from '../math/color.js';
import { buildLineVertices3D, type LinePoint3D } from '../engine/LineGeometry3D.js';
import { getLinePipeline3D } from '../engine/LinePipeline3D.js';
import { writeCamera3DUniforms, CAMERA3D_BUFFER_SIZE } from '../engine/camera3dBuffer.js';
import { writeBuffer } from '../engine/gpu.js';

export interface VectorField3DOptions {
  density?: number;
  scale?: number;
  bounds?: [[number, number], [number, number], [number, number]];
  color?: string;
  lineWidth?: number;
  opacity?: number;
  label?: string;
}

export class VectorField3D extends MathObject3D {
  private field: (x: number, y: number, z: number) => Vec3;
  private options: Required<VectorField3DOptions>;
  private gpu: GPUState | null = null;
  private vertexBuffer: GPUBuffer | null = null;
  private cameraBuffer: GPUBuffer | null = null;
  private lineBuffer: GPUBuffer | null = null;
  private bindGroup: GPUBindGroup | null = null;
  private pipeline: GPURenderPipeline | null = null;
  private vertexCount = 0;

  get label() { return this.options.label; }

  constructor(field: (x: number, y: number, z: number) => Vec3, options?: VectorField3DOptions) {
    super();
    this.field = field;
    this.options = {
      density: options?.density ?? 6,
      scale: options?.scale ?? 0.5,
      bounds: options?.bounds ?? [[-3, 3], [-3, 3], [-3, 3]],
      color: options?.color ?? '#3b82f6',
      lineWidth: options?.lineWidth ?? 1.5,
      opacity: options?.opacity ?? 0.6,
      label: options?.label ?? '',
    };
  }

  init(gpu: GPUState): void {
    this.gpu = gpu;
    const { device } = gpu;
    this.cameraBuffer = device.createBuffer({ size: CAMERA3D_BUFFER_SIZE, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.lineBuffer = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

    const { pipeline, bindGroupLayout } = getLinePipeline3D(gpu);
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
    const d = this.options.density;
    const [[xMin, xMax], [yMin, yMax], [zMin, zMax]] = this.options.bounds;
    const dxCell = (xMax - xMin) / d;
    const dyCell = (yMax - yMin) / d;
    const dzCell = (zMax - zMin) / d;
    const cellSize = Math.min(dxCell, dyCell, dzCell) * this.options.scale;

    const arrows: { from: LinePoint3D; to: LinePoint3D }[] = [];
    let maxMag = 0;

    // Sample field on 3D grid
    const samples: { cx: number; cy: number; cz: number; vx: number; vy: number; vz: number; mag: number }[] = [];
    for (let k = 0; k < d; k++) {
      for (let j = 0; j < d; j++) {
        for (let i = 0; i < d; i++) {
          const cx = xMin + (i + 0.5) * dxCell;
          const cy = yMin + (j + 0.5) * dyCell;
          const cz = zMin + (k + 0.5) * dzCell;
          const [vx, vy, vz] = this.field(cx, cy, cz);
          if (!isFinite(vx) || !isFinite(vy) || !isFinite(vz)) continue;
          const mag = Math.sqrt(vx * vx + vy * vy + vz * vz);
          if (mag < 1e-10) continue;
          maxMag = Math.max(maxMag, mag);
          samples.push({ cx, cy, cz, vx, vy, vz, mag });
        }
      }
    }

    if (maxMag < 1e-10) maxMag = 1;

    // Build arrow segments (shaft only for performance)
    const segments: LinePoint3D[][] = [];
    for (const s of samples) {
      const len = (s.mag / maxMag) * cellSize;
      const ux = s.vx / s.mag, uy = s.vy / s.mag, uz = s.vz / s.mag;
      const tx = s.cx + ux * len, ty = s.cy + uy * len, tz = s.cz + uz * len;

      // Shaft
      segments.push([
        { x: s.cx, y: s.cy, z: s.cz },
        { x: tx, y: ty, z: tz },
      ]);

      // Simple barb (one perpendicular line at tip)
      const headLen = len * 0.25;
      const arb = Math.abs(uy) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      const px = uy * arb[2] - uz * arb[1];
      const py = uz * arb[0] - ux * arb[2];
      const pz = ux * arb[1] - uy * arb[0];
      const pl = Math.sqrt(px * px + py * py + pz * pz) || 1;
      const nx = px / pl, ny = py / pl, nz = pz / pl;
      const bw = headLen * 0.4;
      segments.push([
        { x: tx - ux * headLen + nx * bw, y: ty - uy * headLen + ny * bw, z: tz - uz * headLen + nz * bw },
        { x: tx, y: ty, z: tz },
      ]);
      segments.push([
        { x: tx - ux * headLen - nx * bw, y: ty - uy * headLen - ny * bw, z: tz - uz * headLen - nz * bw },
        { x: tx, y: ty, z: tz },
      ]);
    }

    const parts = segments.map(s => buildLineVertices3D(s));
    let totalVerts = 0, totalFloats = 0;
    for (const p of parts) { totalVerts += p.vertexCount; totalFloats += p.data.length; }
    this.vertexCount = totalVerts;
    if (totalVerts === 0) return;

    const combined = new Float32Array(totalFloats);
    let off = 0;
    for (const p of parts) { combined.set(p.data, off); off += p.data.length; }

    if (this.vertexBuffer) this.vertexBuffer.destroy();
    this.vertexBuffer = this.gpu.device.createBuffer({ size: combined.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    writeBuffer(this.gpu.device.queue, this.vertexBuffer, 0, combined);
  }

  private writeUniforms(): void {
    if (!this.gpu || !this.lineBuffer) return;
    const [r, g, b] = hexToRGBA(this.options.color);
    writeBuffer(this.gpu.device.queue, this.lineBuffer, 0, new Float32Array([r, g, b, this.options.opacity, this.options.lineWidth, 0, 0, 0]));
  }

  render(pass: GPURenderPassEncoder, camera: Camera3DUniformData): void {
    if (!this.pipeline || !this.bindGroup || !this.vertexBuffer || this.vertexCount === 0) return;
    writeCamera3DUniforms(this.gpu!.device.queue, this.cameraBuffer!, camera);
    pass.setPipeline(this.pipeline); pass.setBindGroup(0, this.bindGroup);
    pass.setVertexBuffer(0, this.vertexBuffer); pass.draw(this.vertexCount);
  }

  destroy(): void { this.vertexBuffer?.destroy(); this.cameraBuffer?.destroy(); this.lineBuffer?.destroy(); }
}

export function vectorField3D(field: (x: number, y: number, z: number) => Vec3, options?: VectorField3DOptions): VectorField3D {
  return new VectorField3D(field, options);
}
