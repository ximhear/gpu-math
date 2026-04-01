import { useRef, useEffect, useState, createContext, useContext, type ReactNode } from 'react';
import type { Scene2D, Scene3DHandle, SceneOptions2D } from 'gpu-math';
import { createScene, createScene3D } from 'gpu-math';

interface SceneContextValue {
  scene2d: Scene2D | null;
  scene3d: Scene3DHandle | null;
}

const SceneContext = createContext<SceneContextValue>({ scene2d: null, scene3d: null });

export function useSceneContext() {
  return useContext(SceneContext);
}

export interface MathCanvasProps {
  width?: number;
  height?: number;
  theme?: '3b1b' | 'light' | 'dark' | 'minimal';
  dimension?: 2 | 3;
  interactive?: boolean;
  children?: ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export function MathCanvas({
  width = 800,
  height = 600,
  theme = '3b1b',
  dimension = 2,
  interactive = true,
  children,
  style,
  className,
}: MathCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ctx, setCtx] = useState<SceneContextValue>({ scene2d: null, scene3d: null });
  const sceneRef = useRef<{ destroy: () => void } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;

    const init = async () => {
      if (dimension === 3) {
        const s = await createScene3D(canvas, { width, height, interactive });
        if (cancelled) { s.destroy(); return; }
        sceneRef.current = s;
        setCtx({ scene2d: null, scene3d: s });
      } else {
        const s = await createScene(canvas, { width, height, theme, interactive } as SceneOptions2D);
        if (cancelled) { s.destroy(); return; }
        sceneRef.current = s;
        setCtx({ scene2d: s, scene3d: null });
      }
    };

    init();

    return () => {
      cancelled = true;
      sceneRef.current?.destroy();
      sceneRef.current = null;
      setCtx({ scene2d: null, scene3d: null });
    };
  }, [width, height, theme, dimension, interactive]);

  return (
    <div style={{ position: 'relative', display: 'inline-block', ...style }} className={className}>
      <canvas ref={canvasRef} />
      <SceneContext.Provider value={ctx}>
        {children}
      </SceneContext.Provider>
    </div>
  );
}
