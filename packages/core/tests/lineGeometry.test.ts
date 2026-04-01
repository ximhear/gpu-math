import { describe, it, expect } from 'vitest';
import { buildLineVertices } from '../src/engine/LineGeometry.js';

describe('buildLineVertices', () => {
  it('returns empty for less than 2 points', () => {
    const r0 = buildLineVertices([], null);
    expect(r0.vertexCount).toBe(0);

    const r1 = buildLineVertices([{ x: 0, y: 0 }], null);
    expect(r1.vertexCount).toBe(0);
  });

  it('produces 6 vertices per segment', () => {
    const points = [{ x: 0, y: 0 }, { x: 1, y: 1 }];
    const { vertexCount } = buildLineVertices(points, null);
    expect(vertexCount).toBe(6); // 1 segment × 6 vertices
  });

  it('produces 12 vertices for 3 points (2 segments)', () => {
    const points = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }];
    const { vertexCount } = buildLineVertices(points, null);
    expect(vertexCount).toBe(12);
  });

  it('vertex data has correct stride (8 floats per vertex)', () => {
    const points = [{ x: 0, y: 0 }, { x: 1, y: 1 }];
    const { data, vertexCount } = buildLineVertices(points, null);
    expect(data.length).toBe(vertexCount * 8);
  });

  it('stores correct posA and posB in vertex data', () => {
    const points = [{ x: 3, y: 4 }, { x: 7, y: 8 }];
    const { data } = buildLineVertices(points, null);
    // First vertex: posA=(3,4), posB=(7,8)
    expect(data[0]).toBe(3); // posA.x
    expect(data[1]).toBe(4); // posA.y
    expect(data[2]).toBe(7); // posB.x
    expect(data[3]).toBe(8); // posB.y
  });
});
