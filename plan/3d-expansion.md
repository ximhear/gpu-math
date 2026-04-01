# 3D 확장 계획서

> 관련 문서: [architecture.md](architecture.md) (렌더 파이프라인, 카메라, 셰이더 전략) | [api-design.md](api-design.md) (3D API 타겟) | [shaders.md](shaders.md) (셰이더 상세)
> 작성일: 2026-04-01

---

## 현재 상태 분석

### 구현 완료된 3D 기능

| 모듈 | 파일 | 상태 |
|------|------|------|
| Scene3D | `engine/Scene3D.ts` | 완료 -- `createScene3D()` 팩토리 |
| Renderer3D | `engine/Renderer3D.ts` | 완료 -- depth buffer, 렌더 루프 |
| Camera3D | `camera/Camera3D.ts` | 완료 -- 오비탈 카메라 (theta/phi/distance) |
| CameraController3D | `camera/CameraController3D.ts` | 완료 -- 마우스 드래그 회전, 휠 줌 |
| Surface3D | `objects/Surface3D.ts` | 완료 -- 파라메트릭 표면, Phong, viridis, 와이어프레임 |
| surface.wgsl | `shaders/surface.wgsl` | 완료 -- Phong 라이팅, two-sided, 와이어프레임 |

### 핵심 제약 사항

1. **Renderer3D가 `Surface3D`만 허용**: `objects: Surface3D[]` 타입으로 고정되어 있어, 새로운 3D 객체를 추가하려면 타입을 일반화해야 한다.
2. **Scene3DHandle.add()가 `Surface3D`만 허용**: 마찬가지로 타입이 고정되어 있다.
3. **3D 전용 MathObject 베이스가 없음**: 2D의 `MathObject`는 `CameraUniformData`(2D)를 받고, `Surface3D`는 `MathObject`를 상속하지 않고 독립적으로 구현됨.
4. **3D용 Line/Point 셰이더 없음**: 기존 `line.wgsl`, `point.wgsl`은 2D 전용 (NDC 공간에서 쿼드 확장, Z=0 고정).
5. **컬러맵이 viridis 하드코딩**: `surface.wgsl`에 viridis 함수만 인라인 됨.

---

## 아키텍처 변경: MathObject3D 추상 클래스 도입

모든 3D 객체의 공통 인터페이스를 정의하여 `Renderer3D`와 `Scene3DHandle`이 다형적으로 처리할 수 있게 한다.

### 변경 전

```
Surface3D (독립 클래스, MathObject 미상속)
  init(gpu) / render(pass, camera3d) / destroy()

Renderer3D
  objects: Surface3D[]           <-- Surface만 가능
```

### 변경 후

```
MathObject3D (추상 클래스)
  abstract init(gpu: GPUState): void
  abstract render(pass: GPURenderPassEncoder, camera: Camera3DUniformData): void
  abstract destroy(): void

Surface3D extends MathObject3D
Parametric3D extends MathObject3D
Point3D extends MathObject3D
Vector3D extends MathObject3D
VectorField3D extends MathObject3D
Grid3D extends MathObject3D

Renderer3D
  objects: MathObject3D[]        <-- 모든 3D 객체 가능
```

### 구현 전략

`MathObject3D`를 `objects/MathObject3D.ts`에 정의한다. 기존 `MathObject`(2D)와 동일한 패턴이지만 카메라 타입이 다르다.

```typescript
// objects/MathObject3D.ts
import type { GPUState } from '../types.js';
import type { Camera3DUniformData } from '../camera/Camera3D.js';

export abstract class MathObject3D {
  abstract init(gpu: GPUState): void;
  abstract render(pass: GPURenderPassEncoder, camera: Camera3DUniformData): void;
  abstract destroy(): void;
}
```

기존 `Surface3D`는 `MathObject3D`를 상속하도록 수정한다 (메서드 시그니처가 이미 일치하므로 `extends MathObject3D`만 추가).

`Renderer3D.objects`를 `MathObject3D[]`로 변경하고, `Scene3DHandle.add()`도 `MathObject3D`를 받도록 한다.

---

## 작업 목록 (우선순위 순)

### Phase 1: 기반 인프라 (선행 필수)

