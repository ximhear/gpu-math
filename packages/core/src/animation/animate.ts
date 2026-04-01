import type { EasingName, EasingFn } from './easing.js';
import { morphPlot } from './Animator.js';
import type { Plot2D } from '../objects/Plot2D.js';

export interface AnimateOptions {
  from: Plot2D;
  to: (x: number) => number;
  duration?: number;
  easing?: EasingName | EasingFn;
}

/**
 * Animate a plot's function to a new function via morphing.
 *
 * ```ts
 * const p = plot(x => Math.sin(x));
 * scene.add(p);
 * await animate({ from: p, to: x => Math.sin(2*x), duration: 1000 });
 * ```
 */
export function animate(options: AnimateOptions): Promise<void> {
  const { from: plotObj, to: toFn, duration, easing } = options;

  return morphPlot(
    {
      fn: plotObj.currentFn,
      setFn: (fn) => plotObj.setFn(fn),
    },
    toFn,
    { duration, easing },
  );
}
