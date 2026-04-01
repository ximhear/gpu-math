import type { GPUState } from '../types.js';
import lineShaderSource from '../shaders/line.wgsl';
import { LINE_VERTEX_STRIDE, LINE_VERTEX_ATTRIBUTES } from './LineGeometry.js';

export interface LinePipelineResources {
  pipeline: GPURenderPipeline;
  bindGroupLayout: GPUBindGroupLayout;
}

const cache = new WeakMap<GPUDevice, LinePipelineResources>();

export function getLinePipeline(gpu: GPUState): LinePipelineResources {
  const existing = cache.get(gpu.device);
  if (existing) return existing;

  const { device, format } = gpu;
  const shaderModule = device.createShaderModule({ code: lineShaderSource });

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
      buffers: [{
        arrayStride: LINE_VERTEX_STRIDE,
        attributes: LINE_VERTEX_ATTRIBUTES,
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
      depthWriteEnabled: false,
      depthCompare: 'always',
    },
    primitive: { topology: 'triangle-list' },
  });

  const resources = { pipeline, bindGroupLayout };
  cache.set(gpu.device, resources);
  return resources;
}
