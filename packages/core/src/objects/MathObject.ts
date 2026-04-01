import type { GPUState } from '../types.js';
import type { CameraUniformData } from '../camera/Camera2D.js';

export abstract class MathObject {
  abstract init(gpu: GPUState): void;
  abstract render(pass: GPURenderPassEncoder, camera: CameraUniformData): void;
  abstract destroy(): void;

  /** Called when external state (e.g. scene.param) changes. Override to rebuild geometry. */
  refresh(): void {
    // Default: no-op. Subclasses that depend on external state should override.
  }
}
