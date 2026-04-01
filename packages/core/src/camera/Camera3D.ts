import type { Vec3 } from '../types.js';
import * as mat4 from '../math/mat4.js';

export interface Camera3DUniformData {
  viewProjection: Float32Array;
  view: Float32Array;
  projection: Float32Array;
  cameraPos: Vec3;
  resolution: [number, number];
  pixelRatio: number;
}

export class Camera3D {
  target: Vec3 = [0, 0, 0];
  theta = Math.PI / 4;       // azimuth
  phi = Math.PI / 3;         // elevation
  distance = 6;
  fov = 45;                  // degrees
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  rotate(dTheta: number, dPhi: number): void {
    this.theta += dTheta;
    this.phi = Math.max(0.05, Math.min(Math.PI - 0.05, this.phi + dPhi));
  }

  zoom(factor: number): void {
    this.distance *= factor;
    this.distance = Math.max(0.5, Math.min(100, this.distance));
  }

  getCameraPos(): Vec3 {
    const x = this.target[0] + this.distance * Math.sin(this.phi) * Math.cos(this.theta);
    const y = this.target[1] + this.distance * Math.cos(this.phi);
    const z = this.target[2] + this.distance * Math.sin(this.phi) * Math.sin(this.theta);
    return [x, y, z];
  }

  getViewMatrix(): Float32Array {
    const eye = this.getCameraPos();
    return lookAt(eye, this.target, [0, 1, 0]);
  }

  getProjectionMatrix(): Float32Array {
    const aspect = this.canvas.width / this.canvas.height;
    return perspective((this.fov * Math.PI) / 180, aspect, 0.1, 100);
  }

  getUniforms(): Camera3DUniformData {
    const view = this.getViewMatrix();
    const proj = this.getProjectionMatrix();
    const vp = mat4.multiply(proj, view);
    return {
      viewProjection: vp,
      view,
      projection: proj,
      cameraPos: this.getCameraPos(),
      resolution: [this.canvas.width, this.canvas.height],
      pixelRatio: window.devicePixelRatio || 1,
    };
  }
}

function lookAt(eye: Vec3, target: Vec3, up: Vec3): Float32Array {
  const m = mat4.create();
  const zx = eye[0] - target[0], zy = eye[1] - target[1], zz = eye[2] - target[2];
  let len = Math.sqrt(zx * zx + zy * zy + zz * zz);
  const fz = [zx / len, zy / len, zz / len];

  // cross(up, fz)
  let xx = up[1] * fz[2] - up[2] * fz[1];
  let xy = up[2] * fz[0] - up[0] * fz[2];
  let xz = up[0] * fz[1] - up[1] * fz[0];
  len = Math.sqrt(xx * xx + xy * xy + xz * xz);
  const fx = [xx / len, xy / len, xz / len];

  // cross(fz, fx)
  const fy = [
    fz[1] * fx[2] - fz[2] * fx[1],
    fz[2] * fx[0] - fz[0] * fx[2],
    fz[0] * fx[1] - fz[1] * fx[0],
  ];

  m[0] = fx[0]; m[1] = fy[0]; m[2] = fz[0]; m[3] = 0;
  m[4] = fx[1]; m[5] = fy[1]; m[6] = fz[1]; m[7] = 0;
  m[8] = fx[2]; m[9] = fy[2]; m[10] = fz[2]; m[11] = 0;
  m[12] = -(fx[0] * eye[0] + fx[1] * eye[1] + fx[2] * eye[2]);
  m[13] = -(fy[0] * eye[0] + fy[1] * eye[1] + fy[2] * eye[2]);
  m[14] = -(fz[0] * eye[0] + fz[1] * eye[1] + fz[2] * eye[2]);
  m[15] = 1;
  return m;
}

function perspective(fovY: number, aspect: number, near: number, far: number): Float32Array {
  const m = mat4.create();
  const f = 1 / Math.tan(fovY / 2);
  const nf = 1 / (near - far);
  m[0] = f / aspect;
  m[5] = f;
  m[10] = (far + near) * nf;
  m[11] = -1;
  m[14] = 2 * far * near * nf;
  return m;
}
