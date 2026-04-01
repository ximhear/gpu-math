import type { Vec2 } from '../types.js';
import * as mat4 from '../math/mat4.js';

export interface CameraUniformData {
  viewProjection: Float32Array;
  invViewProjection: Float32Array;
  resolution: [number, number];
  pixelRatio: number;
}

export class Camera2D {
  center: Vec2 = [0, 0];
  zoom = 50; // pixels per unit (base)
  /** Per-axis scale multiplier. [1, 1] = uniform. [1, 0.5] = y is half scale. */
  scale: Vec2 = [1, 1];
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  private get zoomX(): number { return this.zoom * this.scale[0]; }
  private get zoomY(): number { return this.zoom * this.scale[1]; }

  pan(dxScreen: number, dyScreen: number): void {
    this.center[0] -= dxScreen / this.zoomX;
    this.center[1] += dyScreen / this.zoomY;
  }

  zoomAt(factor: number, screenX: number, screenY: number): void {
    const [wx, wy] = this.screenToWorld(screenX, screenY);
    this.zoom *= factor;
    this.zoom = Math.max(1, Math.min(10000, this.zoom));
    const [wx2, wy2] = this.screenToWorld(screenX, screenY);
    this.center[0] -= wx2 - wx;
    this.center[1] -= wy2 - wy;
  }

  screenToWorld(sx: number, sy: number): Vec2 {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const wx = (sx - w / 2) / this.zoomX + this.center[0];
    const wy = -(sy - h / 2) / this.zoomY + this.center[1];
    return [wx, wy];
  }

  worldToScreen(wx: number, wy: number): Vec2 {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const sx = (wx - this.center[0]) * this.zoomX + w / 2;
    const sy = -(wy - this.center[1]) * this.zoomY + h / 2;
    return [sx, sy];
  }

  getViewProjectionMatrix(): Float32Array {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const halfW = w / (2 * this.zoomX);
    const halfH = h / (2 * this.zoomY);
    const cx = this.center[0];
    const cy = this.center[1];

    return mat4.ortho(
      cx - halfW, cx + halfW,
      cy - halfH, cy + halfH,
      -1, 1,
    );
  }

  getCameraUniforms(): CameraUniformData {
    const vp = this.getViewProjectionMatrix();
    return {
      viewProjection: vp,
      invViewProjection: mat4.invert(vp),
      resolution: [this.canvas.width, this.canvas.height],
      pixelRatio: window.devicePixelRatio || 1,
    };
  }
}
