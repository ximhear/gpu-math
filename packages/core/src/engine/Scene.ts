import type { SceneOptions2D } from '../types.js';
import { initGPU } from './Device.js';
import { Renderer } from './Renderer.js';
import { Camera2D } from '../camera/Camera2D.js';
import { CameraController } from '../camera/CameraController.js';
import { LegendOverlay } from './LegendOverlay.js';
import { HoverInspector } from '../interaction/HoverInspector.js';
import { AxisLabels } from './AxisLabels.js';
import { wrapCanvas } from './OverlayContainer.js';
import { getAutoColor } from '../themes/palettes.js';
import { resolveTheme } from '../themes/builtins.js';
import type { MathObject } from '../objects/MathObject.js';
import type { Plot2D } from '../objects/Plot2D.js';

export interface Scene2D {
  add(obj: MathObject): void;
  remove(obj: MathObject): void;
  camera: Camera2D;
  destroy(): void;
}

function getLabel(obj: MathObject): string {
  return 'label' in obj ? (obj as { label: string }).label : '';
}

function getColor(obj: MathObject): string {
  return 'color' in obj ? (obj as { color: string }).color : '';
}

export async function createScene(
  canvas: HTMLCanvasElement,
  options?: SceneOptions2D,
): Promise<Scene2D> {
  const dpr = options?.pixelRatio === 'auto' || options?.pixelRatio === undefined
    ? window.devicePixelRatio || 1
    : options.pixelRatio;

  const width = options?.width ?? (canvas.clientWidth || 800);
  const height = options?.height ?? (canvas.clientHeight || 600);
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  // Wrap canvas in a container so overlays align correctly
  const wrapper = wrapCanvas(canvas);

  const gpu = await initGPU(canvas);
  const camera = new Camera2D(canvas);
  const renderer = new Renderer(gpu, camera);
  const legend = new LegendOverlay(canvas, wrapper);
  const hover = new HoverInspector(canvas, camera, wrapper);

  const theme = resolveTheme(options?.theme);
  renderer.applyTheme(theme);
  const axisLabels = new AxisLabels(canvas, camera, theme, wrapper);

  let controller: CameraController | null = null;
  if (options?.interactive !== false) {
    controller = new CameraController(canvas, camera);
  }

  let colorIndex = 0;
  const objects: MathObject[] = [];

  function updateLegend() {
    const entries = objects
      .map(o => ({ label: getLabel(o), color: getColor(o) }))
      .filter(e => e.label);
    legend.draw(entries);
  }

  function updateHover() {
    const plots = objects.filter((o): o is Plot2D => 'currentFn' in o);
    hover.setPlots(plots);
  }

  renderer.start();

  return {
    camera,
    add(obj: MathObject) {
      const hasExplicit = 'hasExplicitColor' in obj && (obj as { hasExplicitColor: boolean }).hasExplicitColor;
      if ('setColor' in obj && typeof (obj as { setColor: unknown }).setColor === 'function' && !hasExplicit) {
        (obj as { setColor: (c: string) => void }).setColor(getAutoColor(colorIndex));
      }
      colorIndex++;
      objects.push(obj);
      renderer.add(obj);
      updateLegend();
      updateHover();
    },
    remove(obj: MathObject) {
      const idx = objects.indexOf(obj);
      if (idx !== -1) objects.splice(idx, 1);
      renderer.remove(obj);
      updateLegend();
      updateHover();
    },
    destroy() {
      controller?.destroy();
      renderer.destroy();
      legend.destroy();
      hover.destroy();
      axisLabels.destroy();
    },
  };
}
