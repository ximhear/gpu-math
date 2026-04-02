import {
  createScene, plot, label, point, areaUnder, tangentLine, parametric,
} from 'gpu-math';

async function main() {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;

  const scene = await createScene(canvas, { width: 700, height: 500 });

  // Functions
  const f = plot(x => Math.sin(x), { color: '#3b82f6', lineWidth: 2.5 });
  scene.add(f);
  scene.add(plot(x => Math.cos(x), { color: '#ef4444', lineWidth: 2 }));

  // Area under sin(x) from 0 to π
  scene.add(areaUnder(f, { from: 0, to: Math.PI, color: '#3b82f6', opacity: 0.2 }));

  // Tangent at x=1
  scene.add(tangentLine(f, { at: 1, color: '#f59e0b', lineWidth: 2 }));
  scene.add(point([1, Math.sin(1)], { color: '#f59e0b', size: 5 }));

  // LaTeX labels
  scene.add(label('$y = \\sin(x)$', [-4, 1.3], { color: '#3b82f6', fontSize: 18 }));
  scene.add(label('$y = \\cos(x)$', [-4.5, -0.5], { color: '#ef4444', fontSize: 18 }));
  scene.add(label('$\\int_0^{\\pi} \\sin(x)\\,dx = 2$', [1.5, 1.5], { color: '#3b82f6', fontSize: 16 }));
  scene.add(label("$f'(1) = \\cos(1)$", [2, -0.8], { color: '#f59e0b', fontSize: 16 }));
  scene.add(label('$P\\,(1,\\, \\sin 1)$', [1, Math.sin(1)], { color: '#f59e0b', fontSize: 14, offset: [10, -20] }));

  // Origin
  scene.add(label('$O$', [0, 0], { color: '#aaa', fontSize: 16, offset: [-16, 14] }));
  scene.add(point([0, 0], { color: '#fff', size: 3 }));
}

main();
