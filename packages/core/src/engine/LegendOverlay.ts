export interface LegendEntry {
  label: string;
  color: string;
}

export class LegendOverlay {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private refCanvas: HTMLCanvasElement;

  constructor(parentCanvas: HTMLCanvasElement, wrapper: HTMLDivElement) {
    this.refCanvas = parentCanvas;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;

    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.pointerEvents = 'none';

    wrapper.appendChild(this.canvas);
    this.syncSize();
  }

  private syncSize(): void {
    const w = this.refCanvas.clientWidth;
    const h = this.refCanvas.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.scale(dpr, dpr);
  }

  draw(entries: LegendEntry[]): void {
    const visible = entries.filter(e => e.label);
    if (visible.length === 0) return;

    const ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);

    const fontSize = 13;
    const lineH = fontSize + 8;
    const padding = 10;
    const swatchW = 20;
    const gap = 6;

    ctx.font = `${fontSize}px system-ui, sans-serif`;

    let maxW = 0;
    for (const e of visible) {
      maxW = Math.max(maxW, ctx.measureText(e.label).width);
    }

    const boxW = padding * 2 + swatchW + gap + maxW;
    const boxH = padding * 2 + visible.length * lineH - 8;
    const canvasW = this.canvas.width / dpr;
    const x0 = canvasW - boxW - 12;
    const y0 = 12;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.roundRect(x0, y0, boxW, boxH, 6);
    ctx.fill();

    for (let i = 0; i < visible.length; i++) {
      const e = visible[i];
      const y = y0 + padding + i * lineH;

      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.roundRect(x0 + padding, y, swatchW, fontSize, 3);
      ctx.fill();

      ctx.fillStyle = '#e0e0e0';
      ctx.fillText(e.label, x0 + padding + swatchW + gap, y + fontSize - 1);
    }
  }

  destroy(): void {
    this.canvas.remove();
  }
}
