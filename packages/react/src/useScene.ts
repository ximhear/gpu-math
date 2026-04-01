import { useRef, useEffect, useState } from 'react';
import type { Scene2D, SceneOptions2D } from 'gpu-math';
import { createScene } from 'gpu-math';

export function useScene(options?: SceneOptions2D): {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  scene: Scene2D | null;
} {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scene, setScene] = useState<Scene2D | null>(null);
  const sceneRef = useRef<Scene2D | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;

    createScene(canvas, options).then((s) => {
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
