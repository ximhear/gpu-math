import { useEffect } from 'react';
import { surface, type SurfaceOptions, type Vec3 } from 'gpu-math';
import { useSceneContext } from '../MathCanvas.js';

export interface SurfaceProps extends SurfaceOptions {
  fn: (u: number, v: number) => Vec3;
}

export function Surface({ fn, ...options }: SurfaceProps) {
  const { scene3d } = useSceneContext();

  useEffect(() => {
    if (!scene3d) return;
    const obj = surface(fn, options);
    scene3d.add(obj);
    return () => { scene3d.remove(obj); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene3d, fn, options.resolution, options.wireframe]);

  return null;
}
