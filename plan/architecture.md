# gpu-math 기술 아키텍처

> 관련 문서: [shaders.md](shaders.md) (셰이더 상세 WGSL 코드) · [api-design.md](api-design.md) (공개 API 설계) · [testing-strategy.md](testing-strategy.md) (테스트 전략)
> 구현 일정: [week1](week1.md) (기반) · [week2](week2.md) (수학 객체) · [week3](week3.md) (3D) · [week4](week4.md) (배포)

## 1. 패키지 구조 (모노레포)

pnpm workspace 기반 모노레포로 구성한다. 각 패키지는 독립적으로 빌드/배포 가능하다.

```
gpu-math/
├── packages/
│   ├── core/                    # gpu-math 코어 엔진 (프레임워크 무관)
│   │   ├── src/
│   │   │   ├── index.ts         # 공개 API 진입점
│   │   │   ├── engine/          # WebGPU 디바이스, 파이프라인, 렌더 루프
│   │   │   │   ├── Device.ts        # WebGPU 디바이스 초기화 + 폴백
│   │   │   │   ├── Renderer.ts      # 렌더 루프 (requestAnimationFrame)
│   │   │   │   ├── Pipeline.ts      # 렌더 파이프라인 관리
│   │   │   │   └── Canvas.ts        # 캔버스 관리 + 리사이즈
│   │   │   ├── math/            # 좌표계, 변환, 매개변수 곡선
│   │   │   │   ├── CoordinateSystem.ts  # 월드 ↔ 스크린 좌표 변환
│   │   │   │   ├── Transform.ts         # 행렬 변환 (2D/3D)
│   │   │   │   ├── Range.ts             # 범위 관리
│   │   │   │   └── Sampling.ts          # 적응적 샘플링 알고리즘
│   │   │   ├── objects/         # 수학 시각화 객체
│   │   │   │   ├── MathObject.ts    # 모든 객체의 베이스 클래스
│   │   │   │   ├── Plot2D.ts        # 2D 함수 그래프
│   │   │   │   ├── Plot3D.ts        # 3D 함수 그래프
│   │   │   │   ├── Surface.ts       # 3D 표면
│   │   │   │   ├── ParametricCurve.ts  # 매개변수 곡선
│   │   │   │   ├── VectorField.ts   # 벡터 필드
│   │   │   │   ├── Point.ts         # 점
│   │   │   │   ├── Line.ts          # 직선/선분
│   │   │   │   ├── Arrow.ts         # 화살표 (벡터)
│   │   │   │   └── Group.ts         # 객체 그룹
│   │   │   ├── camera/         # 카메라 시스템
│   │   │   │   ├── Camera2D.ts      # 2D 팬/줌
│   │   │   │   ├── Camera3D.ts      # 궤도 카메라 (회전/줌)
│   │   │   │   └── CameraController.ts  # 마우스/터치 입력 처리
│   │   │   ├── animation/      # 애니메이션 시스템
│   │   │   │   ├── Animator.ts      # 애니메이션 스케줄러
│   │   │   │   ├── Tween.ts         # 트위닝 (이징 함수)
│   │   │   │   ├── Morph.ts         # 함수 간 모핑
│   │   │   │   └── Sequence.ts      # 애니메이션 시퀀스
│   │   │   ├── shaders/        # WGSL 셰이더
│   │   │   │   ├── common.wgsl      # 공통 구조체 (CameraUniforms, ThemeUniforms)
│   │   │   │   ├── grid.wgsl        # 무한 그리드 + 축
│   │   │   │   ├── line.wgsl        # 두꺼운 라인 (곡선, 축, 화살표 몸통)
│   │   │   │   ├── surface.wgsl     # 표면 (퐁 라이팅)
│   │   │   │   ├── point.wgsl       # 점 (인스턴스드)
│   │   │   │   └── arrow.wgsl       # 화살표 머리
│   │   │   ├── interaction/    # 마우스/터치 상호작용
│   │   │   │   ├── HoverInspector.ts    # 호버 시 좌표 표시
│   │   │   │   ├── ClickHandler.ts      # 클릭 이벤트
│   │   │   │   └── GestureHandler.ts    # 터치 제스처
│   │   │   └── themes/         # 테마 시스템
│   │   │       ├── Theme.ts         # 테마 인터페이스
│   │   │       ├── dark.ts          # 3b1b 다크 테마 (기본값)
│   │   │       ├── light.ts         # 라이트 테마
│   │   │       └── custom.ts        # 커스텀 테마 빌더
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── react/                   # React 래퍼 (@gpu-math/react)
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── MathCanvas.tsx       # 메인 React 컴포넌트
│   │   │   ├── components/
│   │   │   │   ├── Plot.tsx         # <Plot fn={...} /> 컴포넌트
│   │   │   │   ├── Surface.tsx      # <Surface fn={...} /> 컴포넌트
│   │   │   │   ├── VectorField.tsx  # <VectorField fn={...} /> 컴포넌트
│   │   │   │   └── Parametric.tsx   # <Parametric fn={...} /> 컴포넌트
│   │   │   └── hooks/
│   │   │       ├── useScene.ts      # Scene 라이프사이클 관리
│   │   │       ├── useAnimation.ts  # 애니메이션 훅
│   │   │       └── useInteraction.ts # 상호작용 훅
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── examples/                # 인터랙티브 예제 사이트
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── index.tsx        # 갤러리 홈
│   │   │   │   ├── 2d-plots.tsx     # 2D 플롯 예제
│   │   │   │   ├── 3d-surfaces.tsx  # 3D 표면 예제
│   │   │   │   ├── animations.tsx   # 애니메이션 예제
│   │   │   │   └── playground.tsx   # 실시간 코드 에디터
│   │   │   └── components/
│   │   ├── package.json
│   │   └── vite.config.ts
│   └── docs/                    # 문서 사이트
│       ├── src/
│       └── package.json
├── pnpm-workspace.yaml
├── package.json                 # 루트 (스크립트, 린트 설정)
├── tsconfig.base.json
└── turbo.json                   # Turborepo 설정 (빌드 캐시)
```

