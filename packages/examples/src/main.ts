import {
  createScene, createScene3D,
  plot, parametric, point, vector, line, vectorField, surface,
  Parametric3D, Point3D, Vector3D,
  transform, tangentLine, riemannSum, areaUnder, complexPlot,
  region, implicitCurve,
  animate, animateParam, sequence, wait,
} from 'gpu-math';
import { createDemo } from './shared.js';

const gallery = document.getElementById('gallery')!;

function category(title: string): HTMLDivElement {
  const div = document.createElement('div');
  div.className = 'category';
  const h2 = document.createElement('h2');
  h2.textContent = title;
  div.appendChild(h2);
  const demos = document.createElement('div');
  demos.className = 'demos';
  div.appendChild(demos);
  gallery.appendChild(div);
  return demos;
}

async function main() {
  try {
    // =============================================
    // 1. BASIC PLOTS
    // =============================================
    const basics = category('Basic Plots');

    // 1-1: Hello World
    {
      const c = createDemo(basics, 'Hello World — sin(x)', `
import { createScene, plot } from 'gpu-math';

const scene = await createScene(canvas);
scene.add(plot(x => Math.sin(x)));`);
      const s = await createScene(c, { width: 420, height: 320 });
      s.add(plot(x => Math.sin(x), { lineWidth: 3 }));
    }

    // 1-2: Multiple functions
    {
      const c = createDemo(basics, 'Multiple Functions', `
scene.add(plot(x => Math.sin(x), { label: 'sin(x)' }));
scene.add(plot(x => Math.cos(x), { label: 'cos(x)' }));
scene.add(plot(x => Math.sin(2*x)*0.5, { label: 'sin(2x)/2' }));`);
      const s = await createScene(c, { width: 420, height: 320 });
      s.add(plot(x => Math.sin(x), { label: 'sin(x)', lineWidth: 2 }));
      s.add(plot(x => Math.cos(x), { label: 'cos(x)', lineWidth: 2 }));
      s.add(plot(x => Math.sin(2 * x) * 0.5, { label: 'sin(2x)/2', lineWidth: 2 }));
    }

    // 1-3: Polynomial
    {
      const c = createDemo(basics, 'Polynomial', `
scene.add(plot(x => x**3 - 3*x, { label: 'x³ - 3x', color: '#f59e0b' }));
scene.add(plot(x => 0, { color: '#444', dash: [6, 4] })); // x-axis ref`);
      const s = await createScene(c, { width: 420, height: 320 });
      s.add(plot(x => x ** 3 - 3 * x, { label: 'x³ - 3x', color: '#f59e0b', lineWidth: 2.5 }));
    }

    // 1-4: Discontinuous — tan(x)
    {
      const c = createDemo(basics, 'Discontinuous — tan(x)', `
scene.add(plot(x => Math.tan(x), { label: 'tan(x)', color: '#ef4444' }));`);
      const s = await createScene(c, { width: 420, height: 320 });
      s.add(plot(x => Math.tan(x), { label: 'tan(x)', color: '#ef4444', lineWidth: 2 }));
    }

    // 1-5: Dashed lines
    {
      const c = createDemo(basics, 'Dashed & Solid Lines', `
scene.add(plot(x => Math.sin(x), { label: 'solid' }));
scene.add(plot(x => Math.cos(x), { label: 'dashed', dash: [8, 4] }));
scene.add(plot(x => 0.5*x, { label: 'dotted', dash: [3, 3] }));`);
      const s = await createScene(c, { width: 420, height: 320 });
      s.add(plot(x => Math.sin(x), { label: 'solid', lineWidth: 2.5 }));
      s.add(plot(x => Math.cos(x), { label: 'dashed', dash: [8, 4], lineWidth: 2 }));
      s.add(plot(x => 0.5 * x, { label: 'dotted', dash: [3, 3], lineWidth: 2 }));
    }

    // 1-6: Exponential & Log
    {
      const c = createDemo(basics, 'Exponential & Logarithm', `
scene.add(plot(x => Math.exp(x), { label: 'eˣ' }));
scene.add(plot(x => Math.log(x), { label: 'ln(x)' }));`);
      const s = await createScene(c, { width: 420, height: 320 });
      s.add(plot(x => Math.exp(x), { label: 'eˣ', lineWidth: 2.5 }));
      s.add(plot(x => Math.log(x), { label: 'ln(x)', lineWidth: 2.5 }));
    }

    // =============================================
    // 2. PARAMETRIC CURVES
    // =============================================
    const parametrics = category('Parametric Curves');

    // 2-1: Circle
    {
      const c = createDemo(parametrics, 'Circle', `
scene.add(parametric(t => [Math.cos(t), Math.sin(t)], {
  t: [0, 2 * Math.PI], color: '#10b981', label: 'unit circle',
}));
scene.add(point([0, 0], { color: '#fff', size: 4 }));`);
      const s = await createScene(c, { width: 420, height: 320 });
      s.add(parametric(t => [Math.cos(t), Math.sin(t)], { t: [0, 2 * Math.PI], color: '#10b981', label: 'unit circle', lineWidth: 2.5 }));
      s.add(point([0, 0], { color: '#ffffff', size: 4 }));
    }

    // 2-2: Lissajous
    {
      const c = createDemo(parametrics, 'Lissajous Curve (3:2)', `
scene.add(parametric(t => [Math.sin(3*t), Math.sin(2*t)], {
  t: [0, 2*Math.PI], color: '#8b5cf6', label: 'Lissajous 3:2',
}));`);
      const s = await createScene(c, { width: 420, height: 320 });
      s.add(parametric(t => [Math.sin(3 * t), Math.sin(2 * t)], { t: [0, 2 * Math.PI], color: '#8b5cf6', label: 'Lissajous 3:2', lineWidth: 2.5 }));
    }

    // 2-3: Spiral
    {
      const c = createDemo(parametrics, 'Archimedean Spiral', `
scene.add(parametric(t => {
  const r = 0.2 * t;
  return [r * Math.cos(t), r * Math.sin(t)];
}, { t: [0, 6*Math.PI], color: '#ec4899' }));`);
      const s = await createScene(c, { width: 420, height: 320 });
      s.add(parametric(t => {
        const r = 0.2 * t;
        return [r * Math.cos(t), r * Math.sin(t)] as [number, number];
      }, { t: [0, 6 * Math.PI], color: '#ec4899', label: 'spiral', lineWidth: 2 }));
    }

    // 2-4: Heart curve
    {
      const c = createDemo(parametrics, 'Heart Curve', `
scene.add(parametric(t => {
  const x = 16 * Math.sin(t)**3;
  const y = 13*Math.cos(t) - 5*Math.cos(2*t) - 2*Math.cos(3*t) - Math.cos(4*t);
  return [x/10, y/10];
}, { t: [0, 2*Math.PI], color: '#ef4444' }));`);
      const s = await createScene(c, { width: 420, height: 320 });
      s.add(parametric(t => {
        const x = 16 * Math.sin(t) ** 3;
        const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        return [x / 10, y / 10] as [number, number];
      }, { t: [0, 2 * Math.PI], color: '#ef4444', label: 'heart', lineWidth: 2.5 }));
    }

    // 2-5: Rose curve
    {
      const c = createDemo(parametrics, 'Rose Curve (k=5)', `
scene.add(parametric(t => {
  const r = 2 * Math.cos(5 * t);
  return [r * Math.cos(t), r * Math.sin(t)];
}, { t: [0, Math.PI], color: '#f59e0b' }));`);
      const s = await createScene(c, { width: 420, height: 320 });
      s.add(parametric(t => {
        const r = 2 * Math.cos(5 * t);
        return [r * Math.cos(t), r * Math.sin(t)] as [number, number];
      }, { t: [0, Math.PI], color: '#f59e0b', label: 'rose k=5', lineWidth: 2 }));
    }

    // =============================================
    // 3. POINTS, VECTORS, LINES
    // =============================================
    const pvl = category('Points, Vectors & Lines');

    // 3-1: Points and labels
    {
      const c = createDemo(pvl, 'Points with Labels', `
scene.add(point([0, 0], { color: '#fff', size: 6, label: 'Origin' }));
scene.add(point([2, 1], { color: '#3b82f6', size: 8, label: 'A(2,1)' }));
scene.add(point([-1, 3], { color: '#ef4444', size: 8, label: 'B(-1,3)' }));
scene.add(point([3, -2], { color: '#10b981', size: 8, label: 'C(3,-2)' }));`);
      const s = await createScene(c, { width: 420, height: 320 });
      s.add(point([0, 0], { color: '#ffffff', size: 6, label: 'Origin' }));
      s.add(point([2, 1], { color: '#3b82f6', size: 8, label: 'A(2,1)' }));
      s.add(point([-1, 3], { color: '#ef4444', size: 8, label: 'B(-1,3)' }));
      s.add(point([3, -2], { color: '#10b981', size: 8, label: 'C(3,-2)' }));
    }

    // 3-2: Vectors
    {
      const c = createDemo(pvl, 'Vectors', `
scene.add(vector([0,0], [2,1], { color: '#3b82f6', label: 'u', lineWidth: 2 }));
scene.add(vector([0,0], [-1,2], { color: '#ef4444', label: 'v', lineWidth: 2 }));
scene.add(vector([0,0], [1,3], { color: '#10b981', label: 'u+v', lineWidth: 2 }));
scene.add(line([2,1], [1,3], { dash: [4,4], color: '#555' }));
scene.add(line([-1,2], [1,3], { dash: [4,4], color: '#555' }));`);
      const s = await createScene(c, { width: 420, height: 320 });
      s.add(vector([0, 0], [2, 1], { color: '#3b82f6', label: 'u', lineWidth: 2 }));
      s.add(vector([0, 0], [-1, 2], { color: '#ef4444', label: 'v', lineWidth: 2 }));
      s.add(vector([0, 0], [1, 3], { color: '#10b981', label: 'u+v', lineWidth: 2 }));
      s.add(line([2, 1], [1, 3], { dash: [4, 4], color: '#555' }));
      s.add(line([-1, 2], [1, 3], { dash: [4, 4], color: '#555' }));
    }

    // 3-3: Unit circle with sin/cos
    {
      const c = createDemo(pvl, 'Unit Circle — sin & cos', `
const angle = Math.PI / 4;
const cx = Math.cos(angle), cy = Math.sin(angle);
scene.add(parametric(t => [Math.cos(t), Math.sin(t)],
  { t: [0, 2*Math.PI], color: '#555', lineWidth: 1 }));
scene.add(vector([0,0], [cx, cy], { color: '#fff', lineWidth: 2 }));
scene.add(line([cx, 0], [cx, cy], { color: '#3b82f6', lineWidth: 2 })); // sin
scene.add(line([0, 0], [cx, 0], { color: '#ef4444', lineWidth: 2 })); // cos
scene.add(point([cx, cy], { color: '#fff', size: 6 }));`);
      const s = await createScene(c, { width: 420, height: 320 });
      const angle = Math.PI / 4;
      const cx = Math.cos(angle), cy = Math.sin(angle);
      s.add(parametric(t => [Math.cos(t), Math.sin(t)], { t: [0, 2 * Math.PI], color: '#555', lineWidth: 1 }));
      s.add(vector([0, 0], [cx, cy], { color: '#ffffff', lineWidth: 2 }));
      s.add(line([cx, 0], [cx, cy], { color: '#3b82f6', lineWidth: 2, label: 'sin θ' }));
      s.add(line([0, 0], [cx, 0], { color: '#ef4444', lineWidth: 2, label: 'cos θ' }));
      s.add(point([cx, cy], { color: '#ffffff', size: 6 }));
      s.add(point([0, 0], { color: '#ffffff', size: 3 }));
    }

    // =============================================
    // 4. VECTOR FIELDS
    // =============================================
    const vfields = category('Vector Fields');

    // 4-1: Rotation
    {
      const c = createDemo(vfields, 'Rotation Field', `
scene.add(vectorField((x, y) => [-y, x], {
  density: 16, scale: 0.6, color: '#8b5cf6',
}));`);
      const s = await createScene(c, { width: 420, height: 320, theme: 'dark' });
      s.add(vectorField((x, y) => [-y, x], { density: 16, scale: 0.6, color: '#8b5cf6', lineWidth: 1.5 }));
    }

    // 4-2: Divergence (source)
    {
      const c = createDemo(vfields, 'Source Field (divergence)', `
scene.add(vectorField((x, y) => [x, y], {
  density: 14, scale: 0.5, color: '#ef4444',
}));`);
      const s = await createScene(c, { width: 420, height: 320, theme: 'dark' });
      s.add(vectorField((x, y) => [x, y], { density: 14, scale: 0.5, color: '#ef4444', lineWidth: 1.5 }));
    }

    // 4-3: Saddle
    {
      const c = createDemo(vfields, 'Saddle Point Field', `
scene.add(vectorField((x, y) => [x, -y], {
  density: 16, scale: 0.5, color: '#10b981',
}));`);
      const s = await createScene(c, { width: 420, height: 320, theme: 'dark' });
      s.add(vectorField((x, y) => [x, -y], { density: 16, scale: 0.5, color: '#10b981', lineWidth: 1.5 }));
    }

    // 4-4: Swirl
    {
      const c = createDemo(vfields, 'Swirl Field', `
scene.add(vectorField((x, y) => [-y + x*0.3, x + y*0.3], {
  density: 18, scale: 0.4, color: '#f59e0b',
}));`);
      const s = await createScene(c, { width: 420, height: 320, theme: 'dark' });
      s.add(vectorField((x, y) => [-y + x * 0.3, x + y * 0.3], { density: 18, scale: 0.4, color: '#f59e0b', lineWidth: 1.5 }));
    }

    // =============================================
    // 4.5 INTERACTIVE SLIDERS
    // =============================================
    const sliders = category('Interactive Sliders');

    // Slider: frequency
    {
      const c = createDemo(sliders, 'Drag to change frequency', `
const freq = scene.param('freq', { min: 0.5, max: 10, value: 1, step: 0.1 });
scene.add(plot(x => Math.sin(freq.value * x), { label: 'sin(f·x)', lineWidth: 3 }));`);
      const s = await createScene(c, { width: 420, height: 320 });
      const freq = s.param('freq', { min: 0.5, max: 10, value: 1, step: 0.1 });
      s.add(plot(x => Math.sin(freq.value * x), { label: 'sin(f·x)', lineWidth: 3 }));
    }

    // Slider: amplitude + frequency
    {
      const c = createDemo(sliders, 'Amplitude + Frequency', `
const amp = scene.param('amplitude', { min: 0.1, max: 3, value: 1 });
const freq = scene.param('frequency', { min: 0.5, max: 8, value: 2 });
scene.add(plot(x => amp.value * Math.sin(freq.value * x), { lineWidth: 3 }));`);
      const s = await createScene(c, { width: 420, height: 320 });
      const amp = s.param('amplitude', { min: 0.1, max: 3, value: 1 });
      const frq = s.param('frequency', { min: 0.5, max: 8, value: 2 });
      s.add(plot(x => amp.value * Math.sin(frq.value * x), { label: 'a·sin(f·x)', lineWidth: 3 }));
    }

    // Slider: Gaussian σ
    {
      const c = createDemo(sliders, 'Gaussian σ control', `
const sigma = scene.param('σ', { min: 0.3, max: 3, value: 1, step: 0.05 });
scene.add(plot(x => Math.exp(-x*x/(2*sigma.value**2)) / (sigma.value*Math.sqrt(2*Math.PI)),
  { label: 'N(0,σ²)', lineWidth: 3 }));`);
      const s = await createScene(c, { width: 420, height: 320 });
      const sigma = s.param('σ', { min: 0.3, max: 3, value: 1, step: 0.05 });
      s.add(plot(x => Math.exp(-x * x / (2 * sigma.value ** 2)) / (sigma.value * Math.sqrt(2 * Math.PI)), { label: 'N(0,σ²)', lineWidth: 3 }));
    }

    // =============================================
    // 5. ANIMATION
    // =============================================
    const anims = category('Animation');

    // 5-1: Function morph
    {
      const c = createDemo(anims, 'Function Morphing', `
const p = plot(x => Math.sin(x), { label: 'morphing', lineWidth: 3 });
scene.add(p);
// Morph sin → sawtooth → sin
async function loop() {
  await animate({ from: p, to: x => Math.sin(3*x), duration: 2000 });
  await wait(500);
  await animate({ from: p, to: x => Math.sin(x), duration: 1500, easing: 'bounceOut' });
  loop();
}
loop();`);
      const s = await createScene(c, { width: 420, height: 320 });
      const p = plot(x => Math.sin(x), { label: 'morphing', lineWidth: 3 });
      s.add(p);
      async function morphLoop() {
        await animate({ from: p, to: x => Math.sin(3 * x), duration: 2000 });
        await wait(500);
        await animate({ from: p, to: x => Math.sin(x), duration: 1500, easing: 'bounceOut' });
        await wait(500);
        morphLoop();
      }
      setTimeout(morphLoop, 1000);
    }

    // 5-2: Parameter animation
    {
      const c = createDemo(anims, 'Parameter Animation — Frequency', `
const p = plot((x, { freq }) => Math.sin(freq * x), {
  params: { freq: 1 }, label: 'sin(f·x)', lineWidth: 3,
});
scene.add(p);
await animateParam(p, 'freq', { to: 6, duration: 3000, easing: 'easeInOut' });`);
      const s = await createScene(c, { width: 420, height: 320 });
      const pFreq = plot((x, { freq }) => Math.sin(freq * x), { params: { freq: 1 }, label: 'sin(f·x)', lineWidth: 3 });
      s.add(pFreq);
      async function freqLoop() {
        await animateParam(pFreq, 'freq', { from: 1, to: 6, duration: 3000, easing: 'easeInOut' });
        await animateParam(pFreq, 'freq', { from: 6, to: 1, duration: 2000, easing: 'easeInOut' });
        await wait(500);
        freqLoop();
      }
      setTimeout(freqLoop, 1000);
    }

    // 5-3: Sequence
    {
      const c = createDemo(anims, 'Animation Sequence', `
await sequence([
  () => animateParam(p, 'a', { to: 3, duration: 1000, easing: 'easeInOut' }),
  () => wait(300),
  () => animateParam(p, 'a', { to: 0.5, duration: 1000, easing: 'elasticOut' }),
  () => wait(300),
  () => animateParam(p, 'a', { to: 1, duration: 800 }),
]);`);
      const s = await createScene(c, { width: 420, height: 320 });
      const pSeq = plot((x, { a }) => a * Math.sin(x), { params: { a: 1 }, label: 'a·sin(x)', lineWidth: 3 });
      s.add(pSeq);
      async function seqLoop() {
        await sequence([
          () => animateParam(pSeq, 'a', { to: 3, duration: 1000, easing: 'easeInOut' }),
          () => wait(300),
          () => animateParam(pSeq, 'a', { to: 0.5, duration: 1000, easing: 'elasticOut' }),
          () => wait(300),
          () => animateParam(pSeq, 'a', { to: 1, duration: 800 }),
          () => wait(500),
        ]);
        seqLoop();
      }
      setTimeout(seqLoop, 1000);
    }

    // =============================================
    // 6. LINEAR ALGEBRA
    // =============================================
    const linalg = category('Linear Algebra');

    // 6-1: Shear transform
    {
      const c = createDemo(linalg, 'Shear Transform', `
const t = transform([[1, 1], [0, 1]], { showGrid: true, showEigen: true });
scene.add(t);
animateParam(t, 't', { from: 0, to: 1, duration: 2000 });`);
      const s = await createScene(c, { width: 420, height: 320 });
      const tShear = transform([[1, 1], [0, 1]], { showGrid: true, showEigen: true, color: '#3b82f6' });
      s.add(tShear);
      async function shearLoop() {
        tShear.setProgress(0);
        await animateParam(tShear, 't', { from: 0, to: 1, duration: 2000, easing: 'easeInOut' });
        await wait(1000);
        await animateParam(tShear, 't', { from: 1, to: 0, duration: 1500, easing: 'easeInOut' });
        await wait(500);
        shearLoop();
      }
      setTimeout(shearLoop, 500);
    }

    // 6-2: Rotation matrix
    {
      const c = createDemo(linalg, 'Rotation Matrix (45°)', `
const angle = Math.PI / 4;
const t = transform([
  [Math.cos(angle), -Math.sin(angle)],
  [Math.sin(angle),  Math.cos(angle)],
], { showGrid: true, showEigen: false, color: '#10b981' });`);
      const s = await createScene(c, { width: 420, height: 320 });
      const angle = Math.PI / 4;
      const tRot = transform([
        [Math.cos(angle), -Math.sin(angle)],
        [Math.sin(angle), Math.cos(angle)],
      ], { showGrid: true, showEigen: false, color: '#10b981' });
      s.add(tRot);
      async function rotLoop() {
        tRot.setProgress(0);
        await animateParam(tRot, 't', { from: 0, to: 1, duration: 2000, easing: 'easeInOut' });
        await wait(1000);
        await animateParam(tRot, 't', { from: 1, to: 0, duration: 1500, easing: 'easeInOut' });
        await wait(500);
        rotLoop();
      }
      setTimeout(rotLoop, 500);
    }

    // 6-3: Scaling
    {
      const c = createDemo(linalg, 'Non-uniform Scaling', `
const t = transform([[2, 0], [0, 0.5]], {
  showGrid: true, showEigen: true, color: '#f59e0b',
});`);
      const s = await createScene(c, { width: 420, height: 320 });
      const tScale = transform([[2, 0], [0, 0.5]], { showGrid: true, showEigen: true, color: '#f59e0b' });
      s.add(tScale);
      async function scaleLoop() {
        tScale.setProgress(0);
        await animateParam(tScale, 't', { from: 0, to: 1, duration: 2000, easing: 'easeInOut' });
        await wait(1000);
        await animateParam(tScale, 't', { from: 1, to: 0, duration: 1500, easing: 'easeInOut' });
        await wait(500);
        scaleLoop();
      }
      setTimeout(scaleLoop, 500);
    }

    // =============================================
    // 7. CALCULUS
    // =============================================
    const calc = category('Calculus');

    // 7-1: Tangent line
    {
      const c = createDemo(calc, 'Tangent Line', `
const f = plot(x => Math.sin(x), { color: '#3b82f6', lineWidth: 2 });
scene.add(f);
scene.add(tangentLine(f, { at: 1, color: '#ef4444', lineWidth: 2 }));
scene.add(point([1, Math.sin(1)], { color: '#ef4444', size: 5 }));`);
      const s = await createScene(c, { width: 420, height: 320 });
      const fTan = plot(x => Math.sin(x), { color: '#3b82f6', lineWidth: 2 });
      s.add(fTan);
      s.add(tangentLine(fTan, { at: 1, color: '#ef4444', lineWidth: 2 }));
      s.add(point([1, Math.sin(1)], { color: '#ef4444', size: 5 }));
    }

    // 7-2: Riemann sum
    {
      const c = createDemo(calc, 'Riemann Sum', `
const f = plot(x => x**2 * 0.3, { label: '0.3x²' });
scene.add(f);
const rs = riemannSum(f, { from: 0, to: 3, n: 8, color: '#10b981' });
scene.add(rs);
// Animate n from 5 to 50
animateParam(rs, 'n', { from: 5, to: 50, duration: 3000 });`);
      const s = await createScene(c, { width: 420, height: 320 });
      const fRs = plot(x => x ** 2 * 0.3, { label: '0.3x²', lineWidth: 2 });
      s.add(fRs);
      const rs = riemannSum(fRs, { from: 0, to: 3, n: 8, color: '#10b981', opacity: 0.5 });
      s.add(rs);
      async function rsLoop() {
        await animateParam(rs, 'n', { from: 5, to: 50, duration: 3000, easing: 'easeInOut' });
        await wait(1000);
        await animateParam(rs, 'n', { from: 50, to: 5, duration: 2000, easing: 'easeInOut' });
        await wait(500);
        rsLoop();
      }
      setTimeout(rsLoop, 1000);
    }

    // 7-3: Tangent + Riemann combined
    {
      const c = createDemo(calc, 'Tangent + Area Under Curve', `
const f = plot(x => Math.sin(x) + 1, { label: 'sin(x)+1', lineWidth: 2 });
scene.add(f);
scene.add(tangentLine(f, { at: 2, color: '#ef4444' }));
scene.add(riemannSum(f, { from: 0, to: Math.PI, n: 20, color: '#3b82f6', opacity: 0.3 }));`);
      const s = await createScene(c, { width: 420, height: 320 });
      const fComb = plot(x => Math.sin(x) + 1, { label: 'sin(x)+1', lineWidth: 2 });
      s.add(fComb);
      s.add(tangentLine(fComb, { at: 2, color: '#ef4444', lineWidth: 2 }));
      s.add(riemannSum(fComb, { from: 0, to: Math.PI, n: 20, color: '#3b82f6', opacity: 0.3 }));
      s.add(point([2, Math.sin(2) + 1], { color: '#ef4444', size: 5 }));
    }

    // 7-4: Area Under Curve (filled region)
    {
      const c = createDemo(calc, 'Area Under Curve (filled)', `
import { areaUnder } from 'gpu-math';
const f = plot(x => Math.sin(x), { label: 'sin(x)', lineWidth: 2 });
scene.add(f);
scene.add(areaUnder(f, { from: 0, to: Math.PI, color: '#3b82f6', opacity: 0.3 }));
scene.add(areaUnder(f, { from: Math.PI, to: 2*Math.PI, color: '#ef4444', opacity: 0.3 }));`);
      const s = await createScene(c, { width: 420, height: 320 });
      const fArea = plot(x => Math.sin(x), { label: 'sin(x)', lineWidth: 2.5 });
      s.add(fArea);
      s.add(areaUnder(fArea, { from: 0, to: Math.PI, color: '#3b82f6', opacity: 0.3 }));
      s.add(areaUnder(fArea, { from: Math.PI, to: 2 * Math.PI, color: '#ef4444', opacity: 0.3 }));
    }

    // 7-5: Gaussian bell curve area
    {
      const c = createDemo(calc, 'Gaussian — area between -σ and +σ', `
const gauss = plot(x => Math.exp(-x*x/2) / Math.sqrt(2*Math.PI), { label: 'N(0,1)' });
scene.add(gauss);
scene.add(areaUnder(gauss, { from: -1, to: 1, color: '#10b981', opacity: 0.4 }));`);
      const s = await createScene(c, { width: 420, height: 320 });
      const gauss = plot(x => Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI), { label: 'N(0,1)', lineWidth: 2.5 });
      s.add(gauss);
      s.add(areaUnder(gauss, { from: -1, to: 1, color: '#10b981', opacity: 0.4 }));
      s.add(areaUnder(gauss, { from: -3, to: -1, color: '#f59e0b', opacity: 0.2 }));
      s.add(areaUnder(gauss, { from: 1, to: 3, color: '#f59e0b', opacity: 0.2 }));
    }

    // =============================================
    // 8. 3D SURFACES
    // =============================================
    const surfaces = category('3D Surfaces');

    // 8-1: sin(u) * cos(v)
    {
      const c = createDemo(surfaces, 'sin(u) · cos(v)', `
const scene3d = await createScene3D(canvas, { width: 420, height: 320 });
scene3d.add(surface((u, v) => [u, Math.sin(u)*Math.cos(v), v], {
  u: [-3, 3], v: [-3, 3], resolution: 64, wireframe: true,
}));`);
      const s = await createScene3D(c, { width: 420, height: 320 });
      s.add(surface((u, v) => [u, Math.sin(u) * Math.cos(v), v], { u: [-3, 3], v: [-3, 3], resolution: 64, wireframe: true }));
    }

    // 8-2: Paraboloid
    {
      const c = createDemo(surfaces, 'Paraboloid — u² + v²', `
scene3d.add(surface((u, v) => [u, (u*u + v*v) * 0.3, v], {
  u: [-2, 2], v: [-2, 2], resolution: 48,
}));`);
      const s = await createScene3D(c, { width: 420, height: 320 });
      s.add(surface((u, v) => [u, (u * u + v * v) * 0.3, v], { u: [-2, 2], v: [-2, 2], resolution: 48 }));
    }

    // 8-3: Saddle surface
    {
      const c = createDemo(surfaces, 'Saddle — u² - v²', `
scene3d.add(surface((u, v) => [u, (u*u - v*v) * 0.3, v], {
  u: [-2, 2], v: [-2, 2], resolution: 48, wireframe: true,
}));`);
      const s = await createScene3D(c, { width: 420, height: 320 });
      s.add(surface((u, v) => [u, (u * u - v * v) * 0.3, v], { u: [-2, 2], v: [-2, 2], resolution: 48, wireframe: true }));
    }

    // 8-4: Ripple
    {
      const c = createDemo(surfaces, 'Ripple — sin(√(u²+v²))', `
scene3d.add(surface((u, v) => {
  const r = Math.sqrt(u*u + v*v);
  return [u, Math.sin(r * 2) / (r + 1), v];
}, { u: [-4, 4], v: [-4, 4], resolution: 80 }));`);
      const s = await createScene3D(c, { width: 420, height: 320 });
      s.add(surface((u, v) => {
        const r = Math.sqrt(u * u + v * v);
        return [u, Math.sin(r * 2) / (r + 1), v];
      }, { u: [-4, 4], v: [-4, 4], resolution: 80 }));
    }

    // 8-5: Colormaps comparison
    for (const cmap of ['viridis', 'plasma', 'magma', 'coolwarm', 'inferno'] as const) {
      const c = createDemo(surfaces, `Colormap: ${cmap}`, `
scene3d.add(surface((u, v) => [u, Math.sin(u)*Math.cos(v), v], {
  colorMap: '${cmap}',
}));`);
      const s = await createScene3D(c, { width: 420, height: 320 });
      s.add(surface((u, v) => [u, Math.sin(u) * Math.cos(v), v], { u: [-3, 3], v: [-3, 3], resolution: 48, colorMap: cmap }));
    }

    // =============================================
    // 9. 3D OBJECTS (curves, points, vectors)
    // =============================================
    const objects3d = category('3D Objects');

    // 9-1: Helix (3D parametric curve)
    {
      const c = createDemo(objects3d, 'Helix — 3D Parametric Curve', `
import { Parametric3D } from 'gpu-math';
scene3d.add(new Parametric3D(t => [Math.cos(t), t/5, Math.sin(t)], {
  t: [0, 4*Math.PI], color: '#3b82f6', lineWidth: 3,
}));`);
      const s = await createScene3D(c, { width: 420, height: 320 });
      s.add(new Parametric3D(t => [Math.cos(t), t / 5, Math.sin(t)], { t: [0, 4 * Math.PI], color: '#3b82f6', lineWidth: 3, label: 'helix' }));
    }

    // 9-2: Trefoil knot
    {
      const c = createDemo(objects3d, 'Trefoil Knot', `
scene3d.add(new Parametric3D(t => {
  const r = Math.cos(1.5*t) + 2;
  return [r*Math.cos(t), Math.sin(1.5*t), r*Math.sin(t)];
}, { t: [0, 4*Math.PI], color: '#ec4899', lineWidth: 3 }));`);
      const s = await createScene3D(c, { width: 420, height: 320 });
      s.add(new Parametric3D(t => {
        const r = Math.cos(1.5 * t) + 2;
        return [r * Math.cos(t), Math.sin(1.5 * t), r * Math.sin(t)];
      }, { t: [0, 4 * Math.PI], color: '#ec4899', lineWidth: 3, samples: 1024 }));
    }

    // 9-3: 3D Points
    {
      const c = createDemo(objects3d, '3D Points', `
import { Point3D } from 'gpu-math';
scene3d.add(new Point3D([0, 0, 0], { color: '#fff', size: 6 }));
scene3d.add(new Point3D([2, 0, 0], { color: '#ef4444', size: 8 }));
scene3d.add(new Point3D([0, 2, 0], { color: '#10b981', size: 8 }));
scene3d.add(new Point3D([0, 0, 2], { color: '#3b82f6', size: 8 }));`);
      const s = await createScene3D(c, { width: 420, height: 320 });
      s.add(new Point3D([0, 0, 0], { color: '#ffffff', size: 6 }));
      s.add(new Point3D([2, 0, 0], { color: '#ef4444', size: 8, label: 'X' }));
      s.add(new Point3D([0, 2, 0], { color: '#10b981', size: 8, label: 'Y' }));
      s.add(new Point3D([0, 0, 2], { color: '#3b82f6', size: 8, label: 'Z' }));
    }

    // 9-4: 3D Vectors
    {
      const c = createDemo(objects3d, '3D Vectors', `
import { Vector3D } from 'gpu-math';
scene3d.add(new Vector3D([0,0,0], [2,0,0], { color: '#ef4444', lineWidth: 2 }));
scene3d.add(new Vector3D([0,0,0], [0,2,0], { color: '#10b981', lineWidth: 2 }));
scene3d.add(new Vector3D([0,0,0], [0,0,2], { color: '#3b82f6', lineWidth: 2 }));
scene3d.add(new Vector3D([0,0,0], [1,1,1], { color: '#f59e0b', lineWidth: 3 }));`);
      const s = await createScene3D(c, { width: 420, height: 320 });
      s.add(new Vector3D([0, 0, 0], [2, 0, 0], { color: '#ef4444', lineWidth: 2, label: 'X' }));
      s.add(new Vector3D([0, 0, 0], [0, 2, 0], { color: '#10b981', lineWidth: 2, label: 'Y' }));
      s.add(new Vector3D([0, 0, 0], [0, 0, 2], { color: '#3b82f6', lineWidth: 2, label: 'Z' }));
      s.add(new Vector3D([0, 0, 0], [1, 1, 1], { color: '#f59e0b', lineWidth: 3, label: 'diag' }));
    }

    // 9-5: Surface + curve + points combined
    {
      const c = createDemo(objects3d, 'Surface + Curve + Points', `
// Surface
scene3d.add(surface((u, v) => [u, Math.sin(u)*Math.cos(v)*0.5, v], {
  u: [-3, 3], v: [-3, 3], resolution: 48, wireframe: true, opacity: 0.8,
}));
// Helix on top
scene3d.add(new Parametric3D(t => [Math.cos(t)*2, 1+t*0.1, Math.sin(t)*2], {
  t: [0, 4*Math.PI], color: '#ef4444', lineWidth: 3,
}));`);
      const s = await createScene3D(c, { width: 420, height: 320 });
      s.add(surface((u, v) => [u, Math.sin(u) * Math.cos(v) * 0.5, v], { u: [-3, 3], v: [-3, 3], resolution: 48, wireframe: true, opacity: 0.8 }));
      s.add(new Parametric3D(t => [Math.cos(t) * 2, 1 + t * 0.1, Math.sin(t) * 2], { t: [0, 4 * Math.PI], color: '#ef4444', lineWidth: 3 }));
      s.add(new Point3D([0, 1, 0], { color: '#f59e0b', size: 8 }));
    }

    // =============================================
    // 10. REGIONS & IMPLICIT CURVES
    // =============================================
    const regions = category('Regions & Implicit Curves');

    // Region between two functions
    {
      const c = createDemo(regions, 'Region between sin(x) and cos(x)', `
import { region } from 'gpu-math';
scene.add(plot(x => Math.sin(x), { label: 'sin(x)' }));
scene.add(plot(x => Math.cos(x), { label: 'cos(x)' }));
scene.add(region({ above: x => Math.sin(x), below: x => Math.cos(x),
  range: [-Math.PI, Math.PI], color: '#8b5cf6', opacity: 0.2 }));`);
      const s = await createScene(c, { width: 420, height: 320 });
      s.add(plot(x => Math.sin(x), { label: 'sin(x)', lineWidth: 2 }));
      s.add(plot(x => Math.cos(x), { label: 'cos(x)', lineWidth: 2 }));
      s.add(region({ above: x => Math.sin(x), below: x => Math.cos(x), range: [-Math.PI, Math.PI], color: '#8b5cf6', opacity: 0.2 }));
    }

    // y < x² region
    {
      const c = createDemo(regions, 'Region: y < x²', `
scene.add(plot(x => x*x, { label: 'x²' }));
scene.add(region({ below: x => x*x, range: [-3, 3], color: '#3b82f6', opacity: 0.15 }));`);
      const s = await createScene(c, { width: 420, height: 320 });
      s.add(plot(x => x * x, { label: 'x²', lineWidth: 2 }));
      s.add(region({ below: x => x * x, range: [-3, 3], color: '#3b82f6', opacity: 0.15 }));
    }

    // Implicit circle
    {
      const c = createDemo(regions, 'Implicit: x² + y² = 1 (unit circle)', `
import { implicitCurve } from 'gpu-math';
scene.add(implicitCurve((x, y) => x*x + y*y - 1, {
  color: '#10b981', lineWidth: 2.5,
}));`);
      const s = await createScene(c, { width: 420, height: 320 });
      s.add(implicitCurve((x, y) => x * x + y * y - 1, { color: '#10b981', lineWidth: 2.5, label: 'x²+y²=1' }));
    }

    // Implicit ellipse
    {
      const c = createDemo(regions, 'Implicit: x²/4 + y² = 1 (ellipse)', `
scene.add(implicitCurve((x, y) => x*x/4 + y*y - 1, { color: '#f59e0b' }));`);
      const s = await createScene(c, { width: 420, height: 320 });
      s.add(implicitCurve((x, y) => x * x / 4 + y * y - 1, { color: '#f59e0b', lineWidth: 2.5, label: 'ellipse' }));
    }

    // Implicit hyperbola
    {
      const c = createDemo(regions, 'Implicit: x² - y² = 1 (hyperbola)', `
scene.add(implicitCurve((x, y) => x*x - y*y - 1, { color: '#ef4444' }));`);
      const s = await createScene(c, { width: 420, height: 320 });
      s.add(implicitCurve((x, y) => x * x - y * y - 1, { color: '#ef4444', lineWidth: 2.5, label: 'x²-y²=1' }));
    }

    // Implicit figure-eight (lemniscate)
    {
      const c = createDemo(regions, 'Lemniscate of Bernoulli', `
scene.add(implicitCurve((x, y) =>
  (x*x + y*y)**2 - 4*(x*x - y*y), { color: '#ec4899', range: [-3, 3] }));`);
      const s = await createScene(c, { width: 420, height: 320 });
      s.add(implicitCurve((x, y) => (x * x + y * y) ** 2 - 4 * (x * x - y * y), { color: '#ec4899', lineWidth: 2.5, range: [-3, 3], label: 'lemniscate' }));
    }

    // =============================================
    // 11. COMPLEX FUNCTIONS
    // =============================================
    const complex = category('Complex Functions (Domain Coloring)');

    // z²
    {
      const c = createDemo(complex, 'z² — quadratic', `
import { complexPlot } from 'gpu-math';
scene.add(complexPlot(z => ({
  re: z.re*z.re - z.im*z.im,
  im: 2*z.re*z.im,
}), { range: [-3, 3], resolution: 512 }));`);
      const s = await createScene(c, { width: 420, height: 320, theme: 'dark' });
      s.add(complexPlot(z => ({ re: z.re * z.re - z.im * z.im, im: 2 * z.re * z.im }), { range: [-3, 3], resolution: 512, label: 'z²' }));
    }

    // 1/z
    {
      const c = createDemo(complex, '1/z — pole at origin', `
scene.add(complexPlot(z => {
  const d = z.re*z.re + z.im*z.im + 1e-10;
  return { re: z.re/d, im: -z.im/d };
}, { range: [-3, 3], resolution: 512 }));`);
      const s = await createScene(c, { width: 420, height: 320, theme: 'dark' });
      s.add(complexPlot(z => {
        const d = z.re * z.re + z.im * z.im + 1e-10;
        return { re: z.re / d, im: -z.im / d };
      }, { range: [-3, 3], resolution: 512, label: '1/z' }));
    }

    // sin(z)
    {
      const c = createDemo(complex, 'sin(z)', `
scene.add(complexPlot(z => ({
  re: Math.sin(z.re) * Math.cosh(z.im),
  im: Math.cos(z.re) * Math.sinh(z.im),
}), { range: [-5, 5], resolution: 512 }));`);
      const s = await createScene(c, { width: 420, height: 320, theme: 'dark' });
      s.add(complexPlot(z => ({
        re: Math.sin(z.re) * Math.cosh(z.im),
        im: Math.cos(z.re) * Math.sinh(z.im),
      }), { range: [-5, 5], resolution: 512, label: 'sin(z)' }));
    }

    // z³ - 1 (roots of unity)
    {
      const c = createDemo(complex, 'z³ - 1 — roots of unity', `
scene.add(complexPlot(z => {
  const r = z.re, i = z.im;
  return { re: r*r*r - 3*r*i*i - 1, im: 3*r*r*i - i*i*i };
}));`);
      const s = await createScene(c, { width: 420, height: 320, theme: 'dark' });
      s.add(complexPlot(z => {
        const r = z.re, i = z.im;
        return { re: r * r * r - 3 * r * i * i - 1, im: 3 * r * r * i - i * i * i };
      }, { range: [-3, 3], resolution: 512, label: 'z³-1' }));
    }

    // =============================================
    // 11. THEMES
    // =============================================
    const themes = category('Themes');

    for (const themeName of ['3b1b', 'dark', 'light', 'minimal'] as const) {
      const c = createDemo(themes, `Theme: ${themeName}`, `
createScene(canvas, { theme: '${themeName}' });`);
      const s = await createScene(c, { width: 420, height: 320, theme: themeName });
      s.add(plot(x => Math.sin(x), { label: 'sin(x)', lineWidth: 2 }));
      s.add(plot(x => Math.cos(x), { label: 'cos(x)', lineWidth: 2 }));
    }

  } catch (e) {
    const err = document.createElement('div');
    err.id = 'error';
    err.style.display = 'block';
    err.textContent = (e as Error).message;
    gallery.appendChild(err);
  }
}

main();
