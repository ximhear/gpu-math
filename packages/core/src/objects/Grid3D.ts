import type { GPUState } from '../types.js';
import type { Camera3DUniformData } from '../camera/Camera3D.js';
import { MathObject3D } from './MathObject3D.js';
import { buildLineVertices3D } from '../engine/LineGeometry3D.js';
import { getLinePipeline3D } from '../engine/LinePipeline3D.js';
import { writeCamera3DUniforms, CAMERA3D_BUFFER_SIZE } from '../engine/camera3dBuffer.js';
import { writeBuffer } from '../engine/gpu.js';
import grid3dShaderSource from '../shaders/grid3d.wgsl';

export class Grid3D extends MathObject3D {
  private gpu: GPUState | null = null;
  // Floor grid
  private gridPipeline: GPURenderPipeline | null = null;
  private gridCameraBuffer: GPUBuffer | null = null;
  private gridBindGroup: GPUBindGroup | null = null;
  // Axis lines
  private axisPipeline: GPURenderPipeline | null = null;
  private axisCameraBuffer: GPUBuffer | null = null;
  private axisLineBuffer: GPUBuffer | null = null;
  private axisBindGroup: GPUBindGroup | null = null;
  private axisVertexBuffer: GPUBuffer | null = null;
  private axisVertexCount = 0;

  init(gpu: GPUState): void {
    this.gpu = gpu;
    const { device, format } = gpu;

    // === Floor grid pipeline ===
    const gridShader = device.createShaderModule({ code: grid3dShaderSource });
    const gridBGL = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' as GPUBufferBindingType } },
      ],
    });
    this.gridCameraBuffer = device.createBuffer({ size: CAMERA3D_BUFFER_SIZE, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.gridBindGroup = device.createBindGroup({
      layout: gridBGL,
      entries: [{ binding: 0, resource: { buffer: this.gridCameraBuffer } }],
    });
    this.gridPipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [gridBGL] }),
      vertex: { module: gridShader, entryPoint: 'vs_main' },
      fragment: {
        module: gridShader, entryPoint: 'fs_main',
        targets: [{
          format,
          blend: {
            color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
            alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          },
        }],
      },
      depthStencil: { format: 'depth24plus', depthWriteEnabled: false, depthCompare: 'less' },
      primitive: { topology: 'triangle-list' },
    });

    // === Axis lines (X=red, Y=green, Z=blue) ===
    const { pipeline, bindGroupLayout } = getLinePipeline3D(gpu);
    this.axisPipeline = pipeline;
    this.axisCameraBuffer = device.createBuffer({ size: CAMERA3D_BUFFER_SIZE, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.axisLineBuffer = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.axisBindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.axisCameraBuffer } },
        { binding: 1, resource: { buffer: this.axisLineBuffer } },
      ],
    });

    // Build axis geometry: 3 lines
    const axisLen = 10;
    const axes = [
      [{ x: 0, y: 0, z: 0 }, { x: axisLen, y: 0, z: 0 }], // X
      [{ x: 0, y: 0, z: 0 }, { x: 0, y: axisLen, z: 0 }], // Y
      [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: axisLen }], // Z
    ];
    const parts = axes.map(a => buildLineVertices3D(a));
    let total = 0;
    for (const p of parts) total += p.data.length;
    const combined = new Float32Array(total);
    let off = 0;
    for (const p of parts) { combined.set(p.data, off); off += p.data.length; }
    this.axisVertexCount = parts.reduce((s, p) => s + p.vertexCount, 0);

    this.axisVertexBuffer = device.createBuffer({ size: combined.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    writeBuffer(device.queue, this.axisVertexBuffer, 0, combined);

    // Axis line uniforms (white, thin)
    writeBuffer(device.queue, this.axisLineBuffer, 0, new Float32Array([0.7, 0.7, 0.7, 0.6, 1.5, 0, 0, 0]));
  }

  render(pass: GPURenderPassEncoder, camera: Camera3DUniformData): void {
    // Floor grid
    if (this.gridPipeline && this.gridBindGroup && this.gridCameraBuffer) {
      writeCamera3DUniforms(this.gpu!.device.queue, this.gridCameraBuffer, camera);
      pass.setPipeline(this.gridPipeline);
      pass.setBindGroup(0, this.gridBindGroup);
      pass.draw(6);
    }
    // Axis lines
    if (this.axisPipeline && this.axisBindGroup && this.axisVertexBuffer && this.axisVertexCount > 0) {
      writeCamera3DUniforms(this.gpu!.device.queue, this.axisCameraBuffer!, camera);
      pass.setPipeline(this.axisPipeline);
      pass.setBindGroup(0, this.axisBindGroup);
      pass.setVertexBuffer(0, this.axisVertexBuffer);
      pass.draw(this.axisVertexCount);
    }
  }

  destroy(): void {
    this.gridCameraBuffer?.destroy();
    this.axisCameraBuffer?.destroy();
    this.axisLineBuffer?.destroy();
    this.axisVertexBuffer?.destroy();
  }
}
