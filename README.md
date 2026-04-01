# gpu-math

> WebGPU-powered interactive math visualization for the browser

**gpu-math** renders beautiful, interactive math graphics in the browser using WebGPU. Think of it as an interactive [3Blue1Brown](https://www.3blue1brown.com/) engine — you can pan, zoom, rotate, and hover over everything.

## Features

- **WebGPU accelerated** — 60fps rendering with WGSL shaders
- **One-line API** — `plot(x => Math.sin(x))` and you're done
- **2D & 3D** — function plots, parametric curves, surfaces with Phong lighting
- **Interactive** — pan, zoom, rotate, hover tooltips
- **Beautiful defaults** — 3Blue1Brown-inspired dark theme, anti-aliased curves
- **Tiny** — ~17KB gzipped, zero dependencies
- **TypeScript-first** — full type safety and autocompletion

## Quick Start

```bash
npm install gpu-math
```

```typescript
import { createScene, plot } from 'gpu-math';

const scene = await createScene(document.getElementById('canvas'));
scene.add(plot(x => Math.sin(x)));
```

That's it. You get a smooth, anti-aliased sine wave on an infinite grid with pan/zoom.

## Examples

### Multiple plots with legend

```typescript
scene.add(plot(x => Math.sin(x), { label: 'sin(x)' }));
scene.add(plot(x => Math.cos(x), { label: 'cos(x)' }));
scene.add(plot(x => 0.3 * x, { label: '0.3x', dash: [8, 4] }));
```

### Parametric curves

```typescript
import { parametric } from 'gpu-math';

scene.add(parametric(t => [Math.cos(t), Math.sin(t)], {
  t: [0, 2 * Math.PI],
  color: '#f59e0b',
}));
```

### Points, vectors, lines

```typescript
import { point, vector, line } from 'gpu-math';

scene.add(point([1, 0], { color: 'red', size: 8, label: 'A' }));
scene.add(vector([0, 0], [1, 1], { color: 'green' }));
scene.add(line([-2, -1], [2, 1], { dash: [6, 4] }));
```

### Vector fields

```typescript
import { vectorField } from 'gpu-math';

scene.add(vectorField((x, y) => [-y, x], {
  density: 20,
  scale: 0.5,
  color: '#8b5cf6',
}));
```

### 3D surfaces

```typescript
import { createScene3D, surface } from 'gpu-math';

const scene3d = await createScene3D(canvas, { width: 800, height: 600 });
scene3d.add(surface((u, v) => [u, Math.sin(u) * Math.cos(v), v], {
  u: [-3, 3], v: [-3, 3],
  resolution: 64,
  wireframe: true,
}));
```

### Animation

```typescript
import { animate, animateParam, sequence, wait } from 'gpu-math';

const p = plot((x, { freq }) => Math.sin(freq * x), { params: { freq: 1 } });
scene.add(p);

await sequence([
  () => animateParam(p, 'freq', { to: 5, duration: 2000, easing: 'easeInOut' }),
  () => wait(500),
  () => animateParam(p, 'freq', { to: 1, duration: 1500, easing: 'bounceOut' }),
]);
```

### Themes

```typescript
createScene(canvas, { theme: 'light' });  // or '3b1b', 'dark', 'minimal'
```

## API Reference

| Function | Description |
|----------|-------------|
| `createScene(canvas, options?)` | Create a 2D scene |
| `createScene3D(canvas, options?)` | Create a 3D scene with orbital camera |
| `plot(fn, options?)` | 2D function graph |
| `parametric(fn, options?)` | Parametric curve `t → [x, y]` |
| `point(pos, options?)` | Point marker |
| `vector(from, to, options?)` | Arrow vector |
| `line(from, to, options?)` | Line segment |
| `vectorField(fn, options?)` | 2D vector field (arrow grid) |
| `surface(fn, options?)` | 3D parametric surface `(u,v) → [x,y,z]` |
| `animate(options)` | Morph a plot to a new function |
| `animateParam(target, param, options)` | Animate a numeric parameter |
| `sequence(steps)` | Run animations in sequence |
| `wait(ms)` | Delay in a sequence |

## Requirements

- A browser with [WebGPU support](https://caniuse.com/webgpu) (Chrome 113+, Edge 113+, Safari 18+, Firefox 141+)

## License

MIT
