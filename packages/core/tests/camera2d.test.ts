import { describe, it, expect } from 'vitest';
import { Camera2D } from '../src/camera/Camera2D.js';

// Mock HTMLCanvasElement for Node.js
function mockCanvas(w = 800, h = 600): HTMLCanvasElement {
  return { width: w * 2, height: h * 2, clientWidth: w, clientHeight: h } as HTMLCanvasElement;
}

describe('Camera2D', () => {
  it('screenToWorld → worldToScreen roundtrip', () => {
    const cam = new Camera2D(mockCanvas());
    const [wx, wy] = cam.screenToWorld(400, 300);
    const [sx, sy] = cam.worldToScreen(wx, wy);
    expect(sx).toBeCloseTo(400);
    expect(sy).toBeCloseTo(300);
  });

  it('center of screen maps to camera center', () => {
    const canvas = mockCanvas();
    const cam = new Camera2D(canvas);
    cam.center = [0, 0];
    const [wx, wy] = cam.screenToWorld(canvas.width / 2, canvas.height / 2);
    expect(wx).toBeCloseTo(0);
    expect(wy).toBeCloseTo(0);
  });

  it('pan shifts center', () => {
    const cam = new Camera2D(mockCanvas());
    cam.center = [0, 0];
    cam.pan(100, 0); // drag 100px right → center moves left
    expect(cam.center[0]).toBeLessThan(0);
  });

  it('zoomAt changes zoom level', () => {
    const cam = new Camera2D(mockCanvas());
    const oldZoom = cam.zoom;
    cam.zoomAt(2, 400, 300);
    expect(cam.zoom).toBeCloseTo(oldZoom * 2);
  });

  it('getViewProjectionMatrix returns 16-element Float32Array', () => {
    const cam = new Camera2D(mockCanvas());
    const vp = cam.getViewProjectionMatrix();
    expect(vp).toBeInstanceOf(Float32Array);
    expect(vp.length).toBe(16);
  });

  it('getCameraUniforms has correct structure', () => {
    // getCameraUniforms accesses window.devicePixelRatio — provide global
    (globalThis as Record<string, unknown>).window = { devicePixelRatio: 2 };
    try {
      const cam = new Camera2D(mockCanvas());
      const u = cam.getCameraUniforms();
      expect(u.viewProjection).toBeInstanceOf(Float32Array);
      expect(u.invViewProjection).toBeInstanceOf(Float32Array);
      expect(u.resolution).toHaveLength(2);
      expect(typeof u.pixelRatio).toBe('number');
    } finally {
      delete (globalThis as Record<string, unknown>).window;
    }
  });
});
