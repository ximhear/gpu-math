import { useEffect } from 'react';
import { parametric, type ParametricOptions, type Vec2 } from 'gpu-math';
import { useSceneContext } from '../MathCanvas.js';

export interface ParametricProps extends ParametricOptions {
  fn: (t: number) => Vec2;
}

export function Parametric({ fn, ...options }: ParametricProps) {
  const { scene2d } = useSceneContext();

  useEffect(() => {
    if (!scene2d) return;
    const obj = parametric(fn, options);
    scene2d.add(obj);
    return () => { scene2d.remove(obj); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene2d, fn, options.color, options.lineWidth]);

  return null;
}
