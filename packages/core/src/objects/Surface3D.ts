import type { GPUState, Vec3 } from '../types.js';
import type { Camera3DUniformData } from '../camera/Camera3D.js';
import { MathObject3D } from './MathObject3D.js';
import { writeBuffer } from '../engine/gpu.js';
import { getColormapWGSL } from '../engine/colormaps.js';
import surfaceShaderSource from '../shaders/surface.wgsl';

export interface SurfaceOptions {
  u?: [number, number];
  v?: [number, number];
  resolution?: number;
  colorMap?: string;
  wireframe?: boolean;
  wireframeOnly?: boolean;
  opacity?: number;
  label?: string;
}

export class Surface3D extends MathObject3D {
  private fn: (u: number, v: number) => Vec3;
  private options: Required<SurfaceOptions>;
  private gpu: GPUState | null = null;
  private pipeline: GPURenderPipeline | null = null;
  private vertexBuffer: GPUBuffer | null = null;
  private indexBuffer: GPUBuffer | null = null;
  private cameraBuffer: GPUBuffer | null = null;
  private surfaceBuffer: GPUBuffer | null = null;
  private bindGroup: GPUBindGroup | null = null;
  private indexCount = 0;

  get label(): string { return this.options.label; }

  constructor(fn: (u: number, v: number) => Vec3, options?: SurfaceOptions) {
    super();
    this.fn = fn;
    this.options = {
      u: options?.u ?? [-3, 3],
      v: options?.v ?? [-3, 3],
      resolution: options?.resolution ?? 64,
      colorMap: options?.colorMap ?? 'viridis',
      wireframe: options?.wireframe ?? false,
      wireframeOnly: options?.wireframeOnly ?? false,
      opacity: options?.opacity ?? 1,
      label: options?.label ?? '',
    };
  }

