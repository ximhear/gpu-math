# WGSL 셰이더 설계

> 관련 문서: [architecture.md](architecture.md) (셰이더 전략 §5, 렌더 레이어 순서) · [api-design.md](api-design.md) (컬러맵 API)
> 구현 일정: [week1 Day 3](week1.md) (Grid) · [week1 Day 5](week1.md) (Line) · [week3 Day 2-3](week3.md) (Surface, 라이팅)

## 셰이더 목록

| 셰이더 | 파일 | 용도 |
|--------|------|------|
| Grid | `grid.wgsl` | 무한 그리드 + 축 |
| Line | `line.wgsl` | 두꺼운 라인 (곡선, 축, 화살표) |
| Surface | `surface.wgsl` | 3D 표면 (Phong 라이팅) |
| Point | `point.wgsl` | 점 (인스턴싱) |
| Arrow | `arrow.wgsl` | 화살표 머리 (벡터, 축 끝) |

---

## 공통 구조체

```wgsl
// common.wgsl
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
```

---

## 1. Grid 셰이더 (grid.wgsl)

### 목적
무한 2D/3D 그리드. 가장자리 페이드, 주요/보조 그리드 라인 구분.

### Uniform
```wgsl
struct GridUniforms {
  spacing: f32,          // 보조 그리드 간격 (기본 1.0)
  majorEvery: f32,       // 주요 그리드 간격 (기본 5.0)
  fadeStart: f32,        // 페이드 시작 거리
  fadeEnd: f32,          // 페이드 끝 거리
  lineWidth: f32,        // 라인 두께 (world 단위)
}
```

### Vertex Shader
```wgsl
@vertex
fn vs_main(@builtin(vertex_index) idx: u32) -> VertexOutput {
  // 전체 화면 쿼드 (2 삼각형, 6 정점)
  let positions = array<vec2<f32>, 6>(
    vec2(-1.0, -1.0), vec2(1.0, -1.0), vec2(-1.0, 1.0),
    vec2(-1.0, 1.0), vec2(1.0, -1.0), vec2(1.0, 1.0),
  );
  var out: VertexOutput;
  out.position = vec4(positions[idx], 0.0, 1.0);
  // 역투영으로 월드 좌표 계산
  let ndc = positions[idx];
  let invVP = camera.viewProjection; // 역행렬은 CPU에서 전달
  out.worldPos = (invVP * vec4(ndc, 0.0, 1.0)).xy;
  return out;
}
```

### Fragment Shader
```wgsl
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  let pos = in.worldPos;

  // 보조 그리드
  let grid = abs(fract(pos / grid.spacing - 0.5) - 0.5) / fwidth(pos / grid.spacing);
  let minorLine = min(grid.x, grid.y);
  let minorAlpha = 1.0 - min(minorLine, 1.0);

  // 주요 그리드
  let majorGrid = abs(fract(pos / (grid.spacing * grid.majorEvery) - 0.5) - 0.5)
                  / fwidth(pos / (grid.spacing * grid.majorEvery));
  let majorLine = min(majorGrid.x, majorGrid.y);
  let majorAlpha = 1.0 - min(majorLine, 1.0);

  // 축 (x=0, y=0)
  let axisX = abs(pos.y) / fwidth(pos.y);
  let axisY = abs(pos.x) / fwidth(pos.x);
  let axisAlpha = 1.0 - min(min(axisX, axisY), 1.0);

  // 거리 기반 페이드
  let dist = length(pos);
  let fade = 1.0 - smoothstep(grid.fadeStart, grid.fadeEnd, dist);

  // 합성
  var color = theme.backgroundColor;
  color = mix(color, theme.gridColor, minorAlpha * 0.3 * fade);
  color = mix(color, theme.gridMajorColor, majorAlpha * 0.5 * fade);
  color = mix(color, theme.axisColor, axisAlpha * 0.8);

  return color;
}
```

---

