import { describe, it, expect } from 'vitest';
import { easings, getEasing } from '../src/animation/easing.js';

describe('easing functions', () => {
  const names = Object.keys(easings) as (keyof typeof easings)[];

  for (const name of names) {
    describe(name, () => {
      const fn = easings[name];

      it('starts at 0', () => {
        expect(fn(0)).toBeCloseTo(0, 3);
      });

      it('ends at 1', () => {
        expect(fn(1)).toBeCloseTo(1, 3);
      });

      it('returns values in reasonable range for t in [0, 1]', () => {
        for (let t = 0; t <= 1; t += 0.1) {
          const v = fn(t);
          expect(v).toBeGreaterThanOrEqual(-0.5); // elastic/bounce can overshoot
          expect(v).toBeLessThanOrEqual(1.5);
        }
      });
    });
  }

  it('linear is identity', () => {
    expect(easings.linear(0.5)).toBe(0.5);
    expect(easings.linear(0.25)).toBe(0.25);
  });

  it('easeInOut is symmetric around 0.5', () => {
    const a = easings.easeInOut(0.25);
    const b = easings.easeInOut(0.75);
    expect(a + b).toBeCloseTo(1, 5);
  });

  it('getEasing returns named easing', () => {
    expect(getEasing('linear')(0.5)).toBe(0.5);
  });

  it('getEasing passes through custom function', () => {
    const custom = (t: number) => t * t;
    expect(getEasing(custom)(0.5)).toBe(0.25);
  });
});
