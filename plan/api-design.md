# gpu-math API 설계

> 관련 문서: [architecture.md](architecture.md) (내부 구현 아키텍처) · [shaders.md](shaders.md) (GPU 셰이더 상세)
> 구현 일정: [week1](week1.md) (createScene, plot) · [week2](week2.md) (parametric, point, vector, animate) · [week3](week3.md) (surface, vectorField) · [week5-6](week5-6.md) (React 래퍼)

## 핵심 원칙

1. **한 줄로 동작**: `plot(x => Math.sin(x))` — 임포트 하나, 함수 하나로 결과
2. **점진적 복잡성**: 기본값이 아름답고, 필요하면 옵션으로 커스텀
3. **TypeScript 자동완성**: 모든 옵션에 타입, JSDoc, 기본값 표시
4. **체이닝 불필요**: 함수형 API, 객체 옵션 패턴

---

## Scene 생성

`createScene`은 TypeScript 오버로드로 2D/3D 타입을 분리한다. `Scene2D`에는 2D 객체만, `Scene3D`에는 3D 객체만 추가할 수 있다.

```typescript
import { createScene } from 'gpu-math';
import type { Scene2D, Scene3D, SceneOptions2D, SceneOptions3D } from 'gpu-math';

// 오버로드 시그니처
function createScene(canvas: HTMLCanvasElement, opts?: SceneOptions2D): Scene2D;
function createScene(canvas: HTMLCanvasElement, opts: SceneOptions3D): Scene3D;

// 2D (기본) — 반환 타입: Scene2D
const scene = createScene(document.getElementById('canvas'));

// 3D — 반환 타입: Scene3D
const scene3d = createScene(canvas, { dimension: 3 });

// 2D 옵션
const scene = createScene(canvas, {
  // dimension 생략 시 2D (기본)
  theme: '3b1b',         // '3b1b' | 'light' | 'dark' | 'minimal' | Theme
  width: 800,            // 캔버스 너비 (기본: 부모 요소 크기)
  height: 600,           // 캔버스 높이
  antialias: true,       // 안티앨리어싱 (기본: true)
  interactive: true,     // 마우스/터치 인터랙션 (기본: true)
  pixelRatio: 'auto',    // 'auto' | number (레티나 대응)
});

// 정리
scene.destroy();
```

### 타입 분리

```typescript
// 공통 옵션
interface SceneOptionsBase {
  theme?: '3b1b' | 'light' | 'dark' | 'minimal' | Theme;
  width?: number;
  height?: number;
  antialias?: boolean;
  interactive?: boolean;
  pixelRatio?: 'auto' | number;
  debug?: boolean;
}

interface SceneOptions2D extends SceneOptionsBase {
  dimension?: 2;  // 기본값
}

interface SceneOptions3D extends SceneOptionsBase {
  dimension: 3;   // 필수 명시
  fov?: number;   // 3D 전용: 시야각 (기본 45°)
}

// Scene2D는 2D 객체만 허용
interface Scene2D {
  add(obj: MathObject2D): void;
  remove(obj: MathObject2D): void;
  camera: Camera2D;
  destroy(): void;
}

// Scene3D는 3D 객체만 허용
interface Scene3D {
  add(obj: MathObject3D): void;
  remove(obj: MathObject3D): void;
  camera: Camera3D;
  destroy(): void;
}
```

이 설계를 통해 `scene2d.add(surface(...))` 같은 실수를 컴파일 타임에 잡을 수 있다.

---

## 2D 객체

### plot — 함수 그래프
```typescript
scene.add(plot(x => Math.sin(x)));

scene.add(plot(x => Math.sin(x), {
  range: [-2 * Math.PI, 2 * Math.PI],  // x 범위
  color: '#3b82f6',                      // 색상
  lineWidth: 2,                          // 선 두께 (px)
  dash: [5, 3],                          // 점선 패턴
  opacity: 1,                            // 투명도
  label: 'sin(x)',                       // 범례 라벨
  samples: 512,                          // 샘플 수 (기본 512)
}));
```

### parametric — 파라메트릭 곡선
```typescript
scene.add(parametric(t => [Math.cos(t), Math.sin(t)], {
  t: [0, 2 * Math.PI],       // t 범위
  color: '#10b981',
  label: 'circle',
  samples: 256,
}));
```

### point — 점
```typescript
scene.add(point([1, 0], {
  color: 'red',
  size: 8,          // 반지름 (px)
  label: 'A',
  shape: 'circle',  // 'circle' | 'square' | 'diamond'
}));
```

### vector — 벡터 (화살표)
```typescript
scene.add(vector([0, 0], [1, 1], {
  color: 'green',
  headSize: 10,     // 화살표 머리 크기
  label: 'v',
}));
```

