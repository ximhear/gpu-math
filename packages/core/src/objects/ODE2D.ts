import type { GPUState, Vec2 } from '../types.js';
import type { CameraUniformData } from '../camera/Camera2D.js';
import { MathObject } from './MathObject.js';
import { hexToRGBA } from '../math/color.js';
import { integrateRK4 } from '../math/rk4.js';
import { buildLineVertices, type LinePoint } from '../engine/LineGeometry.js';
import { getLinePipeline } from '../engine/LinePipeline.js';
import { writeBuffer } from '../engine/gpu.js';

export interface ODEOptions {
  initialPoints: Vec2[];
  dt?: number;
  steps?: number;
  color?: string;
  lineWidth?: number;
  opacity?: number;
  label?: string;
}

export class ODE2D extends MathObject {
  private field: (x: number, y: number) => Vec2;
  private options: Required<ODEOptions>;
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

  constructor(field: (x: number, y: number) => Vec2, options: ODEOptions) {
    super();
    this.field = field;
    this.hasExplicitColor = options.color !== undefined;
    this.options = {
      initialPoints: options.initialPoints,
      dt: options.dt ?? 0.02,
      steps: options.steps ?? 500,
      color: options.color ?? '#f59e0b',
      lineWidth: options.lineWidth ?? 2,
      opacity: options.opacity ?? 0.8,
      label: options.label ?? '',
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
    this.buildTrajectories();
    this.writeUniforms();
  }

  private buildTrajectories(): void {
    if (!this.gpu) return;
    const { initialPoints, dt, steps } = this.options;

    const allParts: { data: Float32Array; vertexCount: number }[] = [];
    for (const [x0, y0] of initialPoints) {
      const traj = integrateRK4(this.field, x0, y0, dt, steps);
      if (traj.length < 2) continue;
      const points: LinePoint[] = traj.map(([x, y]) => ({ x, y }));
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

export function ode(field: (x: number, y: number) => Vec2, options: ODEOptions): ODE2D {
  return new ODE2D(field, options);
}
