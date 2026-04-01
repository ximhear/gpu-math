import type { SceneOptions3D } from '../types.js';
import { initGPU } from './Device.js';
import { Renderer3D } from './Renderer3D.js';
import { Camera3D } from '../camera/Camera3D.js';
import { CameraController3D } from '../camera/CameraController3D.js';
import type { MathObject3D } from '../objects/MathObject3D.js';
import { Grid3D } from '../objects/Grid3D.js';

export interface Scene3DHandle {
  add(obj: MathObject3D): void;
  remove(obj: MathObject3D): void;
  camera: Camera3D;
  destroy(): void;
}

export async function createScene3D(
  canvas: HTMLCanvasElement,
  options?: Omit<SceneOptions3D, 'dimension'>,
): Promise<Scene3DHandle> {
  const dpr = options?.pixelRatio === 'auto' || options?.pixelRatio === undefined
    ? window.devicePixelRatio || 1
    : options.pixelRatio;

  const width = options?.width ?? (canvas.clientWidth || 800);
  const height = options?.height ?? (canvas.clientHeight || 600);
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const gpu = await initGPU(canvas);
  const camera = new Camera3D(canvas);
  if (options?.fov) camera.fov = options.fov;
  const renderer = new Renderer3D(gpu, camera);

  let controller: CameraController3D | null = null;
  if (options?.interactive !== false) {
    controller = new CameraController3D(canvas, camera);
  }

  // Add default grid + axes
  const grid = new Grid3D();
  renderer.add(grid);

  renderer.start();

  return {
    camera,
    add(obj: MathObject3D) { renderer.add(obj); },
    remove(obj: MathObject3D) { renderer.remove(obj); },
    destroy() {
      controller?.destroy();
      renderer.destroy();
    },
  };
}
