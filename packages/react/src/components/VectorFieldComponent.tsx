import { useEffect } from 'react';
import { vectorField, type VectorFieldOptions, type Vec2 } from 'gpu-math';
import { useSceneContext } from '../MathCanvas.js';

export interface VectorFieldProps extends VectorFieldOptions {
  fn: (x: number, y: number) => Vec2;
}

export function VectorField({ fn, ...options }: VectorFieldProps) {
  const { scene2d } = useSceneContext();

  useEffect(() => {
    if (!scene2d) return;
    const obj = vectorField(fn, options);
    scene2d.add(obj);
    return () => { scene2d.remove(obj); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene2d, fn, options.density, options.color]);

  return null;
}
