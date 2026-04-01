/** Create a canvas element with a title, append to container */
export function createDemo(
  container: HTMLElement,
  title: string,
  code: string,
  width = 420,
  height = 320,
): HTMLCanvasElement {
  const section = document.createElement('div');
  section.className = 'demo';

  const h3 = document.createElement('h3');
  h3.textContent = title;
  section.appendChild(h3);

  const canvas = document.createElement('canvas');
  canvas.style.borderRadius = '8px';
  canvas.style.cursor = 'grab';
  section.appendChild(canvas);

  const pre = document.createElement('pre');
  const codeEl = document.createElement('code');
  codeEl.textContent = code.trim();
  pre.appendChild(codeEl);
  section.appendChild(pre);

  container.appendChild(section);
  return canvas;
}
