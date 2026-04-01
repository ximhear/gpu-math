import type { Camera3D } from './Camera3D.js';

export class CameraController3D {
  private camera: Camera3D;
  private canvas: HTMLCanvasElement;
  private isDragging = false;
  private lastX = 0;
  private lastY = 0;

  constructor(canvas: HTMLCanvasElement, camera: Camera3D) {
    this.canvas = canvas;
    this.camera = camera;

    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointerup', this.onUp);
    canvas.addEventListener('pointerleave', this.onUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.style.touchAction = 'none';
  }

  private onDown = (e: PointerEvent) => {
    this.isDragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.canvas.setPointerCapture(e.pointerId);
  };

  private onMove = (e: PointerEvent) => {
    if (!this.isDragging) return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.camera.rotate(-dx * 0.01, -dy * 0.01);
  };

  private onUp = () => { this.isDragging = false; };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.camera.zoom(e.deltaY > 0 ? 1.1 : 1 / 1.1);
  };

  destroy(): void {
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('pointerup', this.onUp);
    this.canvas.removeEventListener('pointerleave', this.onUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
  }
}
