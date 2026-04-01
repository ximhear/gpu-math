import type { GPUState } from '../types.js';

export class GpuMathError extends Error {
  constructor(message: string) {
    super(`[gpu-math] ${message}`);
    this.name = 'GpuMathError';
  }
}

export async function initGPU(canvas: HTMLCanvasElement): Promise<GPUState> {
  if (!navigator.gpu) {
    throw new GpuMathError(
      'WebGPU is not supported in this browser. ' +
      'Please use a recent version of Chrome, Edge, Safari, or Firefox.'
    );
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new GpuMathError('Failed to get GPU adapter.');
  }

  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu');
  if (!context) {
    throw new GpuMathError('Failed to get WebGPU canvas context.');
  }

  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: 'premultiplied' });

  return { device, context, format };
}