### line — 선분
```typescript
scene.add(line([0, 0], [2, 1], {
  color: 'gray',
  lineWidth: 1,
  dash: [4, 4],
}));
```

### vectorField — 벡터 필드
```typescript
scene.add(vectorField((x, y) => [-y, x], {
  density: 20,              // 그리드 밀도
  scale: 0.5,               // 화살표 크기 스케일
  colorMap: 'magnitude',    // 크기에 따른 색상
  color: '#ef4444',         // 또는 단색
  normalize: false,         // true면 모든 화살표 동일 길이
}));
```

---

## 3D 객체

### surface — 3D 표면
```typescript
scene3d.add(surface((u, v) => [u, v, Math.sin(u) * Math.cos(v)], {
  u: [-3, 3],
  v: [-3, 3],
  resolution: 64,           // 그리드 해상도
  colorMap: 'viridis',      // 높이 기반 컬러맵
  wireframe: false,         // 와이어프레임 오버레이
  opacity: 1,
  lighting: true,           // Phong 라이팅
}));
```

### 3D 버전 (plot, point, vector, parametric 모두 3D 지원)
```typescript
// 3D 파라메트릭 곡선 (공간 곡선)
scene3d.add(parametric(t => [Math.cos(t), Math.sin(t), t / 5], {
  t: [0, 4 * Math.PI],
  color: '#3b82f6',
  label: 'helix',
}));
```

---

## 애니메이션

```typescript
import { animate, animateParam, sequence } from 'gpu-math';

// 객체 모핑
await animate(scene, {
  from: plot(x => Math.sin(x)),
  to: plot(x => Math.sin(2 * x)),
  duration: 1000,
  easing: 'easeInOut',
});

// 파라미터 애니메이션
const wave = plot((x, { freq }) => Math.sin(freq * x), { params: { freq: 1 } });
scene.add(wave);
await animateParam(wave, 'freq', { from: 1, to: 5, duration: 2000 });

// 시퀀스
await sequence([
  () => animate(scene, { from: f1, to: f2, duration: 500 }),
  () => animateParam(wave, 'freq', { to: 3, duration: 500 }),
  () => wait(200),
  () => animate(scene, { from: f2, to: f3, duration: 500 }),
]);
```

---

## 테마

```typescript
import { createScene, defineTheme } from 'gpu-math';

// 내장 테마
createScene(canvas, { theme: '3b1b' });   // 기본: 다크, 3Blue1Brown 스타일
createScene(canvas, { theme: 'light' });  // 밝은 배경
createScene(canvas, { theme: 'dark' });   // 순수 다크
createScene(canvas, { theme: 'minimal' });// 최소 UI

// 커스텀 테마
const myTheme = defineTheme({
  background: '#0f172a',
  grid: { color: '#1e293b', majorColor: '#334155' },
  axis: { color: '#e2e8f0', labelColor: '#94a3b8' },
  palette: ['#38bdf8', '#fb923c', '#a78bfa', '#34d399'],
});
createScene(canvas, { theme: myTheme });
```

---

## 컬러맵

```typescript
// 내장 컬러맵
'viridis'    // 노랑→초록→파랑→보라
'plasma'     // 노랑→분홍→보라
'magma'      // 노랑→빨강→검정
'coolwarm'   // 파랑→흰→빨강 (발산형)
'magnitude'  // 크기 기반 (벡터 필드용)

// 커스텀 컬러맵
const custom = defineColorMap([
  [0, '#3b82f6'],
  [0.5, '#ffffff'],
  [1, '#ef4444'],
]);
```

---

## React 래퍼 (@gpu-math/react)

```typescript
import { MathCanvas, Plot, Surface, Parametric, VectorField, Point, Vector } from '@gpu-math/react';

// 2D
<MathCanvas width={800} height={600} theme="3b1b">
  <Plot fn={x => Math.sin(x)} color="blue" label="sin(x)" />
  <Plot fn={x => Math.cos(x)} color="red" label="cos(x)" />
  <Point at={[0, 0]} color="white" label="O" />
</MathCanvas>

// 3D
<MathCanvas width={800} height={600} dimension={3}>
  <Surface fn={(u, v) => [u, v, Math.sin(u) * Math.cos(v)]} colorMap="viridis" />
</MathCanvas>

// 인터랙티브 파라미터
function Wave() {
  const [freq, setFreq] = useState(1);
  return (
    <>
      <input type="range" min={1} max={10} value={freq} onChange={e => setFreq(+e.target.value)} />
      <MathCanvas width={800} height={400}>
        <Plot fn={x => Math.sin(freq * x)} color="blue" />
      </MathCanvas>
    </>
  );
}
```