---

## 2. WebGPU 렌더링 파이프라인

### 2.1 디바이스 초기화

> **v0.1 범위**: WebGPU 전용. WebGL2/Canvas2D 폴백은 v0.2 이후 로드맵으로 분리한다.
> WebGPU는 2025년 11월 기준 Chrome, Edge, Safari, Firefox 모든 주요 브라우저에서 지원된다.

```typescript
// v0.1 초기화 흐름
async function initDevice(canvas: HTMLCanvasElement): Promise<GPUState> {
  if (!navigator.gpu) {
    throw new GpuMathError(
      'WebGPU is not supported in this browser. ' +
      'Please use a recent version of Chrome, Edge, Safari, or Firefox.'
    );
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new GpuMathError('Failed to get GPU adapter.');
  }

  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu')!;
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format });

  return { device, context, format };
}
```

WebGPU 미지원 환경에서는 명확한 에러 메시지를 표시한다. 향후 폴백 로드맵:

```
v0.1: WebGPU 전용 (현재)
v0.2: WebGL2 폴백 (셰이더 자동 변환, 기능 제한 경고)
v0.3: Canvas2D 최소 폴백 (정적 2D 플롯만)
```

### 2.2 렌더 레이어 순서

각 프레임에서 아래 순서로 렌더링한다. 뒤에 그려지는 레이어가 앞에 표시된다.

```
Layer 0: 배경 (clear color)
Layer 1: 그리드 + 축 (Grid shader — 축, 눈금 포함)
Layer 2: 수학 객체 (Plot, Surface, VectorField 등)
Layer 3: 포인트/마커 (Point shader)
Layer 4: 레이블/텍스트 (Canvas2D 오버레이)
Layer 5: UI 오버레이 (호버 정보, 범례)
```

### 2.3 Depth / Blend State 전략

각 렌더 레이어별로 depth와 blend 설정이 다르다.

#### 2D 모드

