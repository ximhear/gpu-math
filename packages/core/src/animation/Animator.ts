import type { EasingName, EasingFn } from './easing.js';
import { getEasing } from './easing.js';

export interface AnimationTask {
  startTime: number;
  duration: number;
  easing: EasingFn;
  update: (t: number) => void;
  resolve: () => void;
}

class AnimatorSingleton {
  private tasks: AnimationTask[] = [];
  private running = false;

  add(task: AnimationTask): void {
    this.tasks.push(task);
    if (!this.running) this.start();
  }

  private start(): void {
    this.running = true;
    const loop = (now: number) => {
      const finished: AnimationTask[] = [];

      for (const task of this.tasks) {
        const elapsed = now - task.startTime;
        const raw = Math.min(elapsed / task.duration, 1);
        const t = task.easing(raw);
        task.update(t);
        if (raw >= 1) finished.push(task);
      }

      for (const task of finished) {
        const idx = this.tasks.indexOf(task);
        if (idx !== -1) this.tasks.splice(idx, 1);
        task.resolve();
      }

      if (this.tasks.length > 0) {
        requestAnimationFrame(loop);
      } else {
        this.running = false;
      }
    };
    requestAnimationFrame(loop);
  }
}

export const animator = new AnimatorSingleton();

export interface MorphOptions {
  duration?: number;
  easing?: EasingName | EasingFn;
}

/**
 * Morph a Plot2D from one function to another by interpolating y-values.
 */
export function morphPlot(
  plotObj: {
    fn: (x: number) => number;
    setFn(fn: (x: number) => number): void;
  },
  toFn: (x: number) => number,
  options?: MorphOptions,
): Promise<void> {
  const duration = options?.duration ?? 1000;
  const easing = getEasing(options?.easing ?? 'easeInOut');
  const fromFn = plotObj.fn;

  return new Promise<void>((resolve) => {
    animator.add({
      startTime: performance.now(),
      duration,
      easing,
      update(t: number) {
        plotObj.setFn((x: number) => {
          const a = fromFn(x);
          const b = toFn(x);
          if (!isFinite(a)) return b;
          if (!isFinite(b)) return a;
          return a + (b - a) * t;
        });
      },
      resolve() {
        plotObj.setFn(toFn);
        resolve();
      },
    });
  });
}
