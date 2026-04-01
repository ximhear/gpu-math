export interface ParamDef {
  name: string;
  min: number;
  max: number;
  value: number;
  step: number;
  onChange: (value: number) => void;
}

export class ParamSliderOverlay {
  private canvas: HTMLCanvasElement;
  private overlay: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private params: ParamDef[] = [];
  private dragging: number | null = null;
  private running = false;

  constructor(refCanvas: HTMLCanvasElement, wrapper: HTMLDivElement) {
    this.canvas = refCanvas;
    this.overlay = document.createElement('canvas');
    this.ctx = this.overlay.getContext('2d')!;

    this.overlay.style.position = 'absolute';
    this.overlay.style.bottom = '0';
    this.overlay.style.left = '0';
    this.overlay.style.pointerEvents = 'auto';
    this.overlay.style.cursor = 'default';

    wrapper.appendChild(this.overlay);
    this.syncSize();

    this.overlay.addEventListener('pointerdown', this.onDown);
    this.overlay.addEventListener('pointermove', this.onMove);
    this.overlay.addEventListener('pointerup', this.onUp);
    this.overlay.addEventListener('pointerleave', this.onUp);
  }

  addParam(def: ParamDef): void {
    this.params.push(def);
    this.syncSize();
    if (!this.running) this.startDrawLoop();
  }

  private syncSize(): void {
    const w = this.canvas.clientWidth;
    const h = this.params.length * 32 + 8;
    const dpr = window.devicePixelRatio || 1;
    this.overlay.width = w * dpr;
    this.overlay.height = h * dpr;
    this.overlay.style.width = `${w}px`;
    this.overlay.style.height = `${h}px`;
  }

  private startDrawLoop(): void {
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      this.draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private draw(): void {
    if (this.params.length === 0) return;
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth;
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, this.params.length * 32 + 8);

    const pad = 12;
    const trackLeft = 60;
    const trackRight = w - pad;
    const trackW = trackRight - trackLeft;

    for (let i = 0; i < this.params.length; i++) {
      const p = this.params[i];
      const y = 4 + i * 32 + 16;

      // Label
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillStyle = '#aaa';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.name, trackLeft - 8, y);

      // Track
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.roundRect(trackLeft, y - 3, trackW, 6, 3);
      ctx.fill();

      // Thumb position
      const frac = (p.value - p.min) / (p.max - p.min);
      const thumbX = trackLeft + frac * trackW;

      // Filled portion
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.roundRect(trackLeft, y - 3, thumbX - trackLeft, 6, 3);
      ctx.fill();

      // Thumb
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(thumbX, y, 7, 0, Math.PI * 2);
      ctx.fill();

      // Value
      ctx.fillStyle = '#888';
      ctx.textAlign = 'left';
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillText(p.value.toFixed(2), trackRight + 6, y);
    }
  }

  private hitTest(ex: number, ey: number): { paramIdx: number; frac: number } | null {
    const w = this.canvas.clientWidth;
    const pad = 12;
    const trackLeft = 60;
    const trackRight = w - pad;
    const trackW = trackRight - trackLeft;

    for (let i = 0; i < this.params.length; i++) {
      const y = 4 + i * 32 + 16;
      if (Math.abs(ey - y) < 16 && ex >= trackLeft - 10 && ex <= trackRight + 10) {
        const frac = Math.max(0, Math.min(1, (ex - trackLeft) / trackW));
        return { paramIdx: i, frac };
      }
    }
    return null;
  }

  private updateFromFrac(idx: number, frac: number): void {
    const p = this.params[idx];
    let val = p.min + frac * (p.max - p.min);
    if (p.step > 0) val = Math.round(val / p.step) * p.step;
    val = Math.max(p.min, Math.min(p.max, val));
    if (val !== p.value) {
      p.value = val;
      p.onChange(val);
    }
  }

  private onDown = (e: PointerEvent) => {
    const rect = this.overlay.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const hit = this.hitTest(x, y);
    if (hit) {
      this.dragging = hit.paramIdx;
      this.updateFromFrac(hit.paramIdx, hit.frac);
      this.overlay.setPointerCapture(e.pointerId);
      e.stopPropagation();
    }
  };

  private onMove = (e: PointerEvent) => {
    if (this.dragging === null) return;
    const rect = this.overlay.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const w = this.canvas.clientWidth;
    const trackLeft = 60;
    const trackRight = w - 12;
    const frac = Math.max(0, Math.min(1, (x - trackLeft) / (trackRight - trackLeft)));
    this.updateFromFrac(this.dragging, frac);
    e.stopPropagation();
  };

  private onUp = () => {
    this.dragging = null;
  };

  destroy(): void {
    this.running = false;
    this.overlay.removeEventListener('pointerdown', this.onDown);
    this.overlay.removeEventListener('pointermove', this.onMove);
    this.overlay.removeEventListener('pointerup', this.onUp);
    this.overlay.removeEventListener('pointerleave', this.onUp);
    this.overlay.remove();
  }
}
