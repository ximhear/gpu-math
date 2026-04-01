# Week 1: WebGPU 기반 구축

> 관련 문서: [architecture.md](architecture.md) (패키지 구조, 렌더 파이프라인) · [shaders.md](shaders.md) (Grid 셰이더, 공통 구조체) · [api-design.md](api-design.md) (createScene, plot API)

## Day 1: 모노레포 셋업

### 태스크
- [ ] pnpm workspace 초기화
- [ ] TypeScript 설정 (strict mode, paths)
- [ ] tsup 번들링 설정 (ESM + CJS dual output)
- [ ] 패키지 구조 생성

### 폴더 구조
```
gpu-math/
├── packages/
│   ├── core/           # gpu-math 메인 패키지
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   └── engine/
│   │   ├── tsconfig.json
│   │   └── package.json
│   ├── react/          # @gpu-math/react
│   └── examples/       # 예제 사이트
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json
```

### 명령어
```bash
mkdir gpu-math && cd gpu-math
pnpm init
mkdir -p packages/core/src/engine packages/react/src packages/examples/src
```

### pnpm-workspace.yaml
```yaml
packages:
  - 'packages/*'
```

### 완료 기준
- `pnpm build` 실행 시 packages/core가 빌드됨
- `import { createScene } from 'gpu-math'` 타입 체크 통과

---

## Day 2: WebGPU 디바이스 초기화 + 렌더 루프

### 태스크
- [ ] WebGPU 어댑터/디바이스 요청
- [ ] Canvas 설정 + GPUCanvasContext 구성
- [ ] requestAnimationFrame 렌더 루프
- [ ] clear color로 화면 채우기 (동작 확인용)

### 핵심 코드 구조
```typescript
// src/engine/device.ts
export async function initGPU(canvas: HTMLCanvasElement): Promise<GPUState> {
  const adapter = await navigator.gpu?.requestAdapter();
  if (!adapter) throw new Error('WebGPU not supported');
  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu')!;
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format });
  return { device, context, format };
}

// src/engine/renderer.ts
export function createRenderLoop(state: GPUState, renderFn: () => void) {
  function frame() {
    renderFn();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
```

### 완료 기준
- 브라우저에서 canvas에 배경색이 렌더링됨
- WebGPU 미지원 브라우저에서 에러 메시지 표시

---

## Day 3: 그리드 셰이더 + 축 렌더링

### 태스크
- [ ] 무한 그리드 WGSL 셰이더 작성
- [ ] X/Y 축 렌더링 (화살표 포함)
- [ ] 눈금(tick marks) 렌더링
- [ ] 뷰포트 ↔ 수학 좌표 변환

### WGSL 그리드 셰이더 핵심
```wgsl
// shaders/grid.wgsl
// 공통 유니폼 (common.wgsl에서 정의)
@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var<uniform> theme: ThemeUniforms;
@group(1) @binding(0) var<uniform> grid: GridUniforms;

struct GridUniforms {
  spacing: f32,
  majorEvery: f32,
  fadeStart: f32,
  fadeEnd: f32,
  lineWidth: f32,
}

@fragment
fn fs_main(@location(0) worldPos: vec2<f32>) -> @location(0) vec4<f32> {
  // 보조 그리드
  let g = abs(fract(worldPos / grid.spacing - 0.5) - 0.5) / fwidth(worldPos / grid.spacing);
  let minorAlpha = 1.0 - min(min(g.x, g.y), 1.0);

  // 주요 그리드
  let mg = abs(fract(worldPos / (grid.spacing * grid.majorEvery) - 0.5) - 0.5)
            / fwidth(worldPos / (grid.spacing * grid.majorEvery));
  let majorAlpha = 1.0 - min(min(mg.x, mg.y), 1.0);

  // 축 (x=0, y=0)
  let axisAlpha = 1.0 - min(min(abs(worldPos.y) / fwidth(worldPos.y),
                                  abs(worldPos.x) / fwidth(worldPos.x)), 1.0);

  // 합성
  var color = theme.backgroundColor;
  color = mix(color, theme.gridColor, minorAlpha * 0.3);
  color = mix(color, theme.gridMajorColor, majorAlpha * 0.5);
  color = mix(color, theme.axisColor, axisAlpha * 0.8);
  return color;
}
```

### 완료 기준
- 무한 그리드가 렌더링됨 (가장자리 페이드 아웃)
- X/Y 축이 굵은 선으로 표시됨
- 눈금 간격이 표시됨

---

## Day 4: 카메라 시스템 (2D 팬/줌)

### 태스크
- [ ] 2D 카메라 클래스 (center, zoom)
- [ ] 마우스 드래그 → 팬
- [ ] 마우스 휠 → 줌 (수학적 좌표 기준)
- [ ] 터치 지원 (모바일: pinch-to-zoom, drag-to-pan)
- [ ] 뷰 매트릭스 → uniform 버퍼 업데이트

### 카메라 API
```typescript
// src/camera/camera2d.ts
export class Camera2D {
  center: Vec2 = [0, 0];
  zoom: number = 1;

  pan(dx: number, dy: number): void;
  zoomAt(factor: number, screenX: number, screenY: number): void;
  getViewMatrix(): Mat4;
  screenToWorld(screenX: number, screenY: number): Vec2;
  worldToScreen(worldX: number, worldY: number): Vec2;
}
```

### 완료 기준
- 마우스 드래그로 그리드 이동 가능
- 마우스 휠로 줌 인/아웃 가능
- 줌 시 마우스 위치 기준 확대 (구글 맵처럼)

---

## Day 5: 첫 수학 객체 — Plot2D

### 태스크
- [ ] `plot()` 함수 구현
- [ ] 함수 → 정점 배열 변환 (샘플링)
- [ ] 곡선 렌더링 WGSL 셰이더 (두꺼운 라인)
- [ ] `createScene` + `scene.add()` API

### 타겟 API
```typescript
import { createScene, plot } from 'gpu-math';

const scene = createScene(document.getElementById('canvas'));
scene.add(plot(x => Math.sin(x), {
  color: '#3b82f6',
  range: [-2 * Math.PI, 2 * Math.PI],
  lineWidth: 2,
}));
```

### 곡선 렌더링 전략
```
1. 함수를 N개 점으로 샘플링 (기본 512점)
2. 점들을 GPU 버퍼에 업로드
3. 인접 점 쌍으로 두꺼운 라인 세그먼트 생성 (vertex shader에서 확장)
4. 안티앨리어싱 적용 (fragment shader에서 SDF 기반)
```

### 완료 기준
- `plot(x => Math.sin(x))` 한 줄로 사인파 렌더링
- 곡선이 부드럽고 안티앨리어싱됨
- 줌/팬 시 곡선이 올바르게 변환됨
- 기본 테마 (3b1b 다크) 적용됨
