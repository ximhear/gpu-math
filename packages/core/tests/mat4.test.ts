import { describe, it, expect } from 'vitest';
import * as mat4 from '../src/math/mat4.js';

describe('mat4', () => {
  it('identity matrix has 1s on diagonal', () => {
    const m = mat4.identity();
    expect(m[0]).toBe(1);
    expect(m[5]).toBe(1);
    expect(m[10]).toBe(1);
    expect(m[15]).toBe(1);
    expect(m[1]).toBe(0);
    expect(m[4]).toBe(0);
  });

  it('multiply identity * identity = identity', () => {
    const a = mat4.identity();
    const b = mat4.identity();
    const c = mat4.multiply(a, b);
    for (let i = 0; i < 16; i++) {
      expect(c[i]).toBeCloseTo(a[i]);
    }
  });

  it('invert(identity) = identity', () => {
    const m = mat4.identity();
    const inv = mat4.invert(m);
    for (let i = 0; i < 16; i++) {
      expect(inv[i]).toBeCloseTo(m[i]);
    }
  });

  it('M * invert(M) ≈ identity', () => {
    const m = mat4.ortho(-5, 5, -3, 3, -1, 1);
    const inv = mat4.invert(m);
    const result = mat4.multiply(m, inv);
    const id = mat4.identity();
    for (let i = 0; i < 16; i++) {
      expect(result[i]).toBeCloseTo(id[i], 5);
    }
  });

  it('ortho produces correct projection', () => {
    const m = mat4.ortho(-1, 1, -1, 1, -1, 1);
    // Point (0,0,0) should map to (0,0,0) in NDC
    // m * [0,0,0,1] = [m[12], m[13], m[14], m[15]]
    expect(m[12]).toBeCloseTo(0);
    expect(m[13]).toBeCloseTo(0);
    expect(m[15]).toBeCloseTo(1);
  });

  it('ortho maps corners correctly', () => {
    const m = mat4.ortho(-2, 2, -1, 1, -1, 1);
    // Point (2, 1, 0, 1) should map to (1, 1, *, 1)
    const x = m[0] * 2 + m[4] * 1 + m[8] * 0 + m[12];
    const y = m[1] * 2 + m[5] * 1 + m[9] * 0 + m[13];
    expect(x).toBeCloseTo(1);
    expect(y).toBeCloseTo(1);
  });
});
