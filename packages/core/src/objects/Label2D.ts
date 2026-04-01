import type { GPUState, Vec2 } from '../types.js';
import type { CameraUniformData } from '../camera/Camera2D.js';
import { MathObject } from './MathObject.js';

export interface LabelOptions {
  color?: string;
  fontSize?: number;
  fontStyle?: 'normal' | 'italic';
  offset?: Vec2;  // screen pixels [dx, dy], default [6, -6] (top-right)
}

/**
 * A text label at a world coordinate. No visible point — just text.
 * Perfect for marking intersections, vertices, etc.
 *
 * ```typescript
 * scene.add(label('A', [1, 2]));
 * scene.add(label('O', [0, 0], { color: '#fff', fontStyle: 'italic' }));
 * ```
 */
export class Label2D extends MathObject {
  readonly text: string;
  readonly position: Vec2;
  readonly labelOptions: Required<LabelOptions>;

  constructor(text: string, position: Vec2, options?: LabelOptions) {
    super();
    this.text = text;
    this.position = position;
    this.labelOptions = {
      color: options?.color ?? '#e0e0e0',
      fontSize: options?.fontSize ?? 14,
      fontStyle: options?.fontStyle ?? 'italic',
      offset: options?.offset ?? [6, -6],
    };
  }

  // No GPU rendering — AnnotationOverlay handles drawing via Canvas2D
  init(_gpu: GPUState): void {}
  render(_pass: GPURenderPassEncoder, _camera: CameraUniformData): void {}
  destroy(): void {}

  get label() { return this.text; }
  get color() { return this.labelOptions.color; }
}

export function label(text: string, position: Vec2, options?: LabelOptions): Label2D {
  return new Label2D(text, position, options);
}
