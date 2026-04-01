import type { Camera2D } from '../camera/Camera2D.js';
import type { Theme } from '../types.js';

export class AxisLabels {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private camera: Camera2D;
  private theme: Theme;
  private running = false;

  constructor(parentCanvas: HTMLCanvasElement, camera: Camera2D, theme: Theme, wrapper: HTMLDivElement) {
    this.camera = camera;
    this.theme = theme;

    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.pointerEvents = 'none';

    wrapper.appendChild(this.canvas);
    this.syncSize(parentCanvas);
    this.start();
  }

  private syncSize(ref: HTMLCanvasElement): void {
    const w = ref.clientWidth;
    const h = ref.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
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
    const w = this.canvas.width / dpr;
    const h = this.canvas.height / dpr;
    const ctx = this.ctx;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const fontSize = this.theme.font.size - 2;
    ctx.font = `${fontSize}px ${this.theme.font.family}`;
    ctx.fillStyle = this.theme.axis.labelColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Determine nice tick spacing based on zoom
    const pxPerUnit = this.camera.zoom;
    const minTickPx = 50;
    const rawSpacing = minTickPx / pxPerUnit;
    const spacing = niceStep(rawSpacing);

    // Compute visible range
    const [xMin] = this.camera.screenToWorld(0, h * dpr / 2);
    const [xMax] = this.camera.screenToWorld(w * dpr, h * dpr / 2);
    const [, yMin] = this.camera.screenToWorld(w * dpr / 2, h * dpr);
    const [, yMax] = this.camera.screenToWorld(w * dpr / 2, 0);

    // X-axis labels
    const xStart = Math.ceil(xMin / spacing) * spacing;
    for (let x = xStart; x <= xMax; x += spacing) {
      if (Math.abs(x) < spacing * 0.01) continue; // skip 0
      const [sx, sy] = this.camera.worldToScreen(x, 0);
      const screenX = sx / dpr;
      const screenY = sy / dpr;
      if (screenY > 0 && screenY < h) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(formatTick(x), screenX, Math.min(screenY + 4, h - fontSize - 2));
      }
    }

    // Y-axis labels
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const yStart = Math.ceil(yMin / spacing) * spacing;
    for (let y = yStart; y <= yMax; y += spacing) {
      if (Math.abs(y) < spacing * 0.01) continue;
      const [sx, sy] = this.camera.worldToScreen(0, y);
      const screenX = sx / dpr;
      const screenY = sy / dpr;
      if (screenX > 0 && screenX < w) {
        ctx.fillText(formatTick(y), Math.max(screenX - 6, fontSize * 3), screenY);
      }
    }
  }

  destroy(): void {
    this.running = false;
    this.canvas.remove();
  }
}

function niceStep(raw: number): number {
  const exp = Math.pow(10, Math.floor(Math.log10(raw)));
  const frac = raw / exp;
  if (frac <= 1) return exp;
  if (frac <= 2) return 2 * exp;
  if (frac <= 5) return 5 * exp;
  return 10 * exp;
}

function formatTick(v: number): string {
  if (Number.isInteger(v)) return v.toString();
  const s = v.toFixed(2);
  return s.replace(/\.?0+$/, '');
}
