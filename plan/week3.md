# Week 3: 애니메이션 완성 + 3D + 인터랙션

> 관련 문서: [architecture.md](architecture.md) (카메라 시스템 §3, 애니메이션 §4, 렌더 레이어 순서) · [shaders.md](shaders.md) (Surface 셰이더, Phong 라이팅) · [api-design.md](api-design.md) (animate, surface, 3D API)

## Day 1: 애니메이션 시스템 Part 2 — 파라미터 + 시퀀스

> Part 1 (모핑 + 이징)은 [Week 2 Day 5](week2.md)에서 완료.

### 태스크
- [ ] `animateParam()` — 파라미터 값 애니메이션
- [ ] `sequence()` — 여러 애니메이션 순차/병렬 실행
- [ ] `wait()` — 시퀀스 내 대기
- [ ] Promise 기반 API (await 지원)

### 타겟 API
```typescript
// 파라미터 애니메이션
const p = plot((x, { a }) => Math.sin(a * x), { params: { a: 1 } });
scene.add(p);
await animateParam(p, 'a', { from: 1, to: 5, duration: 2000 });

// 시퀀스
await sequence([
  () => animate(scene, { from: f1, to: f2, duration: 500 }),
  () => wait(200),
  () => animateParam(p, 'a', { from: 1, to: 3, duration: 500 }),
]);
```

### 완료 기준
- 파라미터 애니메이션으로 주파수 변화 시각화
- 시퀀스로 여러 애니메이션 연결
- await로 애니메이션 완료 대기 가능

---

## Day 2: 3D 좌표계 + 오비탈 카메라

### 태스크
- [ ] 3D 좌표계 (X/Y/Z 축, 3D 그리드)
- [ ] 오비탈 카메라 (마우스 드래그 → 회전, 휠 → 줌)
- [ ] perspective/orthographic 투영 전환
- [ ] `createScene(canvas, { dimension: 3 })` API

### 카메라 구현
```typescript
export class OrbitalCamera {
  theta: number = Math.PI / 4;  // 수평 회전
  phi: number = Math.PI / 3;    // 수직 회전
  distance: number = 5;         // 카메라 거리

  rotate(dTheta: number, dPhi: number): void;
  zoom(factor: number): void;
  getViewMatrix(): Mat4;
  getProjectionMatrix(aspect: number): Mat4;
}
```

### 완료 기준
- 3D 좌표계가 렌더링됨
- 마우스 드래그로 회전, 휠로 줌
- 축 라벨 (X, Y, Z) 표시

---

## Day 3: 표면(Surface) 플롯

### 태스크
- [ ] `surface()` 함수 구현
- [ ] (u, v) → [x, y, z] 파라메트릭 표면
- [ ] 삼각형 메시 생성 (u/v 그리드 → 삼각형)
- [ ] 법선 벡터 자동 계산

### 타겟 API
```typescript
const scene3d = createScene(canvas, { dimension: 3 });

scene3d.add(surface((u, v) => [u, v, Math.sin(u) * Math.cos(v)], {
  u: [-3, 3],
  v: [-3, 3],
  resolution: 64,
  colorMap: 'viridis',
}));
```

### 메시 생성 전략
```
1. u, v를 각각 resolution 개로 등분
2. (u_i, v_j) → [x, y, z] 계산
3. 인접 4개 점으로 2개 삼각형 생성
4. 법선 = cross(p1-p0, p2-p0) 자동 계산
5. 높이값 → 컬러맵 매핑
```

### 완료 기준
- 3D 표면이 렌더링됨
- 높이에 따른 컬러맵 적용
- 마우스로 회전하며 관찰 가능

---

## Day 4: 조명 + 깊이

### 태스크
- [ ] Phong 라이팅 셰이더 (ambient + diffuse + specular)
- [ ] depth buffer 설정 (표면 앞뒤 올바르게)
- [ ] 와이어프레임 오버레이 옵션
- [ ] 투명도 지원 (alpha blending)

### 라이팅 WGSL
```wgsl
fn phong(normal: vec3<f32>, lightDir: vec3<f32>, viewDir: vec3<f32>) -> f32 {
  let ambient = 0.2;
  let diffuse = max(dot(normal, lightDir), 0.0) * 0.6;
  let reflect = reflect(-lightDir, normal);
  let specular = pow(max(dot(reflect, viewDir), 0.0), 32.0) * 0.3;
  return ambient + diffuse + specular;
}
```

### 완료 기준
- 표면에 조명 효과 적용 (입체감)
- 뒤에 있는 면이 앞 면에 가려짐 (depth 정상)
- wireframe: true 옵션 동작

---

## Day 5: 마우스 인터랙션

### 태스크
- [ ] 2D: 마우스 호버 시 좌표값 툴팁
- [ ] 2D: 함수 위 호버 시 접선/값 표시
- [ ] 3D: 표면 위 호버 시 점 좌표 표시 (가장 가까운 정점 기반 근사)
- [ ] 클릭으로 점 고정(pin)

### 구현 전략
```
2D 좌표 추적:
  screenToWorld(mouseX, mouseY) → [worldX, worldY]
  → 함수에 worldX 대입 → worldY 계산
  → 일치하면 툴팁 표시

3D 근사 (v0.1):
  screen → ray (unproject)
  → 메시 정점 중 가장 가까운 점 탐색 (CPU)
  → 정확한 ray-surface 교차는 v0.2에서 구현
```

### 완료 기준
- 2D 그래프 위에 마우스 올리면 (x, y) 값 표시
- 값 표시가 실시간으로 부드럽게 따라다님
- 3D 표면에서도 좌표 확인 가능 (근사)
