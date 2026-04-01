import type { Vec3 } from '../types.js';
import { Surface3D, type SurfaceOptions } from './Surface3D.js';

export interface SolidOfRevolutionOptions extends Omit<SurfaceOptions, 'u' | 'v'> {
  from: number;
  to: number;
  axis?: 'x' | 'y'; // default 'x' — rotate around x-axis
}

/**
 * Create a 3D surface of revolution by rotating y=f(x) around an axis.
 *
 * ```typescript
 * // Rotate y = sqrt(x) around x-axis, from x=0 to x=4
 * scene3d.add(solidOfRevolution(x => Math.sqrt(x), {
 *   from: 0, to: 4, axis: 'x',
 * }));
 * ```
 */
export function solidOfRevolution(
  fn: (x: number) => number,
  options: SolidOfRevolutionOptions,
): Surface3D {
  const { from, to, axis = 'x', ...surfOpts } = options;

  let surfaceFn: (u: number, v: number) => Vec3;

  if (axis === 'x') {
    // u = theta (0..2π), v = x (from..to)
    // y=f(x) rotated around x-axis
    surfaceFn = (u: number, v: number): Vec3 => {
      const r = fn(v); // radius = f(x)
      return [v, r * Math.cos(u), r * Math.sin(u)];
    };
  } else {
    // Rotate around y-axis
    // u = theta (0..2π), v = x (from..to)
    // x=f(y) → rotate x around y-axis
    surfaceFn = (u: number, v: number): Vec3 => {
      const r = fn(v); // radius = f(y)
      return [r * Math.cos(u), v, r * Math.sin(u)];
    };
  }

  return new Surface3D(surfaceFn, {
    u: [0, 2 * Math.PI],
    v: [from, to],
    resolution: surfOpts.resolution ?? 48,
    colorMap: surfOpts.colorMap ?? 'viridis',
    wireframe: surfOpts.wireframe,
    wireframeOnly: surfOpts.wireframeOnly,
    opacity: surfOpts.opacity,
    label: surfOpts.label,
  });
}