| # | 작업 | 예상 소요 | 난이도 |
|---|------|-----------|--------|
| 1.1 | MathObject3D 추상 클래스 생성 | 0.5h | 낮음 |
| 1.2 | Surface3D가 MathObject3D를 상속하도록 수정 | 0.5h | 낮음 |
| 1.3 | Renderer3D를 MathObject3D[] 기반으로 일반화 | 0.5h | 낮음 |
| 1.4 | Scene3DHandle.add/remove를 MathObject3D 기반으로 수정 | 0.5h | 낮음 |
| 1.5 | 3D용 Line 셰이더 (`line3d.wgsl`) 작성 | 3h | 중간 |
| 1.6 | 3D용 LinePipeline3D + LineGeometry3D 모듈 작성 | 3h | 중간 |
| 1.7 | 3D용 Point 셰이더 (`point3d.wgsl`) 작성 | 2h | 중간 |
| 1.8 | 컬러맵 WGSL 모듈 분리 (`colormap.wgsl`) | 2h | 낮음 |

**소계: 약 12시간 (1.5일)**

### Phase 2: 핵심 3D 객체 (가치 높은 기능)

| # | 작업 | 예상 소요 | 난이도 | 의존성 |
|---|------|-----------|--------|--------|
| 2.1 | Parametric3D -- 3D 공간 곡선 | 4h | 중간 | 1.5, 1.6 |
| 2.2 | Point3D -- 3D 점 (빌보드 SDF) | 3h | 중간 | 1.7 |
| 2.3 | Vector3D -- 3D 벡터/화살표 | 5h | 중간~높음 | 1.5, 1.6 |
| 2.4 | Grid3D -- 3D 축 + 바닥 그리드 | 4h | 중간 | 1.1 |
| 2.5 | 다중 컬러맵 (plasma, magma, coolwarm) 지원 | 3h | 낮음 | 1.8 |

**소계: 약 19시간 (2.5일)**

### Phase 3: 고급 3D 기능

| # | 작업 | 예상 소요 | 난이도 | 의존성 |
|---|------|-----------|--------|--------|
| 3.1 | VectorField3D -- 3D 벡터 필드 | 6h | 높음 | 2.3 |
| 3.2 | 3D 텍스트/라벨 (Canvas2D 오버레이) | 4h | 중간 | 2.4 |
| 3.3 | 3D 인터랙션 (표면 호버, 좌표 표시) | 4h | 중간 | -- |
| 3.4 | 반투명 정렬 (multi-pass rendering) | 3h | 높음 | -- |

**소계: 약 17시간 (2일)**

**전체 총계: 약 48시간 (6일)**

---

## 상세 구현 전략

### 1.5 3D Line 셰이더 (`line3d.wgsl`)

기존 2D `line.wgsl`은 NDC 공간에서 쿼드를 확장한다 (Z=0 고정, `invViewProjection` 사용). 3D에서는 다음이 달라진다:

- 정점이 3D 월드 좌표 (`vec3<f32>`)
- `viewProjection`으로 NDC 변환 후 스크린 공간에서 쿼드 확장 (두께는 여전히 픽셀 단위)
- depth 값을 보존하여 표면과의 전후 관계가 올바르게 처리됨

```wgsl
// line3d.wgsl -- 핵심 전략
struct Camera3DUniforms {
  viewProjection: mat4x4<f32>,
  resolution: vec2<f32>,
  pixelRatio: f32,
  _pad: f32,
}

struct VertexInput {
  @location(0) posA: vec3<f32>,     // 3D 좌표
  @location(1) posB: vec3<f32>,     // 3D 좌표
  @location(2) uv: vec2<f32>,
  @location(3) along: f32,
}

@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
  // 1. 두 끝점을 clip space로 변환
  let clipA = camera.viewProjection * vec4(in.posA, 1.0);
  let clipB = camera.viewProjection * vec4(in.posB, 1.0);

  // 2. perspective divide 후 스크린 좌표 계산
  let ndcA = clipA.xy / clipA.w;
  let ndcB = clipB.xy / clipB.w;
  let screenA = ndcA * camera.resolution * 0.5;
  let screenB = ndcB * camera.resolution * 0.5;

  // 3. 스크린 공간에서 법선 계산 + 쿼드 확장
  let delta = screenB - screenA;
  let normal = normalize(vec2(-delta.y, delta.x));
  let screenPos = mix(screenA, screenB, in.uv.x);
  let offset = normal * in.uv.y * line.width * camera.pixelRatio * 0.5;
  let expanded = screenPos + offset;

  // 4. NDC로 역변환, Z/W는 원래 clip 값 보간
  let ndc = expanded / (camera.resolution * 0.5);
  let clipZ = mix(clipA.z / clipA.w, clipB.z / clipB.w, in.uv.x);
  let clipW = mix(clipA.w, clipB.w, in.uv.x);

  out.position = vec4(ndc * clipW, clipZ * clipW, clipW);
  // ...
}
```

