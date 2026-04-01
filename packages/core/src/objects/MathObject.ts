import type { GPUState } from '../types.js';
import type { CameraUniformData } from '../camera/Camera2D.js';

export abstract class MathObject {
  abstract init(gpu: GPUState): void;
  abstract render(pass: GPURenderPassEncoder, camera: CameraUniformData): void;
  abstract destroy(): void;
}
