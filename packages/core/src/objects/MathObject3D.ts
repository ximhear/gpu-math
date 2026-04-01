import type { GPUState } from '../types.js';
import type { Camera3DUniformData } from '../camera/Camera3D.js';

export abstract class MathObject3D {
  abstract init(gpu: GPUState): void;
  abstract render(pass: GPURenderPassEncoder, camera: Camera3DUniformData): void;
  abstract destroy(): void;
}