**기존 코드 재사용**: `LineGeometry.ts`의 빌드 로직을 3D로 확장한 `LineGeometry3D.ts`를 새로 만든다. `LinePoint`를 `{x, y, z}`로 확장. 확장 로직(posA/posB 쌍, uv, along 계산)은 동일한 패턴을 따른다.

### 1.7 3D Point 셰이더 (`point3d.wgsl`)

기존 2D `point.wgsl`과 동일한 빌보드 쿼드 + SDF 접근이지만:

- 중심 좌표가 `vec3<f32>`
- `viewProjection`으로 clip 공간 변환 후 스크린 확장
- depth를 보존하여 표면 뒤에 있으면 가려짐

```wgsl
@vertex
fn vs_main(@builtin(vertex_index) vid: u32) -> VertexOutput {
  let clipCenter = camera.viewProjection * vec4(pt.center, 1.0);
  let ndcCenter = clipCenter.xy / clipCenter.w;
  let screen = ndcCenter * camera.resolution * 0.5;
  let expanded = screen + local * pt.size * camera.pixelRatio;
  let ndc = expanded / (camera.resolution * 0.5);
  out.position = vec4(ndc * clipCenter.w, clipCenter.z, clipCenter.w);
}
```

### 1.8 컬러맵 모듈 분리

현재 `surface.wgsl`에 `viridis()` 함수가 인라인되어 있다. 이를 독립 WGSL 모듈로 분리하고, 다중 컬러맵을 지원한다.

**전략**: WGSL은 아직 모듈 import를 지원하지 않으므로, 빌드 타임에 컬러맵 함수 코드를 셰이더 소스에 인젝션하는 방식을 사용한다.

```typescript
// engine/colormaps.ts
const COLORMAP_WGSL: Record<string, string> = {
  viridis: `fn colormap(t: f32) -> vec3<f32> { /* ... */ }`,
  plasma:  `fn colormap(t: f32) -> vec3<f32> { /* ... */ }`,
  magma:   `fn colormap(t: f32) -> vec3<f32> { /* ... */ }`,
  coolwarm:`fn colormap(t: f32) -> vec3<f32> { /* ... */ }`,
};

export function injectColormap(shaderSource: string, mapName: string): string {
  return shaderSource.replace('// COLORMAP_PLACEHOLDER', COLORMAP_WGSL[mapName] ?? COLORMAP_WGSL.viridis);
}
```

`surface.wgsl`에서 기존 `viridis()` 함수를 `// COLORMAP_PLACEHOLDER` 마커로 교체하고, `Surface3D.init()` 시 셰이더 소스를 동적으로 조합한다.

### 2.1 Parametric3D -- 3D 공간 곡선

**API** (api-design.md 기준):
```typescript
scene3d.add(parametric(t => [Math.cos(t), Math.sin(t), t / 5], {
  t: [0, 4 * Math.PI],
  color: '#3b82f6',
  lineWidth: 2,
  samples: 512,
  label: 'helix',
}));
```

**구현 전략**:
- 기존 `Parametric2D`와 동일한 패턴: 함수 샘플링 -> 정점 생성 -> LinePipeline으로 렌더링
- `fn: (t: number) => Vec3` (2D는 `Vec2` 반환)
- `LineGeometry3D.buildLineVertices3D()`로 3D 정점 데이터 생성
- `LinePipeline3D`(line3d.wgsl 기반) 사용

