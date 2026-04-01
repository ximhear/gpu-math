import type { Camera2D } from '../camera/Camera2D.js';
import type { Theme, Vec2 } from '../types.js';

export interface AnnotationData {
  text: string;
  worldPos: Vec2;
  color: string;
  fontSize: number;
  fontStyle: 'normal' | 'italic';
  offset: Vec2; // screen px
}

export class AnnotationOverlay {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private camera: Camera2D;
  private theme: Theme;
  private annotations: AnnotationData[] = [];
  private running = false;
  private refCanvas: HTMLCanvasElement;

  constructor(parentCanvas: HTMLCanvasElement, camera: Camera2D, theme: Theme, wrapper: HTMLDivElement) {
    this.refCanvas = parentCanvas;
    this.camera = camera;
    this.theme = theme;

    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.pointerEvents = 'none';

    wrapper.appendChild(this.canvas);
    this.syncSize();
    this.start();
  }

  private syncSize(): void {
    const w = this.refCanvas.clientWidth;
    const h = this.refCanvas.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
  }

  setAnnotations(data: AnnotationData[]): void {
    this.annotations = data;
  }

  private start(): void {
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      this.draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private draw(): void {
    const dpr = window.devicePixelRatio || 1;
    const w = this.refCanvas.clientWidth;
    const h = this.refCanvas.clientHeight;
    const ctx = this.ctx;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    if (this.annotations.length === 0) return;

    for (const ann of this.annotations) {
      const [sx, sy] = this.camera.worldToScreen(ann.worldPos[0], ann.worldPos[1]);
      const screenX = sx / dpr + ann.offset[0];
      const screenY = sy / dpr + ann.offset[1];

      // Clamp to visible area
      if (screenX < -50 || screenX > w + 50 || screenY < -50 || screenY > h + 50) continue;

      ctx.font = `${ann.fontStyle} ${ann.fontSize}px ${this.theme.font.family}`;
      ctx.fillStyle = ann.color;
      ctx.textBaseline = 'bottom';
      ctx.textAlign = 'left';
      ctx.fillText(ann.text, screenX, screenY);
    }
  }

  destroy(): void {
    this.running = false;
    this.canvas.remove();
  }
}
