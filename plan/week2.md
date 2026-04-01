# Week 2: 핵심 수학 객체

> 관련 문서: [shaders.md](shaders.md) (Line, Point, Arrow 셰이더) · [api-design.md](api-design.md) (plot, parametric, point, vector, animate API) · [architecture.md](architecture.md) (애니메이션 시스템, 적응적 샘플링)

## Day 1: 곡선 렌더링 고도화

### 태스크
- [ ] SDF 기반 안티앨리어싱 라인 셰이더 완성
- [ ] 라인 두께 uniform 지원
- [ ] 점선(dashed) 스타일 옵션
- [ ] 적응적 샘플링 (줌 레벨에 따라 해상도 조정)

### 완료 기준
- 줌 인해도 곡선이 매끄러움 (적응적 리샘플링)
- lineWidth, dashPattern, opacity 옵션 동작

---

## Day 2: 다중 플롯 + 색상 + 범례

### 태스크
- [ ] 여러 plot을 하나의 scene에 추가
- [ ] 자동 색상 배정 (테마의 colorScheme 배열)
- [ ] 범례(legend) 컴포넌트 (Canvas2D 오버레이)
- [ ] label 옵션

### 타겟 API
```typescript
scene.add(plot(x => Math.sin(x), { color: 'blue', label: 'sin(x)' }));
scene.add(plot(x => Math.cos(x), { color: 'red', label: 'cos(x)' }));
scene.add(plot(x => Math.tan(x), { label: 'tan(x)' })); // 자동 색상
```

### 완료 기준
- 3개 이상의 함수를 동시에 렌더링
- 우측 상단에 범례 표시
- 자동 색상이 시각적으로 구분 가능

---

## Day 3: 파라메트릭 곡선

### 태스크
- [ ] `parametric()` 함수 구현
- [ ] t 파라미터 범위 지정
- [ ] 2D + 3D 파라메트릭 지원 (3D는 Week 3에서 렌더링)

### 타겟 API
```typescript
// 원
scene.add(parametric(t => [Math.cos(t), Math.sin(t)], {
  t: [0, 2 * Math.PI],
  color: '#10b981',
}));

// 리사주 곡선
scene.add(parametric(t => [Math.sin(3*t), Math.sin(2*t)], {
  t: [0, 2 * Math.PI],
  label: 'Lissajous',
}));
```

### 완료 기준
- 원, 리사주 곡선, 스피로그래프 등 렌더링
- 파라메트릭과 일반 plot 혼합 가능

---

## Day 4: 점, 벡터, 화살표

### 태스크
- [ ] `point()` — 단일 점 렌더링 (원형, 인스턴싱)
- [ ] `vector()` — 화살표 벡터 렌더링
- [ ] `line()` — 두 점 사이 선분
- [ ] 색상, 크기, 라벨 옵션

### 타겟 API
```typescript
scene.add(point([1, 0], { color: 'red', size: 8, label: 'A' }));
scene.add(point([0, 1], { color: 'blue', size: 8, label: 'B' }));
scene.add(vector([0, 0], [1, 1], { color: 'green', label: 'v' }));
scene.add(line([0, 0], [2, 1], { color: 'gray', dash: true }));
```

### 완료 기준
- 점이 원형으로 렌더링 (GPU 인스턴싱)
- 화살표가 머리(arrowhead) 포함
- 라벨이 점/화살표 옆에 표시

---

## Day 5: 애니메이션 시스템 Part 1 — 모핑 + 이징

> Part 2 (파라미터 애니메이션 + 시퀀스)는 [Week 3 Day 1](week3.md)에서 이어진다.

### 태스크
- [ ] Animator 스케줄러 (렌더 루프 통합)
- [ ] `animate()` 함수 — 객체 간 모핑
- [ ] easing 함수 (easeInOut, easeIn, easeOut, linear, bounceOut, elasticOut)
- [ ] 함수 모핑 알고리즘 (동일 x에서 y값 보간)

### 타겟 API
```typescript
// 함수 모핑
await animate(scene, {
  from: plot(x => Math.sin(x)),
  to: plot(x => Math.sin(2*x)),
  duration: 1000,
  easing: 'easeInOut',
});
```

### 완료 기준
- sin(x) → sin(2x) 모핑이 부드럽게 동작
- 6종 이징 함수 동작 확인
- 모핑 중 NaN/Infinity 구간 안전 처리