**기존 코드 재사용 가능 여부**:
- 샘플링 로직 (`for` 루프 + NaN 필터링): 동일 패턴, 새로 작성
- LineGeometry 빌드 로직: 2D(`float32x2`) -> 3D(`float32x3`)로 확장 필요, 새 모듈 작성
- LinePipeline: 2D와 셰이더가 다르므로 별도 `LinePipeline3D` 필요
- 유니폼 구조 (색상, 두께, 대시 패턴): 동일 재사용

### 2.2 Point3D -- 3D 점

**API**:
```typescript
scene3d.add(point([1, 2, 3], {
  color: 'red',
  size: 8,
  label: 'P',
}));
```

**구현 전략**:
- `Point2D`와 동일한 패턴: 유니폼에 중심 좌표 + 크기 + 색상, 6 정점 빌보드 쿼드
- `point3d.wgsl` 사용 (center가 `vec3<f32>`)
- depth buffer와 통합 (표면 뒤에 있으면 가려짐)

**기존 코드 재사용**:
- `Point2D.ts`의 구조를 거의 그대로 복사하되, 좌표 타입만 Vec3으로 변경
- 유니폼 레이아웃: `center: vec2 -> vec3` 변경

### 2.3 Vector3D -- 3D 벡터/화살표

**API**:
```typescript
scene3d.add(vector([0, 0, 0], [1, 1, 1], {
  color: 'green',
  headSize: 0.15,
  lineWidth: 2,
  label: 'v',
}));
```

**구현 전략**:
- `Vector2D`와 유사하지만 3D 공간에서 화살표 형상 계산
- 샤프트: 3D 라인 (LinePipeline3D)
- 화살표 머리: 두 가지 접근 가능
  - (A) 3D 라인으로 바브 렌더링 (Vector2D와 동일 패턴) -- 구현 간단
  - (B) 3D 원뿔 메시 인스턴싱 -- 비주얼 우수하지만 복잡

**추천**: v0.1에서는 (A) 라인 기반 바브로 시작하고, v0.2에서 원뿔로 업그레이드.

- 3D 벡터의 법선(barb 방향) 계산: 벡터 방향과 수직인 임의 벡터를 `cross product`로 구함
- 두 개의 barb를 벡터 끝점에서 비스듬히 그림

```typescript
// 3D barb 계산
const dir = normalize(sub(to, from));
const arbitrary = Math.abs(dir[1]) < 0.9 ? [0,1,0] : [1,0,0];
const perp1 = normalize(cross(dir, arbitrary));
const perp2 = cross(dir, perp1);
// barb1 = tip - dir*headLen + perp1*headLen*0.4
// barb2 = tip - dir*headLen - perp1*headLen*0.4
// barb3 = tip - dir*headLen + perp2*headLen*0.4
// barb4 = tip - dir*headLen - perp2*headLen*0.4
```

### 2.4 Grid3D -- 3D 축 + 바닥 그리드

**설계**:
3D 씬에 기본 좌표 시스템을 제공한다.

- XZ 평면에 바닥 그리드 (페이드 아웃)
- X, Y, Z 축 (색상 구분: R, G, B)
- 축 끝의 화살표 머리
- 축 라벨 (X, Y, Z) -- Phase 3.2에서 처리

**구현 접근**:
- `grid3d.wgsl` 새 셰이더: 풀스크린 쿼드가 아닌, XZ 평면의 큰 쿼드에 프래그먼트 셰이더로 그리드 렌더링
- 축은 `LinePipeline3D`로 렌더링 (3개 라인: X/Y/Z)
- 화살표 머리는 Vector3D의 바브 재사용 가능

**대안 (더 간단)**: 기존 2D `grid.wgsl`의 접근을 3D로 변형. XZ 평면에 투영된 풀스크린 쿼드 사용, 프래그먼트에서 월드 좌표 계산.

### 2.5 다중 컬러맵

**지원 컬러맵** (api-design.md 기준):

| 이름 | 용도 | 데이터 소스 |
|------|------|-------------|
| `viridis` | 기본, 순차적 | matplotlib 정확한 LUT |
| `plasma` | 순차적, 높은 대비 | matplotlib LUT |
| `magma` | 순차적, 어두운 배경 | matplotlib LUT |
| `coolwarm` | 발산형 (양/음 구분) | Kenneth Moreland |
| `magnitude` | 벡터 필드 크기 매핑 | 커스텀 (파랑->빨강) |

