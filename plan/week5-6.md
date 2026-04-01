# Week 5-6: 생태계 + 런칭

> 관련 문서: [api-design.md](api-design.md) (React 래퍼, 선형대수/미적분 API) · [architecture.md](architecture.md) (패키지 구조 — react, examples, docs)

## Week 5

### Day 1-2: React 래퍼 (@gpu-math/react)

#### 태스크
- [ ] `MathCanvas` 컴포넌트 (Scene 라이프사이클 관리)
- [ ] `<Plot>`, `<Surface>`, `<VectorField>`, `<Parametric>` 선언적 컴포넌트
- [ ] `useScene`, `useAnimation`, `useInteraction` 훅
- [ ] React 18+ 호환 (StrictMode, Suspense)

#### 타겟 API
```typescript
import { MathCanvas, Plot, Surface, VectorField } from '@gpu-math/react';

function App() {
  return (
    <MathCanvas width={800} height={600} theme="3b1b">
      <Plot fn={x => Math.sin(x)} color="blue" label="sin(x)" />
      <Plot fn={x => Math.cos(x)} color="red" label="cos(x)" />
    </MathCanvas>
  );
}

// 3D
function App3D() {
  return (
    <MathCanvas width={800} height={600} dimension={3}>
      <Surface fn={(u, v) => [u, v, Math.sin(u) * Math.cos(v)]} colorMap="viridis" />
    </MathCanvas>
  );
}
```

#### 완료 기준
- `<MathCanvas>` + `<Plot>` 조합으로 2D 그래프 렌더링
- `<Surface>` 3D 표면 렌더링
- React props 변경 시 실시간 업데이트
- npm `@gpu-math/react` 빌드 성공

---

### Day 3: 인터랙티브 플레이그라운드

#### 태스크
- [ ] Monaco 에디터 + 라이브 프리뷰
- [ ] 코드 수정 → 즉시 렌더링 업데이트
- [ ] URL 공유 (코드를 URL에 인코딩)
- [ ] 프리셋 예제 10개

#### 완료 기준
- 코드 수정 시 0.5초 내 프리뷰 업데이트
- URL 공유 링크로 동일한 코드/결과 재현
- 10개 프리셋 예제 동작 확인

---

### Day 4-5: LaTeX 라벨 렌더링

#### 태스크
- [ ] KaTeX 통합 (수식 → HTML → 텍스처)
- [ ] 축 라벨에 수식: `x`, `y = f(x)`
- [ ] 함수 라벨: `y = \sin(x)`
- [ ] 호버 툴팁에 수식 표시

#### 완료 기준
- 축 라벨에 LaTeX 수식 렌더링
- 함수 라벨에 수식 표시 (`label: '$\\sin(x)$'`)
- KaTeX 지연 로딩 (사용 시에만 로드)

---

## Week 6

### Day 1-2: 선형대수 시각화

#### 태스크
- [ ] `matrix()`, `transform()` 함수 구현
- [ ] 행렬 변환 시 그리드 변형 애니메이션
- [ ] `eigenVectors()` 고유벡터 시각화
- [ ] 변환 전/후 비교 모드

#### 타겟 API
```typescript
import { matrix, eigenVectors, transform } from 'gpu-math';

// 행렬 변환 시각화
const m = matrix([[2, 1], [0, 1]]);
scene.add(transform(m, {
  showGrid: true,       // 변환 전/후 그리드
  showEigen: true,      // 고유벡터 표시
  animate: true,        // 변환 애니메이션
}));

// 고유벡터 시각화
scene.add(eigenVectors(m, { color: 'red', label: true }));
```

#### 완료 기준
- 2x2 행렬 변환이 그리드 위에 애니메이션됨
- 고유벡터가 화살표로 표시됨
- 변환 전/후 그리드 비교 가능

---

### Day 3-4: 미적분 시각화

#### 태스크
- [ ] `tangentLine()` 접선 함수 구현
- [ ] `areaUnder()` 정적분 영역 시각화
- [ ] `riemannSum()` 리만 합 시각화
- [ ] 리만 합 n값 애니메이션

#### 타겟 API
```typescript
import { tangentLine, areaUnder, riemannSum } from 'gpu-math';

const f = plot(x => x * x);
scene.add(f);

// 접선
scene.add(tangentLine(f, { at: 1, color: 'red' }));

// 넓이 (적분)
scene.add(areaUnder(f, { from: 0, to: 2, color: 'blue', opacity: 0.3 }));

// 리만 합
scene.add(riemannSum(f, { from: 0, to: 2, n: 10, method: 'left' }));
animateParam(riemannSum, 'n', { from: 5, to: 100, duration: 3000 });
```

#### 완료 기준
- 접선이 지정 점에서 정확히 그려짐
- 정적분 영역이 반투명 채우기로 표시됨
- 리만 합 n 증가 애니메이션이 수렴을 시각적으로 보여줌

---

### Day 5: GitHub 런칭

#### 태스크
- [ ] README 최종 검토 (GIF, Quick Start, API)
- [ ] 예제 사이트 최종 배포
- [ ] npm 0.2.0 릴리스 (React 래퍼 포함)
- [ ] 소셜 미디어 포스트 작성

#### 런칭 체크리스트
```
□ README 최종 검토 (GIF, Quick Start, API)
□ 예제 사이트 최종 배포
□ npm 0.2.0 릴리스 (React 래퍼 포함)
□ Hacker News 포스트 준비 ("Show HN: gpu-math — WebGPU interactive math visualization")
□ Reddit r/javascript, r/webdev, r/math 포스트
□ Twitter/X 쓰레드 (데모 GIF 포함)
□ Dev.to 블로그 포스트 ("Why I built an interactive Manim for the browser")
```

#### HN 포스트 제목 후보
```
Show HN: gpu-math – Interactive 3Blue1Brown-style math in the browser with WebGPU
Show HN: gpu-math – Plot math on the GPU with one line of TypeScript
Show HN: I built an interactive Manim that runs in the browser
```

#### 바이럴 GIF 시나리오
```
GIF 1: sin(x) → sin(2x) → sin(3x) 모핑 (2D, 3b1b 테마)
GIF 2: 3D 표면 회전 (sin(u)*cos(v), viridis 컬러맵)
GIF 3: 벡터 필드 + 행렬 변환 애니메이션
GIF 4: 리만 합 n=5 → n=100 수렴 애니메이션
```

#### 완료 기준
- npm 패키지 설치 → import → 렌더링 확인
- 예제 사이트 접속 가능
- HN/Reddit 포스트 게시 완료
