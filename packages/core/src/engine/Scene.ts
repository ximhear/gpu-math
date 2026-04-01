import type { SceneOptions2D } from '../types.js';
import { initGPU } from './Device.js';
import { Renderer } from './Renderer.js';
import { Camera2D } from '../camera/Camera2D.js';
import { CameraController } from '../camera/CameraController.js';
import { LegendOverlay } from './LegendOverlay.js';
import { HoverInspector } from '../interaction/HoverInspector.js';
import { ParamSliderOverlay, type ParamDef } from '../interaction/ParamSlider.js';
import { AxisLabels } from './AxisLabels.js';
import { wrapCanvas } from './OverlayContainer.js';
import { getAutoColor } from '../themes/palettes.js';
import { resolveTheme } from '../themes/builtins.js';
import { AnnotationOverlay, type AnnotationData } from './AnnotationOverlay.js';
import type { MathObject } from '../objects/MathObject.js';
import type { Plot2D } from '../objects/Plot2D.js';
import { Label2D } from '../objects/Label2D.js';
import { Point2D } from '../objects/Point2D.js';

export interface ParamHandle {
  value: number;
}

export interface ParamOptions {
  min: number;
  max: number;
  value?: number;
  step?: number;
}

export interface ExportImageOptions {
  scale?: number; // default 1, use 2 for retina
}

export interface Scene2D {
  add(obj: MathObject): void;
  remove(obj: MathObject): void;
  param(name: string, options: ParamOptions): ParamHandle;
  exportImage(options?: ExportImageOptions): Promise<string>;
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
  if (options?.axisScale) {
    camera.scale = [options.axisScale[0], options.axisScale[1]];
  }
  const renderer = new Renderer(gpu, camera);
  const legend = new LegendOverlay(canvas, wrapper);
  const hover = new HoverInspector(canvas, camera, wrapper);

  const theme = resolveTheme(options?.theme);
  renderer.applyTheme(theme);
  const axisLabels = new AxisLabels(canvas, camera, theme, wrapper);
  const annotationOverlay = new AnnotationOverlay(canvas, camera, theme, wrapper);
  const sliders = new ParamSliderOverlay(canvas, wrapper);

  let controller: CameraController | null = null;
  if (options?.interactive !== false) {
    controller = new CameraController(canvas, camera);
  }

  let colorIndex = 0;
  const objects: MathObject[] = [];

  function updateLegend() {
    // Points and Labels show inline, not in legend. Plots show in legend.
    const entries = objects
      .filter(o => !(o instanceof Point2D) && !(o instanceof Label2D))
      .map(o => ({ label: getLabel(o), color: getColor(o) }))
      .filter(e => e.label);
    legend.draw(entries);
  }

  function updateAnnotations() {
    const data: AnnotationData[] = [];
    for (const obj of objects) {
      if (obj instanceof Label2D) {
        const opts = obj.labelOptions;
        data.push({
          text: obj.text,
          worldPos: obj.position,
          color: opts.color,
          fontSize: opts.fontSize,
          fontStyle: opts.fontStyle,
          offset: opts.offset,
        });
      } else if (obj instanceof Point2D && obj.label) {
        data.push({
          text: obj.label,
          worldPos: obj.position,
          color: obj.color,
          fontSize: 14,
          fontStyle: 'italic',
          offset: [6, -6],
        });
      }
    }
    annotationOverlay.setAnnotations(data);
  }

  function updateHover() {
    const plots = objects.filter((o): o is Plot2D => 'currentFn' in o);
    hover.setPlots(plots);
  }

  renderer.start();

  return {
    camera,
    param(name: string, opts: ParamOptions): ParamHandle {
      const handle: ParamHandle = { value: opts.value ?? opts.min };
      sliders.addParam({
        name,
        min: opts.min,
        max: opts.max,
        value: handle.value,
        step: opts.step ?? 0,
        onChange(v: number) {
          handle.value = v;
          // Refresh all objects that depend on external state
          for (const obj of objects) {
            obj.refresh();
          }
        },
      });
      return handle;
    },
    async exportImage(opts?: ExportImageOptions): Promise<string> {
      // WebGPU canvas requires reading pixels after a render
      // The simplest approach: draw to an offscreen canvas via drawImage
      return new Promise<string>((resolve) => {
        requestAnimationFrame(() => {
          const offscreen = document.createElement('canvas');
          const scale = opts?.scale ?? 1;
          offscreen.width = canvas.width * scale;
          offscreen.height = canvas.height * scale;
          const ctx2d = offscreen.getContext('2d')!;
          ctx2d.drawImage(canvas, 0, 0, offscreen.width, offscreen.height);
          resolve(offscreen.toDataURL('image/png'));
        });
      });
    },
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
      updateAnnotations();
    },
    remove(obj: MathObject) {
      const idx = objects.indexOf(obj);
      if (idx !== -1) objects.splice(idx, 1);
      renderer.remove(obj);
      updateLegend();
      updateHover();
      updateAnnotations();
    },
    destroy() {
      controller?.destroy();
      renderer.destroy();
      legend.destroy();
      hover.destroy();
      axisLabels.destroy();
      annotationOverlay.destroy();
      sliders.destroy();
    },
  };
}
