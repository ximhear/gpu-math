/**
 * Creates a wrapper div around the WebGPU canvas so that
 * all Canvas2D overlays (legend, hover, axis labels) are
 * positioned correctly relative to the rendering canvas,
 * regardless of sibling elements (like <h2>) in the parent.
 */
export function wrapCanvas(canvas: HTMLCanvasElement): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.style.position = 'relative';
  wrapper.style.display = 'inline-block';
  wrapper.style.lineHeight = '0'; // prevent extra space below canvas

  canvas.parentElement?.insertBefore(wrapper, canvas);
  wrapper.appendChild(canvas);

  return wrapper;
}

/**
 * Create an overlay canvas positioned on top of the WebGPU canvas.
 */
export function createOverlayCanvas(wrapper: HTMLDivElement, ref: HTMLCanvasElement): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.pointerEvents = 'none';

  const dpr = window.devicePixelRatio || 1;
  const w = ref.clientWidth;
  const h = ref.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;

  wrapper.appendChild(canvas);

  return { canvas, ctx };
}