**WGSL 구현**: 각 컬러맵을 8개 제어점의 선형 보간으로 구현. matplotlib의 정확한 값을 사용한다.

```wgsl
fn plasma(t: f32) -> vec3<f32> {
  let c = clamp(t, 0.0, 1.0) * 7.0;
  let i = u32(floor(c));
  let f = fract(c);
  let colors = array<vec3<f32>, 8>(
    vec3(0.050, 0.030, 0.528),
    vec3(0.327, 0.012, 0.616),
    vec3(0.553, 0.052, 0.545),
    vec3(0.735, 0.216, 0.330),
    vec3(0.868, 0.400, 0.125),
    vec3(0.954, 0.596, 0.022),
    vec3(0.976, 0.808, 0.197),
    vec3(0.940, 0.975, 0.131),
  );
  return mix(colors[i], colors[min(i + 1u, 7u)], f);
}
```

### 3.1 VectorField3D -- 3D 벡터 필드

**API**:
```typescript
scene3d.add(vectorField((x, y, z) => [-y, x, 0], {
  density: 8,
  scale: 0.5,
  colorMap: 'magnitude',
  bounds: [[-3, 3], [-3, 3], [-3, 3]],
}));
```

**구현 전략**:
- `VectorField2D`의 패턴을 3D로 확장
- `density^3` 개의 격자점에서 벡터 함수 평가 (8^3 = 512, 10^3 = 1000)
- 각 격자점에서 Vector3D 인스턴스를 렌더링 (GPU 인스턴싱)
- 성능 주의: density 10이면 1000개 화살표. 인스턴싱 필수

**인스턴싱 접근**:
- 하나의 화살표 메시(샤프트 + 바브)를 정의
- 인스턴스 버퍼에 각 화살표의 위치, 방향, 크기, 색상을 저장
- 단일 드로우콜로 모든 화살표 렌더링

이를 위해 `arrow3d.wgsl` 전용 인스턴싱 셰이더가 필요하다. Phase 2.3의 개별 Vector3D와 달리, VectorField3D는 대량 인스턴싱에 최적화된 별도 파이프라인을 사용한다.

### 3.2 3D 텍스트/라벨

**전략** (architecture.md Section 7 참조):

Canvas2D 오버레이 방식 사용. 이미 2D에서 `OverlayContainer.ts`와 `AxisLabels.ts`가 구현되어 있으므로, 3D에서도 동일한 구조를 사용한다.

- 3D 월드 좌표 -> 스크린 좌표 변환: `camera.viewProjection * vec4(worldPos, 1.0)` -> NDC -> 픽셀
- Canvas2D에 텍스트 렌더링
- 매 프레임 카메라 변환에 따라 위치 업데이트

### 3.4 반투명 정렬

현재 `Renderer3D`는 단일 패스로 모든 객체를 렌더링한다. 반투명 객체(opacity < 1인 표면, 라인)가 겹치면 순서 문제가 발생한다.

**전략** (architecture.md Section 2.3 참조):

```
Pass 1: 불투명 객체 (depthWrite ON, depthTest less)
Pass 2: 반투명 객체 (depthWrite OFF, depthTest less, alpha blend)
         -- 카메라 거리 기준 뒤->앞 정렬
```

`MathObject3D`에 `opacity` 또는 `isTransparent` 속성을 추가하여 `Renderer3D`가 정렬할 수 있게 한다.

---

## 셰이더 정리

### 새로 작성할 셰이더

| 파일 | 용도 | 핵심 차이점 (2D 대비) |
|------|------|-----------------------|
| `line3d.wgsl` | 3D 두꺼운 라인 | posA/posB가 `vec3`, clip space에서 쿼드 확장, depth 보존 |
| `point3d.wgsl` | 3D 점 (빌보드) | center가 `vec3`, clip space에서 빌보드 확장, depth 보존 |
| `grid3d.wgsl` | XZ 바닥 그리드 + 축 | XZ 평면 쿼드, 3D viewProjection 적용, 거리 페이드 |

### 수정할 셰이더

| 파일 | 변경 내용 |
|------|-----------|
| `surface.wgsl` | viridis 하드코딩 -> `// COLORMAP_PLACEHOLDER` 마커로 교체 |

### 새로 작성할 엔진 모듈