## 2. Line 셰이더 (line.wgsl)

### 목적
두꺼운 안티앨리어싱 라인. 곡선, 선분, 화살표 몸통에 사용.

### 전략
```
정점 쌍 (p0, p1) → 방향 벡터 → 수직 벡터 → 양쪽으로 확장 → 쿼드
SDF 기반 안티앨리어싱으로 부드러운 가장자리
```

### Vertex Shader
```wgsl
struct LineVertex {
  @location(0) position: vec2<f32>,   // 현재 점
  @location(1) next: vec2<f32>,       // 다음 점
  @location(2) direction: f32,        // -1 또는 +1 (확장 방향)
}

@vertex
fn vs_main(in: LineVertex) -> LineOutput {
  let dir = normalize(in.next - in.position);
  let normal = vec2(-dir.y, dir.x);

  let offset = normal * in.direction * line.width * 0.5 / camera.resolution;
  let worldPos = in.position + offset;

  var out: LineOutput;
  out.position = camera.viewProjection * vec4(worldPos, 0.0, 1.0);
  out.dist = in.direction; // SDF용 거리
  return out;
}
```

### Fragment Shader
```wgsl
@fragment
fn fs_main(in: LineOutput) -> @location(0) vec4<f32> {
  // SDF 기반 안티앨리어싱
  let d = abs(in.dist);
  let alpha = 1.0 - smoothstep(0.8, 1.0, d);

  // 점선 패턴 (선택)
  if (line.dashLength > 0.0) {
    let dashPos = fract(in.along / line.dashLength);
    if (dashPos > line.dashRatio) { discard; }
  }

  return vec4(line.color.rgb, line.color.a * alpha);
}
```

---

## 3. Surface 셰이더 (surface.wgsl)

### 목적
3D 표면 렌더링. Phong 라이팅, 컬러맵, 와이어프레임.

### Vertex Shader
```wgsl
struct SurfaceVertex {
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) uv: vec2<f32>,
  @location(3) height: f32,       // 컬러맵용 정규화된 높이
}

@vertex
fn vs_main(in: SurfaceVertex) -> SurfaceOutput {
  var out: SurfaceOutput;
  out.position = camera.viewProjection * vec4(in.position, 1.0);
  out.worldPos = in.position;
  out.normal = in.normal;
  out.height = in.height;
  out.uv = in.uv;
  return out;
}
```

### Fragment Shader
```wgsl
@fragment
fn fs_main(in: SurfaceOutput) -> @location(0) vec4<f32> {
  let normal = normalize(in.normal);
  let lightDir = normalize(vec3(1.0, 2.0, 3.0));
  let viewDir = normalize(camera.cameraPos - in.worldPos);

  // Phong 라이팅
  let ambient = 0.2;
  let diffuse = max(dot(normal, lightDir), 0.0) * 0.6;
  let reflectDir = reflect(-lightDir, normal);
  let specular = pow(max(dot(reflectDir, viewDir), 0.0), 32.0) * 0.3;
  let lighting = ambient + diffuse + specular;

  // 컬러맵에서 색상 가져오기
  let baseColor = sampleColorMap(in.height);

  // 와이어프레임 오버레이 (선택)
  var wireAlpha = 0.0;
  if (surface.wireframe > 0.0) {
    let grid = abs(fract(in.uv * surface.resolution - 0.5) - 0.5);
    let line = min(grid.x, grid.y);
    wireAlpha = 1.0 - smoothstep(0.0, 0.02, line);
  }

  var finalColor = baseColor * lighting;
  finalColor = mix(finalColor, vec3(1.0), wireAlpha * 0.3);

  return vec4(finalColor, surface.opacity);
}
```

---

## 4. Point 셰이더 (point.wgsl)

### 목적
점 렌더링. GPU 인스턴싱으로 수백 개를 한 번에 렌더링.

