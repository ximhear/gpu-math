export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type Vec4 = [number, number, number, number];
export type Mat4 = Float32Array;

export interface GPUState {
  device: GPUDevice;
  context: GPUCanvasContext;
  format: GPUTextureFormat;
}

export interface Theme {
  background: string;
  grid: { color: string; majorColor: string };
  axis: { color: string; labelColor: string };
  palette: string[];
  font: { family: string; size: number };
}

export interface SceneOptionsBase {
  theme?: '3b1b' | 'light' | 'dark' | 'minimal' | Theme;
  width?: number;
  height?: number;
  antialias?: boolean;
  interactive?: boolean;
  pixelRatio?: 'auto' | number;
  debug?: boolean;
}

export interface SceneOptions2D extends SceneOptionsBase {
  dimension?: 2;
  /** Axis scale ratio [scaleX, scaleY]. Default [1, 1] (uniform).
   *  Example: [1, 0.5] makes y-axis half the scale of x-axis. */
  axisScale?: [number, number];
}

export interface SceneOptions3D extends SceneOptionsBase {
  dimension: 3;
  fov?: number;
}

export interface PlotOptions {
  range?: [number, number];
  color?: string;
  lineWidth?: number;
  dash?: [number, number];
  opacity?: number;
  label?: string;
  samples?: number;
  params?: Record<string, number>;
}
