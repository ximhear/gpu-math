import type { GPUState } from '../types.js';
import line3dShaderSource from '../shaders/line3d.wgsl';
import { LINE3D_VERTEX_STRIDE, LINE3D_VERTEX_ATTRIBUTES } from './LineGeometry3D.js';

export interface LinePipeline3DResources {
  pipeline: GPURenderPipeline;
  bindGroupLayout: GPUBindGroupLayout;
}

const cache = new WeakMap<GPUDevice, LinePipeline3DResources>();

export function getLinePipeline3D(gpu: GPUState): LinePipeline3DResources {
  const existing = cache.get(gpu.device);
  if (existing) return existing;

  const { device, format } = gpu;
  const shaderModule = device.createShaderModule({ code: line3dShaderSource });

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' as GPUBufferBindingType } },
      { binding: 1, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' as GPUBufferBindingType } },
    ],
  });

  const pipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
    vertex: {
      module: shaderModule,
      entryPoint: 'vs_main',
      buffers: [{ arrayStride: LINE3D_VERTEX_STRIDE, attributes: LINE3D_VERTEX_ATTRIBUTES }],
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
      depthWriteEnabled: false,
      depthCompare: 'less',
    },
    primitive: { topology: 'triangle-list' },
  });

  const resources = { pipeline, bindGroupLayout };
  cache.set(gpu.device, resources);
  return resources;
}