### Vertex Shader (인스턴싱)
```wgsl
struct PointInstance {
  @location(0) center: vec2<f32>,   // 점 위치 (월드 좌표)
  @location(1) color: vec4<f32>,    // 점 색상
  @location(2) size: f32,           // 반지름 (px)
}

@vertex
fn vs_main(
  @builtin(vertex_index) vid: u32,
  instance: PointInstance,
) -> PointOutput {
  // 빌보드 쿼드 (항상 카메라를 향함)
  let offsets = array<vec2<f32>, 6>(
    vec2(-1.0, -1.0), vec2(1.0, -1.0), vec2(-1.0, 1.0),
    vec2(-1.0, 1.0), vec2(1.0, -1.0), vec2(1.0, 1.0),
  );
  let offset = offsets[vid] * instance.size / camera.resolution;
  let worldPos = instance.center + offset;

  var out: PointOutput;
  out.position = camera.viewProjection * vec4(worldPos, 0.0, 1.0);
  out.localPos = offsets[vid]; // SDF용
  out.color = instance.color;
  return out;
}
```

### Fragment Shader
```wgsl
@fragment
fn fs_main(in: PointOutput) -> @location(0) vec4<f32> {
  let dist = length(in.localPos);
  if (dist > 1.0) { discard; }
  let alpha = 1.0 - smoothstep(0.8, 1.0, dist);
  return vec4(in.color.rgb, in.color.a * alpha);
}
```

---

## 5. Arrow 셰이더 (arrow.wgsl)

### 목적
화살표 머리. 벡터, 축 끝에 사용.

### Fragment Shader
```wgsl
@fragment
fn fs_main(in: ArrowOutput) -> @location(0) vec4<f32> {
  // 삼각형 SDF
  let p = in.localPos;
  let d = sdTriangle(p, vec2(0.0, 1.0), vec2(-0.5, 0.0), vec2(0.5, 0.0));
  let alpha = 1.0 - smoothstep(-0.02, 0.02, d);
  return vec4(in.color.rgb, in.color.a * alpha);
}

fn sdTriangle(p: vec2<f32>, a: vec2<f32>, b: vec2<f32>, c: vec2<f32>) -> f32 {
  let e0 = b - a; let e1 = c - b; let e2 = a - c;
  let v0 = p - a; let v1 = p - b; let v2 = p - c;
  let p0 = v0 - e0 * clamp(dot(v0, e0) / dot(e0, e0), 0.0, 1.0);
  let p1 = v1 - e1 * clamp(dot(v1, e1) / dot(e1, e1), 0.0, 1.0);
  let p2 = v2 - e2 * clamp(dot(v2, e2) / dot(e2, e2), 0.0, 1.0);
  let d = min(min(dot(p0, p0), dot(p1, p1)), dot(p2, p2));
  let s = sign(e0.x * v0.y - e0.y * v0.x);
  return sqrt(d) * s;
}
```

---

## 컬러맵 구현

```wgsl
// colormap.wgsl
fn viridis(t: f32) -> vec3<f32> {
  let c0 = vec3(0.2777, 0.0054, 0.3340);
  let c1 = vec3(0.1050, 0.0631, 0.5274);
  let c2 = vec3(0.0904, 0.1689, 0.5580);
  let c3 = vec3(0.0652, 0.2599, 0.5299);
  let c4 = vec3(0.1265, 0.4184, 0.3729);
  let c5 = vec3(0.3638, 0.5577, 0.2083);
  let c6 = vec3(0.6935, 0.6832, 0.1007);
  let c7 = vec3(0.9931, 0.9062, 0.1439);

  let tt = clamp(t, 0.0, 1.0) * 7.0;
  let i = u32(floor(tt));
  let f = fract(tt);

  // 7개 구간 선형 보간
  let colors = array<vec3<f32>, 8>(c0, c1, c2, c3, c4, c5, c6, c7);
  return mix(colors[i], colors[min(i + 1, 7)], f);
}
```