  init(gpu: GPUState): void {
    this.gpu = gpu;
    const { device, format } = gpu;

    this.cameraBuffer = device.createBuffer({ size: 128, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.surfaceBuffer = device.createBuffer({ size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

    const colormapCode = getColormapWGSL(this.options.colorMap);
    const shaderCode = surfaceShaderSource.replace('// COLORMAP_PLACEHOLDER', colormapCode);
    const shaderModule = device.createShaderModule({ code: shaderCode });

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
        { binding: 1, resource: { buffer: this.surfaceBuffer } },
      ],
    });

    this.pipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
        buffers: [{
          arrayStride: 9 * 4, // pos(3) + normal(3) + uv(2) + height(1)
          attributes: [
            { shaderLocation: 0, offset: 0, format: 'float32x3' as GPUVertexFormat },
            { shaderLocation: 1, offset: 12, format: 'float32x3' as GPUVertexFormat },
            { shaderLocation: 2, offset: 24, format: 'float32x2' as GPUVertexFormat },
            { shaderLocation: 3, offset: 32, format: 'float32' as GPUVertexFormat },
          ],
        }],
      },
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
        depthWriteEnabled: true,
        depthCompare: 'less',
      },
      primitive: { topology: 'triangle-list', cullMode: 'none' },
    });

    this.buildMesh();
    this.writeSurfaceUniforms();
  }

  private buildMesh(): void {
    if (!this.gpu) return;
    const { device } = this.gpu;
    const res = this.options.resolution;
    const [uMin, uMax] = this.options.u;
    const [vMin, vMax] = this.options.v;

    const cols = res + 1;
    const rows = res + 1;

    // Evaluate function on grid
    const positions: Vec3[] = [];
    let minH = Infinity, maxH = -Infinity;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const u = uMin + (i / res) * (uMax - uMin);
        const v = vMin + (j / res) * (vMax - vMin);
        const p = this.fn(u, v);
        positions.push(p);
        if (isFinite(p[1])) {
          minH = Math.min(minH, p[1]);
          maxH = Math.max(maxH, p[1]);
        }
      }
    }

    const hRange = maxH - minH || 1;

    // Build vertex data: pos(3) + normal(3) + uv(2) + height(1) = 9 floats
    const vertexData = new Float32Array(cols * rows * 9);
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const idx = j * cols + i;
        const p = positions[idx];
        const off = idx * 9;

        vertexData[off] = p[0];
        vertexData[off + 1] = p[1];
        vertexData[off + 2] = p[2];

        // Normal via finite differences
        const left = i > 0 ? positions[idx - 1] : p;
        const right = i < cols - 1 ? positions[idx + 1] : p;
        const down = j > 0 ? positions[idx - cols] : p;
        const up = j < rows - 1 ? positions[idx + cols] : p;

        const du: Vec3 = [right[0] - left[0], right[1] - left[1], right[2] - left[2]];
        const dv: Vec3 = [up[0] - down[0], up[1] - down[1], up[2] - down[2]];
        // cross(du, dv)
        let nx = du[1] * dv[2] - du[2] * dv[1];
        let ny = du[2] * dv[0] - du[0] * dv[2];
        let nz = du[0] * dv[1] - du[1] * dv[0];
        const nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        nx /= nl; ny /= nl; nz /= nl;

        vertexData[off + 3] = nx;
        vertexData[off + 4] = ny;
        vertexData[off + 5] = nz;

        vertexData[off + 6] = i / res; // uv.x
        vertexData[off + 7] = j / res; // uv.y

        vertexData[off + 8] = (p[1] - minH) / hRange; // normalized height
      }
    }

    // Build index data
    const indexData = new Uint32Array(res * res * 6);
    let ii = 0;
    for (let j = 0; j < res; j++) {
      for (let i = 0; i < res; i++) {
        const a = j * cols + i;
        const b = a + 1;
        const c = a + cols;
        const d = c + 1;
        indexData[ii++] = a; indexData[ii++] = c; indexData[ii++] = b;
        indexData[ii++] = b; indexData[ii++] = c; indexData[ii++] = d;
      }
    }
    this.indexCount = indexData.length;

    this.vertexBuffer = device.createBuffer({ size: vertexData.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    this.indexBuffer = device.createBuffer({ size: indexData.byteLength, usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST });
    writeBuffer(device.queue, this.vertexBuffer, 0, vertexData);
    device.queue.writeBuffer(this.indexBuffer, 0, indexData.buffer, indexData.byteOffset, indexData.byteLength);
  }

  private writeSurfaceUniforms(): void {
    if (!this.gpu || !this.surfaceBuffer) return;
    const data = new Float32Array([
      // colorLow (dark purple)
      0.267, 0.004, 0.329, 1.0,
      // colorHigh (yellow)
      0.993, 0.906, 0.144, 1.0,
      // opacity, wireframe, wireWidth, pad
      this.options.opacity,
      this.options.wireframeOnly ? 2.0 : (this.options.wireframe ? 1.0 : 0.0),
      this.options.resolution,
      0,
    ]);
    writeBuffer(this.gpu.device.queue, this.surfaceBuffer, 0, data);
  }

  render(pass: GPURenderPassEncoder, camera: Camera3DUniformData): void {
    if (!this.pipeline || !this.bindGroup || !this.vertexBuffer || !this.indexBuffer) return;

    // Camera uniforms: viewProjection(16) + cameraPos(3) + pad(1) = 20 floats
    const camData = new Float32Array(20);
    camData.set(camera.viewProjection, 0);
    camData[16] = camera.cameraPos[0];
    camData[17] = camera.cameraPos[1];
    camData[18] = camera.cameraPos[2];
    writeBuffer(this.gpu!.device.queue, this.cameraBuffer!, 0, camData);

    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.setVertexBuffer(0, this.vertexBuffer);
    pass.setIndexBuffer(this.indexBuffer, 'uint32');
    pass.drawIndexed(this.indexCount);
  }

  destroy(): void {
    this.vertexBuffer?.destroy();
    this.indexBuffer?.destroy();
    this.cameraBuffer?.destroy();
    this.surfaceBuffer?.destroy();
  }
}

export function surface(fn: (u: number, v: number) => Vec3, options?: SurfaceOptions): Surface3D {
  return new Surface3D(fn, options);
}
