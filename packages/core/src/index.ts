export { createScene } from './engine/Scene.js';
export type { Scene2D, ParamHandle, ParamOptions } from './engine/Scene.js';
export { createScene3D } from './engine/Scene3D.js';
export type { Scene3DHandle } from './engine/Scene3D.js';

export { plot } from './objects/Plot2D.js';
export { parametric } from './objects/Parametric2D.js';
export { point } from './objects/Point2D.js';
export { vector } from './objects/Vector2D.js';
export { line } from './objects/Line2D.js';
export { vectorField } from './objects/VectorField2D.js';
export { surface } from './objects/Surface3D.js';
export { Parametric3D } from './objects/Parametric3D.js';
export { Point3D } from './objects/Point3D.js';
export { Vector3D } from './objects/Vector3D.js';
export { transform } from './objects/Transform2D.js';
export { tangentLine, riemannSum } from './objects/Calculus2D.js';
export { areaUnder } from './objects/AreaUnder2D.js';
export { complexPlot } from './objects/ComplexPlot2D.js';
export { region } from './objects/Region2D.js';
export { implicitCurve } from './objects/ImplicitCurve2D.js';
export { ode } from './objects/ODE2D.js';
export { contourPlot } from './objects/ContourPlot2D.js';
export { vectorField3D } from './objects/VectorField3D.js';
export { solidOfRevolution } from './objects/SolidOfRevolution.js';
export { piecewise } from './objects/Piecewise2D.js';
export { arc } from './objects/Arc2D.js';
export { scatter } from './objects/Scatter2D.js';
export { bar, histogram } from './objects/Bar2D.js';
export { label } from './objects/Label2D.js';

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
export type { Parametric3DOptions } from './objects/Parametric3D.js';
export type { Point3DOptions } from './objects/Point3D.js';
export type { Vector3DOptions } from './objects/Vector3D.js';
export type { TransformOptions } from './objects/Transform2D.js';
export type { TangentLineOptions, RiemannSumOptions } from './objects/Calculus2D.js';
export type { AreaUnderOptions } from './objects/AreaUnder2D.js';
export type { ComplexPlotOptions, Complex } from './objects/ComplexPlot2D.js';
export type { RegionOptions } from './objects/Region2D.js';
export type { ImplicitCurveOptions } from './objects/ImplicitCurve2D.js';
export type { ODEOptions } from './objects/ODE2D.js';
export type { ContourPlotOptions } from './objects/ContourPlot2D.js';
export type { VectorField3DOptions } from './objects/VectorField3D.js';
export type { SolidOfRevolutionOptions } from './objects/SolidOfRevolution.js';
export type { PiecewiseSegment, PiecewiseOptions } from './objects/Piecewise2D.js';
export type { ArcOptions } from './objects/Arc2D.js';
export type { ScatterOptions } from './objects/Scatter2D.js';
export type { BarData, BarOptions } from './objects/Bar2D.js';
export type { LabelOptions } from './objects/Label2D.js';

export { defineColorMap } from './engine/colormaps.js';
export type { ColormapName } from './engine/colormaps.js';
export { resolveTheme } from './themes/builtins.js';
export { theme3b1b, themeDark, themeLight, themeMinimal } from './themes/builtins.js';
export type { AnimateOptions } from './animation/animate.js';
export type { AnimateParamOptions } from './animation/animateParam.js';
export type { EasingName } from './animation/easing.js';
