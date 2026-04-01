import { describe, it, expect } from 'vitest';
import { adaptiveSample } from '../src/math/Sampling.js';

describe('adaptiveSample', () => {
  it('samples a linear function with few points', () => {
    const points = adaptiveSample(x => 2 * x + 1, [-5, 5]);
    // Linear function has no curvature, should not subdivide much
    expect(points.length).toBeGreaterThan(10);
    expect(points.length).toBeLessThan(200);
  });

  it('produces more samples for rapidly changing functions', () => {
    const linear = adaptiveSample(x => x, [-5, 5]);
    const sinHighFreq = adaptiveSample(x => Math.sin(10 * x), [-5, 5]);
    expect(sinHighFreq.length).toBeGreaterThan(linear.length);
  });

  it('filters out NaN/Infinity values', () => {
    const points = adaptiveSample(x => 1 / x, [-2, 2]);
    expect(points.every(p => isFinite(p.y))).toBe(true);
  });

  it('handles constant function', () => {
    const points = adaptiveSample(() => 5, [-10, 10]);
    expect(points.length).toBeGreaterThan(0);
    expect(points.every(p => p.y === 5)).toBe(true);
  });

  it('respects the given range', () => {
    const points = adaptiveSample(x => x, [2, 8]);
    expect(points[0].x).toBeCloseTo(2);
    expect(points[points.length - 1].x).toBeCloseTo(8);
  });

  it('produces ordered x values', () => {
    const points = adaptiveSample(x => Math.sin(x), [-5, 5]);
    for (let i = 1; i < points.length; i++) {
      expect(points[i].x).toBeGreaterThanOrEqual(points[i - 1].x);
    }
  });
});