2D에서는 depth buffer를 사용하지 않고, **렌더 순서(painter's algorithm)**로 겹침을 해결한다.

| 레이어 | Depth | Blend | 이유 |
|--------|-------|-------|------|
| Grid | off | off (불투명) | 배경 위에 직접 그림 |
| 곡선 (Plot) | off | alpha blend | 곡선 겹침 시 투명도 합성 |
| 포인트 | off | alpha blend | SDF 안티앨리어싱 가장자리 |
| 화살표 | off | alpha blend | SDF 가장자리 |

```typescript
// 2D 곡선 파이프라인의 blend 설정
const blendState: GPUBlendState = {
  color: {
    srcFactor: 'src-alpha',
    dstFactor: 'one-minus-src-alpha',
    operation: 'add',
  },
  alpha: {
    srcFactor: 'one',
    dstFactor: 'one-minus-src-alpha',
    operation: 'add',
  },
};
```

#### 3D 모드

3D에서는 **depth buffer + 2패스 렌더링**으로 불투명/반투명 객체를 분리한다.

| 패스 | 대상 | Depth Write | Depth Test | Blend |
|------|------|-------------|------------|-------|
| Pass 1: 불투명 | Surface (opacity=1), 축 | on | less | off |
| Pass 2: 반투명 | Surface (opacity<1), 곡선, 포인트 | off | less (읽기만) | alpha blend |

```
렌더 순서 (3D):
  1. depth buffer clear
  2. Pass 1: 불투명 표면 렌더링 (depth write ON)
  3. Pass 2: 반투명 객체를 뒤→앞 정렬 후 렌더링 (depth write OFF)
  4. Canvas2D 오버레이 (텍스트, UI)
```

반투명 표면의 정렬은 **각 표면의 중심점**을 카메라 거리 기준으로 정렬한다. 메시 내부 삼각형 단위 정렬은 v0.1에서는 하지 않는다 (성능 대비 시각적 개선이 미미).

#### Depth Buffer 설정

```typescript
// depth 텍스처 생성
const depthTexture = device.createTexture({
  size: [canvas.width, canvas.height],
  format: 'depth24plus',
  usage: GPUTextureUsage.RENDER_ATTACHMENT,
});

// 렌더 패스에 depth attachment 추가
const renderPassDescriptor: GPURenderPassDescriptor = {
  colorAttachments: [/* ... */],
  depthStencilAttachment: {
    view: depthTexture.createView(),
    depthClearValue: 1.0,
    depthLoadOp: 'clear',
    depthStoreOp: 'store',
  },
};
```

### 2.4 렌더 루프 아키텍처

```typescript
class Renderer {
  private objects: MathObject[] = [];
  private camera: Camera;
  private animator: Animator;

  // 메인 렌더 루프
  private frame(timestamp: number): void {
    // 1. 애니메이션 업데이트
    this.animator.update(timestamp);

    // 2. 카메라 행렬 계산
    const viewProjection = this.camera.getViewProjectionMatrix();

    // 3. GPU 커맨드 인코딩
    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginRenderPass(this.renderPassDescriptor);

    // 4. 레이어 순서대로 렌더링
    this.renderGrid(pass, viewProjection);  // 그리드 + 축 통합 렌더링
    for (const obj of this.objects) {
      obj.render(pass, viewProjection);
    }
    this.renderLabels(); // Canvas2D 오버레이

    pass.end();
    this.device.queue.submit([encoder.finish()]);

    // 5. 다음 프레임 요청
    requestAnimationFrame((t) => this.frame(t));
  }
}
```

---

## 3. 카메라 시스템

### 3.1 2D 카메라 (Camera2D)

- **팬(Pan)**: 마우스 드래그 / 터치 드래그로 뷰 이동
- **줌(Zoom)**: 마우스 휠 / 핀치 제스처로 확대/축소
- **줌 중심**: 마우스 커서 위치를 중심으로 줌 (Google Maps 방식)
- **내부 표현**: `center: [x, y]` + `scale: number`
- **행렬 생성**: orthographic projection matrix

```typescript
interface Camera2DState {
  center: [number, number];   // 뷰 중심의 월드 좌표
  scale: number;              // 단위당 픽셀 수
  rotation: number;           // 라디안 (기본 0)
}
```

### 3.2 3D 카메라 (Camera3D — 궤도 카메라)

- **회전(Orbit)**: 마우스 드래그로 구면 좌표 회전
- **줌(Zoom)**: 마우스 휠로 거리 조절
- **팬(Pan)**: Shift + 드래그로 타겟 이동
- **내부 표현**: `target: [x, y, z]` + `azimuth` + `elevation` + `distance`
- **행렬 생성**: perspective projection matrix + lookAt view matrix

```typescript
interface Camera3DState {
  target: [number, number, number];  // 바라보는 지점
  azimuth: number;                   // 수평 회전 (라디안)
  elevation: number;                 // 수직 회전 (라디안)
  distance: number;                  // 타겟까지 거리
  fov: number;                       // 시야각 (기본 45°)
}
```

---

## 4. 애니메이션 시스템

### 4.1 구조

```
Animator (싱글톤)
├── Tween          # 값 A → B 보간 (이징 함수 적용)
├── Morph          # 함수 간 모핑 (샘플 포인트 보간)
└── Sequence       # 여러 애니메이션을 순차/병렬 실행
```

### 4.2 이징 함수

기본 제공 이징: `linear`, `easeIn`, `easeOut`, `easeInOut`, `bounceOut`, `elasticOut`

### 4.3 함수 모핑 알고리즘

1. 시작 함수 `f(x)`와 끝 함수 `g(x)`의 샘플 포인트를 동일 x 값에서 추출
2. 각 샘플 포인트의 y값을 이징 함수로 보간: `y = lerp(f(x), g(x), t)`
3. 보간된 포인트로 곡선 렌더링
4. 특이점(불연속, ±∞) 처리: NaN/Infinity 감지 후 건너뛰기

---

## 5. WGSL 셰이더 전략

### 5.1 공통 구조

모든 셰이더는 공통 유니폼 바인딩 구조를 사용한다. 카메라와 테마를 분리하여 독립적으로 업데이트할 수 있다:

```wgsl
// common.wgsl — 모든 셰이더에서 import
struct CameraUniforms {
  viewProjection: mat4x4<f32>,
  view: mat4x4<f32>,
  projection: mat4x4<f32>,
  cameraPos: vec3<f32>,
  resolution: vec2<f32>,
  pixelRatio: f32,
}

struct ThemeUniforms {
  backgroundColor: vec4<f32>,
  gridColor: vec4<f32>,
  gridMajorColor: vec4<f32>,
  axisColor: vec4<f32>,
}

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var<uniform> theme: ThemeUniforms;
```

### 5.2 셰이더 목록

| 셰이더 | 용도 | 렌더링 방식 |
|---------|------|-------------|
| `grid.wgsl` | 무한 그리드 + 축 | 풀스크린 쿼드, 프래그먼트에서 그리드/축 계산 |
| `line.wgsl` | 두꺼운 라인 (곡선, 선분, 화살표 몸통) | 라인 스트립 → 쿼드 확장 (SDF 안티앨리어싱) |
| `surface.wgsl` | 3D 표면 (퐁 라이팅) | 삼각형 메시, 노멀 계산 |
| `point.wgsl` | 점/마커 | 인스턴스드 원/구 렌더링 (빌보드 쿼드) |
| `arrow.wgsl` | 화살표 머리 (벡터, 축 끝) | 인스턴스드, 삼각형 SDF |

### 5.3 곡선 렌더링 기법 (핵심)

WebGPU에는 `GL_LINE_WIDTH`에 해당하는 기능이 없으므로, 두꺼운 선을 직접 구현해야 한다:

1. **CPU에서 라인 스트립 포인트 생성** (함수 샘플링)
2. **버텍스 셰이더에서 쿼드 확장**: 각 선분을 법선 방향으로 확장하여 사각형으로 만듦
3. **프래그먼트 셰이더에서 안티앨리어싱**: 가장자리 SDF(Signed Distance Field)로 부드러운 경계
4. **라운드 캡**: 선분 끝에 반원 추가 (조인트 처리)

```
포인트 → [확장] → 쿼드 스트립 → [래스터화] → 안티앨리어싱된 곡선
```

---

## 6. 데이터 흐름

```
사용자 API 호출
  ↓
Scene.add(mathObject)
  ↓
MathObject가 함수 샘플링 (CPU)
  ↓
GPU 버퍼 생성/업데이트 (정점 데이터)
  ↓
렌더 루프에서 해당 셰이더로 드로우콜
  ↓
카메라 변환 적용 → 스크린에 출력
```

### 적응적 샘플링 (Adaptive Sampling)

균일한 간격으로 샘플링하면 급격히 변하는 구간에서 부정확하다. 적응적 샘플링을 사용한다:

1. 초기 균일 샘플 (예: 256개 점)
2. 인접 점 간의 각도 변화 측정
3. 각도 변화가 임계값(예: 5°) 이상이면 해당 구간에 점 추가
4. 최대 깊이(예: 12단계)까지 재귀적으로 세분화
5. 결과: 완만한 구간은 적은 점, 급변 구간은 많은 점

### GPU 버퍼 라이프사이클 관리

GPU 버퍼의 생성, 업데이트, 해제 전략을 명확히 정의한다.

#### 버퍼 풀(Buffer Pool)

매 프레임마다 버퍼를 생성/삭제하는 것은 비용이 크므로, **버퍼 풀**을 사용한다:

```typescript
class BufferPool {
  private pool: Map<number, GPUBuffer[]>;  // 크기별 유휴 버퍼 목록

  acquire(size: number): GPUBuffer;   // 풀에서 재사용 또는 새로 생성
  release(buffer: GPUBuffer): void;   // 풀로 반환 (destroy 하지 않음)
  flush(): void;                      // 유휴 버퍼 전체 destroy (메모리 해제)
}
```

#### 버퍼 업데이트 전략

| 상황 | 전략 |
|------|------|
| 함수 파라미터 변경 (같은 샘플 수) | `device.queue.writeBuffer()`로 기존 버퍼 덮어쓰기 |
| 줌 변경 → 적응적 리샘플링 (샘플 수 변경) | 기존 버퍼 release → 새 크기로 acquire |
| `scene.add(obj)` | 새 버퍼 acquire, 파이프라인 바인딩 |
| `scene.remove(obj)` | 버퍼 release (풀로 반환) |
| `scene.destroy()` | 모든 버퍼 destroy, 풀 flush, 디바이스 해제 |

#### 가변 크기 버퍼

적응적 샘플링 결과는 매번 크기가 다를 수 있다. **여유 공간 전략**으로 잦은 재할당을 방지한다:

```
실제 필요 크기: N 정점
할당 크기: nextPowerOf2(N) 정점  (예: 700 → 1024)
드로우콜: vertexCount = N (실제 데이터만 렌더링)
```

버퍼 크기가 부족할 때만 재할당하고, 2배 이상 남으면 축소한다.

#### 리소스 해제 타이밍

```
scene.remove(obj)
  → obj.releaseBuffers()     // 버퍼를 풀로 반환
  → 다음 프레임 렌더링에서 제외

scene.destroy()
  → 모든 객체 remove
  → bufferPool.flush()       // GPU 버퍼 전체 destroy
  → device.destroy()         // WebGPU 디바이스 해제
  → canvas context unconfigure
```

---

## 7. 텍스트/레이블 렌더링 전략

WebGPU로 텍스트를 직접 렌더링하는 것은 복잡하므로, 이중 캔버스 전략을 사용한다:

1. **하위 레이어**: WebGPU 캔버스 (수학 객체 렌더링)
2. **상위 레이어**: Canvas2D 캔버스 (텍스트, 레이블, UI 오버레이)
3. 두 캔버스를 CSS로 겹쳐놓음 (`position: absolute`)
4. 카메라 변환 시 Canvas2D 레이블도 동기화

```
┌───────────────────────┐
│   Canvas2D (레이블)    │  ← z-index: 2, pointer-events: none
├───────────────────────┤
│   WebGPU (수학 객체)   │  ← z-index: 1
└───────────────────────┘
```

---

## 8. 번들 크기 전략

목표: core 패키지 **< 50KB** (gzipped)

- **트리셰이킹**: ESM 모듈, side-effect-free 마킹
- **셰이더 인라인**: WGSL 파일을 빌드 시 문자열로 인라인
- **지연 로딩**: 3D 기능은 `import('gpu-math/3d')`로 필요 시 로드
- **코드 스플릿**: core(2D 기본) / 3d / animation / react 별도 엔트리
- **의존성 제로**: 외부 런타임 의존성 없음 (pure TypeScript)

```
gpu-math (core, 2D만)        ~25KB gzipped
gpu-math (core + 3D)         ~40KB gzipped
gpu-math (full)              ~50KB gzipped
@gpu-math/react              ~5KB gzipped (core peer dep)
```

---

## 9. 에러 처리 & 디버그

- **WebGPU 미지원**: `GpuMathError` 발생 + 브라우저 업데이트 안내 메시지 (v0.1, 폴백 없음)
- **셰이더 컴파일 에러**: 개발 모드에서 WGSL 에러 메시지 콘솔 출력
- **함수 에러**: `NaN`, `Infinity` 자동 감지 → 해당 구간 건너뛰기
- **GPU 메모리**: 객체 제거 시 GPU 버퍼 자동 해제 (destroy 패턴)
- **디버그 모드**: `createScene(canvas, { debug: true })` — 와이어프레임, FPS, GPU 타이밍 표시
