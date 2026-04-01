import {
  createScene, createScene3D,
  plot, parametric, point, vector, vectorField, surface,
  transform, tangentLine, riemannSum,
  animateParam, sequence, wait,
} from 'gpu-math';

async function main() {
  const errorDiv = document.getElementById('error') as HTMLDivElement;

  try {
    // === 2D Plots ===
    const canvas2d = document.getElementById('canvas2d') as HTMLCanvasElement;
    const scene = await createScene(canvas2d, { width: 480, height: 360, theme: '3b1b' });

    const sinPlot = plot((x, { freq }) => Math.sin(freq * x), {
      label: 'sin(fx)', lineWidth: 3, params: { freq: 1 },
    });
    scene.add(sinPlot);
    scene.add(plot(x => Math.cos(x), { label: 'cos(x)', lineWidth: 2 }));
    scene.add(parametric(t => [Math.cos(t) * 2, Math.sin(t) * 2], {
      t: [0, 2 * Math.PI], color: '#f59e0b', label: 'circle', lineWidth: 1.5,
    }));
    scene.add(point([0, 0], { color: '#ffffff', size: 5 }));
    scene.add(vector([0, 0], [1.5, 1], { color: '#10b981', lineWidth: 2 }));

    setTimeout(async () => {
      await sequence([
        () => animateParam(sinPlot, 'freq', { to: 4, duration: 2000, easing: 'easeInOut' }),
        () => wait(300),
        () => animateParam(sinPlot, 'freq', { to: 1, duration: 1500, easing: 'bounceOut' }),
      ]);
    }, 2000);

    // === Vector Field ===
    const canvasVf = document.getElementById('canvasVf') as HTMLCanvasElement;
    const sceneVf = await createScene(canvasVf, { width: 480, height: 360, theme: 'dark' });
    sceneVf.add(vectorField((x, y) => [-y, x], {
      density: 16, scale: 0.6, color: '#8b5cf6', lineWidth: 1.5,
    }));

    // === Linear Algebra ===
    const canvasLa = document.getElementById('canvasLa') as HTMLCanvasElement;
    const sceneLa = await createScene(canvasLa, { width: 480, height: 360 });
    const t2d = transform([[2, 1], [0, 1]], {
      showGrid: true, showEigen: true, color: '#3b82f6', eigenColor: '#ef4444',
    });
    sceneLa.add(t2d);

    // Animate transform
    setTimeout(async () => {
      t2d.setProgress(0);
      await animateParam(t2d, 't', { from: 0, to: 1, duration: 2000, easing: 'easeInOut' });
    }, 1000);

    // === Calculus ===
    const canvasCal = document.getElementById('canvasCal') as HTMLCanvasElement;
    const sceneCal = await createScene(canvasCal, { width: 480, height: 360 });
    const fPlot = plot(x => x * x * 0.3, { color: '#3b82f6', lineWidth: 2, label: '0.3x²' });
    sceneCal.add(fPlot);
    sceneCal.add(tangentLine(fPlot, { at: 2, color: '#ef4444', lineWidth: 2 }));
    const rs = riemannSum(fPlot, { from: 0, to: 3, n: 8, color: '#10b981', opacity: 0.5 });
    sceneCal.add(rs);

    setTimeout(async () => {
      await animateParam(rs, 'n', { from: 5, to: 50, duration: 3000, easing: 'easeInOut' });
    }, 2000);

    // === 3D Surface ===
    const canvas3d = document.getElementById('canvas3d') as HTMLCanvasElement;
    const scene3d = await createScene3D(canvas3d, { width: 480, height: 360 });
    scene3d.add(surface((u, v) => [u, Math.sin(u) * Math.cos(v), v], {
      u: [-3, 3], v: [-3, 3], resolution: 64, wireframe: true,
    }));

  } catch (e) {
    errorDiv.style.display = 'block';
    errorDiv.textContent = (e as Error).message;
  }
}

main();
