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

/** Check if text contains LaTeX ($...$) */
function isLatex(text: string): boolean {
  return text.startsWith('$') && text.endsWith('$') && text.length > 2;
}

let katexLoaded: typeof import('katex') | null = null;
let katexLoadPromise: Promise<typeof import('katex')> | null = null;

function loadKaTeX(): Promise<typeof import('katex')> {
  if (katexLoaded) return Promise.resolve(katexLoaded);
  if (katexLoadPromise) return katexLoadPromise;

  // Load CSS
  if (!document.querySelector('link[data-gpu-math-katex]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css';
    link.setAttribute('data-gpu-math-katex', '');
    document.head.appendChild(link);
  }

  katexLoadPromise = import('katex').then(m => {
    katexLoaded = m;
    return m;
  });
  return katexLoadPromise;
}

interface LabelElement {
  el: HTMLDivElement;
  data: AnnotationData;
}

/**
 * Renders annotations as positioned DOM elements.
 * Plain text → styled div, LaTeX ($...$) → KaTeX HTML div.
 */
export class AnnotationOverlay {
  private container: HTMLDivElement;
  private camera: Camera2D;
  private theme: Theme;
  private refCanvas: HTMLCanvasElement;
  private labels: LabelElement[] = [];
  private running = false;

  constructor(parentCanvas: HTMLCanvasElement, camera: Camera2D, theme: Theme, wrapper: HTMLDivElement) {
    this.refCanvas = parentCanvas;
    this.camera = camera;
    this.theme = theme;

    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: absolute; top: 0; left: 0;
      width: ${parentCanvas.clientWidth}px;
      height: ${parentCanvas.clientHeight}px;
      pointer-events: none;
      overflow: hidden;
    `;
    wrapper.appendChild(this.container);
    this.start();
  }

  setAnnotations(data: AnnotationData[]): void {
    // Remove old labels
    for (const l of this.labels) l.el.remove();
    this.labels = [];

    for (const ann of data) {
      const el = document.createElement('div');
      el.style.cssText = `
        position: absolute;
        white-space: nowrap;
        pointer-events: none;
        color: ${ann.color};
        font-size: ${ann.fontSize}px;
        font-family: ${this.theme.font.family};
        line-height: 1.2;
      `;

      if (isLatex(ann.text)) {
        el.style.fontStyle = 'normal';
        // Render KaTeX asynchronously
        loadKaTeX().then(katex => {
          el.innerHTML = katex.renderToString(ann.text.slice(1, -1), {
            throwOnError: false,
            displayMode: false,
          });
        });
      } else {
        el.style.fontStyle = ann.fontStyle;
        el.textContent = ann.text;
      }

      this.container.appendChild(el);
      this.labels.push({ el, data: ann });
    }
  }

  private start(): void {
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      this.updatePositions();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private updatePositions(): void {
    const dpr = window.devicePixelRatio || 1;

    for (const l of this.labels) {
      const [sx, sy] = this.camera.worldToScreen(l.data.worldPos[0], l.data.worldPos[1]);
      const screenX = sx / dpr + l.data.offset[0];
      const screenY = sy / dpr + l.data.offset[1];

      l.el.style.left = `${screenX}px`;
      l.el.style.top = `${screenY}px`;
      l.el.style.transform = 'translateY(-100%)'; // anchor bottom-left
    }
  }

  destroy(): void {
    this.running = false;
    this.container.remove();
  }
}
