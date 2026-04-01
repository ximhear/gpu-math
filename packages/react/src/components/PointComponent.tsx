import { useEffect } from 'react';
import { point, type PointOptions, type Vec2 } from 'gpu-math';
import { useSceneContext } from '../MathCanvas.js';

export interface PointProps extends PointOptions {
  at: Vec2;
}

export function Point({ at, ...options }: PointProps) {
  const { scene2d } = useSceneContext();

  useEffect(() => {
    if (!scene2d) return;
    const obj = point(at, options);
    scene2d.add(obj);
    return () => { scene2d.remove(obj); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene2d, at[0], at[1], options.color, options.size]);

  return null;
}
