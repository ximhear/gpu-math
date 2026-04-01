import type { Vec2 } from '../types.js';
import { Parametric2D, type ParametricOptions } from './Parametric2D.js';

export interface ArcOptions {
  color?: string;
  lineWidth?: number;
  dash?: [number, number];
  opacity?: number;
  label?: string;
  samples?: number;
}

/**
 * Draw an arc (portion of a circle).
 *
 * ```typescript
 * // 45° angle arc at origin, radius 0.5
 * scene.add(arc([0, 0], 0.5, 0, Math.PI / 4, { color: '#ef4444' }));
 * ```
 */
export function arc(
  center: Vec2,
  radius: number,
  startAngle: number,
  endAngle: number,
  options?: ArcOptions,
): Parametric2D {
  const [cx, cy] = center;
  return new Parametric2D(
    (t: number) => [cx + radius * Math.cos(t), cy + radius * Math.sin(t)] as Vec2,
    {
      t: [startAngle, endAngle],
      color: options?.color ?? '#888888',
      lineWidth: options?.lineWidth ?? 1.5,
      dash: options?.dash,
      opacity: options?.opacity,
      label: options?.label ?? '',
      samples: options?.samples ?? 64,
    },
  );
}
