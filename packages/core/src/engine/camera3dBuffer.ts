import type { Camera3DUniformData } from '../camera/Camera3D.js';
import { writeBuffer } from './gpu.js';

/** Write Camera3DUniforms (viewProjection + resolution + pixelRatio) to a GPU buffer.
 *  Layout: mat4(16) + vec2(2) + f32(1) + pad(1) = 20 floats = 80 bytes */
export const CAMERA3D_BUFFER_SIZE = 80;

export function writeCamera3DUniforms(
  queue: GPUQueue,
  buffer: GPUBuffer,
  camera: Camera3DUniformData,
): void {
  const data = new Float32Array(20);
  data.set(camera.viewProjection, 0);
  data[16] = camera.resolution[0];
  data[17] = camera.resolution[1];
  data[18] = camera.pixelRatio;
  writeBuffer(queue, buffer, 0, data);
}
