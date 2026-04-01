import type { EasingName, EasingFn } from './easing.js';
import { getEasing } from './easing.js';
import { animator } from './Animator.js';

export interface AnimateParamOptions {
  from?: number;
  to: number;
  duration?: number;
  easing?: EasingName | EasingFn;
}

/**
 * Animate a numeric parameter on any object that exposes `getParam` / `setParam`.
 *
 * ```ts
 * await animateParam(plotObj, 'freq', { from: 1, to: 5, duration: 2000 });
 * ```
 */
export function animateParam(
  target: { getParam(name: string): number; setParam(name: string, value: number): void },
  paramName: string,
  options: AnimateParamOptions,
): Promise<void> {
  const duration = options.duration ?? 1000;
  const easing = getEasing(options.easing ?? 'easeInOut');
  const fromVal = options.from ?? target.getParam(paramName);
  const toVal = options.to;

  return new Promise<void>((resolve) => {
    animator.add({
      startTime: performance.now(),
      duration,
      easing,
      update(t: number) {
        target.setParam(paramName, fromVal + (toVal - fromVal) * t);
      },
      resolve() {
        target.setParam(paramName, toVal);
        resolve();
      },
    });
  });
}