| 파일 | 용도 |
|------|------|
| `engine/LineGeometry3D.ts` | 3D 라인 정점 데이터 빌더 (posA/posB가 vec3) |
| `engine/LinePipeline3D.ts` | 3D 라인 렌더 파이프라인 (line3d.wgsl, depth 활성화) |
| `engine/colormaps.ts` | 컬러맵 WGSL 코드 저장소 + 인젝션 유틸리티 |

---

## API 설계: 2D/3D 일관성

### 오버로드 전략 (api-design.md 준수)

`parametric()`, `point()`, `vector()`는 인자 차원에 따라 2D/3D 객체를 반환한다. TypeScript 오버로드로 타입 안전성을 보장한다.

```typescript
// parametric 오버로드
function parametric(fn: (t: number) => Vec2, opts?: ParametricOptions2D): Parametric2D;
function parametric(fn: (t: number) => Vec3, opts?: ParametricOptions3D): Parametric3D;

// point 오버로드
function point(pos: Vec2, opts?: PointOptions): Point2D;
function point(pos: Vec3, opts?: Point3DOptions): Point3D;

// vector 오버로드
function vector(from: Vec2, to: Vec2, opts?: VectorOptions): Vector2D;
function vector(from: Vec3, to: Vec3, opts?: Vector3DOptions): Vector3D;
```

**구현**: 런타임에 인자 길이로 분기한다.

```typescript
export function point(pos: Vec2 | Vec3, opts?: PointOptions | Point3DOptions) {
  if (pos.length === 3) return new Point3D(pos as Vec3, opts as Point3DOptions);
  return new Point2D(pos as Vec2, opts as PointOptions);
}
```

Scene의 `add()` 메서드에서 타입 검사로 잘못된 조합을 방지한다:
- `Scene2D.add(Point3D)` -> 컴파일 에러 (MathObject2D 타입 불일치)
- `Scene3D.add(Point2D)` -> 컴파일 에러 (MathObject3D 타입 불일치)

### 옵션 인터페이스 확장

3D 전용 옵션은 2D 옵션을 확장한다:

```typescript
// 2D (기존)
interface PointOptions {
  color?: string;
  size?: number;
  label?: string;
  opacity?: number;
}

// 3D (새로)
interface Point3DOptions extends PointOptions {
  // 3D 전용 추가 옵션 (현재는 없지만 확장 가능)
  depthTest?: boolean;   // 기본 true
}

// Surface 전용 (기존, 변경 없음)
interface SurfaceOptions {
  u?: [number, number];
  v?: [number, number];
  resolution?: number;
  colorMap?: string;     // 이제 'viridis' | 'plasma' | 'magma' | 'coolwarm' 등
  wireframe?: boolean;
  opacity?: number;
  label?: string;
}
```

---

## 구현 순서 (의존성 그래프)

```
Phase 1 (기반)
  1.1 MathObject3D ──────────────┐
  1.2 Surface3D 수정 ─────────── ├── 1.3 Renderer3D 일반화 ── 1.4 Scene3DHandle 수정
  1.5 line3d.wgsl ──── 1.6 LinePipeline3D + LineGeometry3D
  1.7 point3d.wgsl
  1.8 colormaps.ts

Phase 2 (객체)
  1.6 ── 2.1 Parametric3D
  1.7 ── 2.2 Point3D
  1.6 ── 2.3 Vector3D
  1.1 ── 2.4 Grid3D
  1.8 ── 2.5 다중 컬러맵

Phase 3 (고급)
  2.3 ── 3.1 VectorField3D
  2.4 ── 3.2 3D 텍스트/라벨
         3.3 3D 인터랙션
         3.4 반투명 정렬
```

**권장 구현 순서** (최대 가치 우선):

```
Day 1:  1.1 -> 1.2 -> 1.3 -> 1.4 (기반 인프라, 빠르게 완료)
        1.8 (컬러맵 분리, surface.wgsl 수정)
Day 2:  1.5 + 1.6 (3D 라인 셰이더 + 파이프라인)
        1.7 (3D 포인트 셰이더)
Day 3:  2.4 (Grid3D -- 씬에 좌표축이 보여야 다른 기능 테스트 가능)
        2.1 (Parametric3D -- 헬릭스 등 공간 곡선)
Day 4:  2.2 (Point3D)
        2.3 (Vector3D)
        2.5 (다중 컬러맵)
Day 5:  3.1 (VectorField3D)
        3.4 (반투명 정렬)
Day 6:  3.2 (3D 텍스트/라벨)
        3.3 (3D 인터랙션)
```

