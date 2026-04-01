import { useRef, useEffect, useState } from 'react';
import type { Scene3DHandle, SceneOptions3D } from 'gpu-math';
import { createScene3D } from 'gpu-math';

export function useScene3D(options?: Omit<SceneOptions3D, 'dimension'>): {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  scene: Scene3DHandle | null;
} {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scene, setScene] = useState<Scene3DHandle | null>(null);
  const sceneRef = useRef<Scene3DHandle | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;

    createScene3D(canvas, options).then((s) => {
      if (cancelled) {
        s.destroy();
        return;
      }
      sceneRef.current = s;
      setScene(s);
    });

    return () => {
      cancelled = true;
      sceneRef.current?.destroy();
      sceneRef.current = null;
      setScene(null);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { canvasRef, scene };
}
