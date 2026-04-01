import type { GPUState } from '../types.js';
import fillShaderSource from '../shaders/fill.wgsl';

export interface FillPipelineResources {
  pipeline: GPURenderPipeline;
  bindGroupLayout: GPUBindGroupLayout;
}

const cache = new WeakMap<GPUDevice, FillPipelineResources>();

export function getFillPipeline(gpu: GPUState): FillPipelineResources {
  const existing = cache.get(gpu.device);
  if (existing) return existing;

  const { device, format } = gpu;
  const shaderModule = device.createShaderModule({ code: fillShaderSource });

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' as GPUBufferBindingType } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' as GPUBufferBindingType } },
    ],
  });

  const pipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
    vertex: {
      module: shaderModule,
      entryPoint: 'vs_main',
      buffers: [{
        arrayStride: 2 * 4,
        attributes: [
          { shaderLocation: 0, offset: 0, format: 'float32x2' as GPUVertexFormat },
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
      depthWriteEnabled: false,
      depthCompare: 'always',
    },
    primitive: { topology: 'triangle-list' },
  });

  const resources = { pipeline, bindGroupLayout };
  cache.set(gpu.device, resources);
  return resources;
}
