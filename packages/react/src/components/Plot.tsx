import { useEffect, useRef } from 'react';
import { plot, type PlotOptions } from 'gpu-math';
import { useSceneContext } from '../MathCanvas.js';

export interface PlotProps extends Omit<PlotOptions, 'params'> {
  fn: (x: number) => number;
  params?: Record<string, number>;
}

export function Plot({ fn, ...options }: PlotProps) {
  const { scene2d } = useSceneContext();
  const objRef = useRef<ReturnType<typeof plot> | null>(null);

  useEffect(() => {
    if (!scene2d) return;
    const obj = plot(fn, options);
    objRef.current = obj;
    scene2d.add(obj);
    return () => {
      scene2d.remove(obj);
      objRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene2d, fn, options.color, options.lineWidth, options.label]);

  return null;
}
