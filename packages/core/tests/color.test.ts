import { describe, it, expect } from 'vitest';
import { hexToRGBA } from '../src/math/color.js';

describe('hexToRGBA', () => {
  it('converts #ffffff to [1, 1, 1, 1]', () => {
    const [r, g, b, a] = hexToRGBA('#ffffff');
    expect(r).toBeCloseTo(1);
    expect(g).toBeCloseTo(1);
    expect(b).toBeCloseTo(1);
    expect(a).toBe(1);
  });

  it('converts #000000 to [0, 0, 0, 1]', () => {
    const [r, g, b] = hexToRGBA('#000000');
    expect(r).toBe(0);
    expect(g).toBe(0);
    expect(b).toBe(0);
  });

  it('converts #3b82f6 correctly', () => {
    const [r, g, b] = hexToRGBA('#3b82f6');
    expect(r).toBeCloseTo(0x3b / 255);
    expect(g).toBeCloseTo(0x82 / 255);
    expect(b).toBeCloseTo(0xf6 / 255);
  });

  it('works without # prefix', () => {
    const [r, g, b] = hexToRGBA('ef4444');
    expect(r).toBeCloseTo(0xef / 255);
    expect(g).toBeCloseTo(0x44 / 255);
    expect(b).toBeCloseTo(0x44 / 255);
  });
});
