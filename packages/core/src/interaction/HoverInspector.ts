import type { Camera2D } from '../camera/Camera2D.js';
import type { Plot2D } from '../objects/Plot2D.js';

export class HoverInspector {
  private canvas: HTMLCanvasElement;
  private overlay: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private camera: Camera2D;
  private plots: Plot2D[] = [];
  private enabled = true;

  constructor(canvas: HTMLCanvasElement, camera: Camera2D, wrapper: HTMLDivElement) {
    this.canvas = canvas;
    this.camera = camera;

    this.overlay = document.createElement('canvas');
    this.ctx = this.overlay.getContext('2d')!;
    this.overlay.style.position = 'absolute';
    this.overlay.style.top = '0';
    this.overlay.style.left = '0';
    this.overlay.style.pointerEvents = 'none';

    wrapper.appendChild(this.overlay);
    this.syncSize();

    canvas.addEventListener('mousemove', this.onMove);
    canvas.addEventListener('mouseleave', this.onLeave);
  }

  setPlots(plots: Plot2D[]): void {
    this.plots = plots;
  }

  private syncSize(): void {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    this.overlay.width = w * dpr;
    this.overlay.height = h * dpr;
    this.overlay.style.width = `${w}px`;
    this.overlay.style.height = `${h}px`;
  }

  private onMove = (e: MouseEvent) => {
    if (!this.enabled || this.plots.length === 0) return;

    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const sx = (e.clientX - rect.left) * dpr;
    const sy = (e.clientY - rect.top) * dpr;
    const [wx] = this.camera.screenToWorld(sx, sy);

    let bestPlot: Plot2D | null = null;
    let bestY = 0;
    let bestDist = Infinity;

    for (const p of this.plots) {
      const y = p.currentFn(wx);
      if (!isFinite(y)) continue;
      const [, screenY] = this.camera.worldToScreen(wx, y);
      const dist = Math.abs(screenY - sy);
      if (dist < bestDist && dist < 30 * dpr) {
        bestDist = dist;
        bestPlot = p;
        bestY = y;
      }
    }

    this.drawTooltip(e.clientX - rect.left, e.clientY - rect.top, wx, bestY, bestPlot);
  };

  private onLeave = () => {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.clearRect(0, 0, w, h);
  };

  private drawTooltip(sx: number, sy: number, wx: number, wy: number, plot: Plot2D | null): void {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.clearRect(0, 0, w, h);

    if (!plot) return;

    // worldToScreen returns physical pixels; convert to CSS pixels for drawing
    const [dotSx, dotSy] = this.camera.worldToScreen(wx, wy);
    const dotX = dotSx / dpr;
    const dotY = dotSy / dpr;

    this.ctx.fillStyle = plot.color;
    this.ctx.beginPath();
    this.ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
    this.ctx.fill();

    // Tooltip text
    const text = `(${wx.toFixed(2)}, ${wy.toFixed(2)})`;
    this.ctx.font = '12px system-ui, sans-serif';
    const metrics = this.ctx.measureText(text);
    const tw = metrics.width + 12;
    const th = 22;
    let tx = dotX + 10;
    let ty = dotY - 20;
    if (tx + tw > w) tx = dotX - tw - 10;
    if (ty < 0) ty = dotY + 10;

    this.ctx.fillStyle = 'rgba(0,0,0,0.75)';
    this.ctx.beginPath();
    this.ctx.roundRect(tx, ty, tw, th, 4);
    this.ctx.fill();

    this.ctx.fillStyle = '#fff';
    this.ctx.fillText(text, tx + 6, ty + 15);
  }

  destroy(): void {
    this.canvas.removeEventListener('mousemove', this.onMove);
    this.canvas.removeEventListener('mouseleave', this.onLeave);
    this.overlay.remove();
  }
}
