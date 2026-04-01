import type { Camera2D } from './Camera2D.js';

export class CameraController {
  private camera: Camera2D;
  private canvas: HTMLCanvasElement;
  private isDragging = false;
  private lastX = 0;
  private lastY = 0;
  private onPointerDownBound: (e: PointerEvent) => void;
  private onPointerMoveBound: (e: PointerEvent) => void;
  private onPointerUpBound: (e: PointerEvent) => void;
  private onWheelBound: (e: WheelEvent) => void;

  constructor(canvas: HTMLCanvasElement, camera: Camera2D) {
    this.canvas = canvas;
    this.camera = camera;

    this.onPointerDownBound = this.onPointerDown.bind(this);
    this.onPointerMoveBound = this.onPointerMove.bind(this);
    this.onPointerUpBound = this.onPointerUp.bind(this);
    this.onWheelBound = this.onWheel.bind(this);

    canvas.addEventListener('pointerdown', this.onPointerDownBound);
    canvas.addEventListener('pointermove', this.onPointerMoveBound);
    canvas.addEventListener('pointerup', this.onPointerUpBound);
    canvas.addEventListener('pointerleave', this.onPointerUpBound);
    canvas.addEventListener('wheel', this.onWheelBound, { passive: false });
    canvas.style.touchAction = 'none';
  }

  private onPointerDown(e: PointerEvent): void {
    this.isDragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.canvas.setPointerCapture(e.pointerId);
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.isDragging) return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.camera.pan(dx, dy);
  }

  private onPointerUp(_e: PointerEvent): void {
    this.isDragging = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const sx = (e.clientX - rect.left) * window.devicePixelRatio;
    const sy = (e.clientY - rect.top) * window.devicePixelRatio;
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    this.camera.zoomAt(factor, sx, sy);
  }

  destroy(): void {
    this.canvas.removeEventListener('pointerdown', this.onPointerDownBound);
    this.canvas.removeEventListener('pointermove', this.onPointerMoveBound);
    this.canvas.removeEventListener('pointerup', this.onPointerUpBound);
    this.canvas.removeEventListener('pointerleave', this.onPointerUpBound);
    this.canvas.removeEventListener('wheel', this.onWheelBound);
  }
}