---

## 파일 생성/수정 요약

### 새로 생성할 파일

```
packages/core/src/
  objects/MathObject3D.ts         # 추상 클래스
  objects/Parametric3D.ts         # 3D 공간 곡선
  objects/Point3D.ts              # 3D 점
  objects/Vector3D.ts             # 3D 벡터/화살표
  objects/VectorField3D.ts        # 3D 벡터 필드
  objects/Grid3D.ts               # 3D 축 + 바닥 그리드
  engine/LineGeometry3D.ts        # 3D 라인 정점 빌더
  engine/LinePipeline3D.ts        # 3D 라인 파이프라인
  engine/colormaps.ts             # 컬러맵 WGSL 코드
  shaders/line3d.wgsl             # 3D 라인 셰이더
  shaders/point3d.wgsl            # 3D 포인트 셰이더
  shaders/grid3d.wgsl             # 3D 그리드 셰이더
```

### 수정할 파일

```
packages/core/src/
  objects/Surface3D.ts            # MathObject3D 상속, 컬러맵 동적 선택
  engine/Renderer3D.ts            # MathObject3D[] 기반으로 일반화
  engine/Scene3D.ts               # Scene3DHandle.add/remove 타입 확장
  shaders/surface.wgsl            # viridis 하드코딩 -> 마커 교체
  index.ts                        # 새 타입/함수 export 추가
```

---

## 테스트 전략

각 Phase 완료 시 다음 테스트를 수행한다:

### Phase 1 완료 후
- `MathObject3D`를 상속한 Surface3D가 기존과 동일하게 렌더링되는지 확인
- `Renderer3D`에 Surface3D 외 다른 MathObject3D를 add/remove 할 수 있는지 확인
- line3d.wgsl 컴파일 성공 + 간단한 3D 라인 렌더링

### Phase 2 완료 후
- 헬릭스 곡선 (`parametric(t => [cos(t), sin(t), t/5])`) 렌더링
- 3D 점이 표면 앞/뒤에서 올바르게 depth 처리되는지 확인
- 3D 벡터 화살표 방향이 올바른지 확인
- Grid3D가 XZ 평면에 올바르게 표시되는지 확인
- plasma, magma, coolwarm 컬러맵이 Surface에 적용되는지 확인

### Phase 3 완료 후
- VectorField3D에서 1000개 이상의 화살표가 60fps로 렌더링되는지 확인
- 반투명 표면이 겹칠 때 올바른 순서로 렌더링되는지 확인
- 3D 라벨이 카메라 회전에 따라 올바르게 이동하는지 확인

### 예제 추가

```
packages/examples/src/
  3d-helix.ts          # 헬릭스 곡선 + 3D 점
  3d-vector-field.ts   # 3D 벡터 필드 (예: 전자기장)
  3d-multi-surface.ts  # 다중 표면 + 컬러맵 비교
  3d-complete.ts       # 모든 3D 기능 통합 데모
```

---

## 리스크 및 완화 전략

| 리스크 | 영향 | 완화 |
|--------|------|------|
| 3D 라인 depth 깨짐 (clip space 보간 부정확) | 라인이 표면을 뚫고 나옴 | perspective-correct 보간 검증, depth bias 적용 |
| VectorField3D 성능 (1000+ 화살표) | FPS 드롭 | GPU 인스턴싱 필수, density 상한(15) 설정 |
| WGSL 컬러맵 동적 인젝션 시 셰이더 캐싱 | 매번 셰이더 재컴파일 | 컬러맵별 파이프라인 캐시 (WeakMap) |
| 반투명 정렬의 시각적 아티팩트 | 투명 표면 겹침 시 깨짐 | v0.1에서는 객체 중심점 기준 정렬만 (삼각형 단위 X) |
| 번들 사이즈 증가 (목표 40KB for core+3D) | 50KB 초과 | 3D 모듈 지연 로딩 가능하도록 엔트리포인트 분리 |
