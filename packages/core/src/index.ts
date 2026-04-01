export { createScene } from './engine/Scene.js';
export type { Scene2D } from './engine/Scene.js';
export { createScene3D } from './engine/Scene3D.js';
export type { Scene3DHandle } from './engine/Scene3D.js';

export { plot } from './objects/Plot2D.js';
export { parametric } from './objects/Parametric2D.js';
export { point } from './objects/Point2D.js';
export { vector } from './objects/Vector2D.js';
export { line } from './objects/Line2D.js';
export { vectorField } from './objects/VectorField2D.js';
export { surface } from './objects/Surface3D.js';
export { transform } from './objects/Transform2D.js';
export { tangentLine, riemannSum } from './objects/Calculus2D.js';

export { animate } from './animation/animate.js';
export { animateParam } from './animation/animateParam.js';
export { sequence, wait } from './animation/sequence.js';
export { easings } from './animation/easing.js';

export type {
  Vec2,
  Vec3,
  Vec4,
  Mat4,
  Theme,
  SceneOptions2D,
  SceneOptions3D,
  PlotOptions,
} from './types.js';
export type { ParametricOptions } from './objects/Parametric2D.js';
export type { PointOptions } from './objects/Point2D.js';
export type { VectorOptions } from './objects/Vector2D.js';
export type { LineOptions } from './objects/Line2D.js';
export type { VectorFieldOptions } from './objects/VectorField2D.js';
export type { SurfaceOptions } from './objects/Surface3D.js';
export type { TransformOptions } from './objects/Transform2D.js';
export type { TangentLineOptions, RiemannSumOptions } from './objects/Calculus2D.js';

export { resolveTheme } from './themes/builtins.js';
export { theme3b1b, themeDark, themeLight, themeMinimal } from './themes/builtins.js';
export type { AnimateOptions } from './animation/animate.js';
export type { AnimateParamOptions } from './animation/animateParam.js';
export type { EasingName } from './animation/easing.js';
