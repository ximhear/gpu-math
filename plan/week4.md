# Week 4: 벡터 필드 + 다듬기 + 배포

> 관련 문서: [api-design.md](api-design.md) (vectorField, 테마, 컬러맵 API) · [architecture.md](architecture.md) (번들 크기 전략 §8, 텍스트 렌더링 §7) · [testing-strategy.md](testing-strategy.md) (테스트 일정)

## Day 1: 벡터 필드

> Week 3에서 이동됨. 3D 기반이 완성된 후 구현하여 2D/3D 모두 대응.

### 태스크
- [ ] `vectorField()` 함수 구현
- [ ] 2D 벡터 필드 (화살표 그리드)
- [ ] 크기에 따른 화살표 길이/색상 매핑
- [ ] density 옵션 (화살표 밀도)

### 타겟 API
```typescript
// 회전장
scene.add(vectorField((x, y) => [-y, x], {
  density: 20,
  colorMap: 'magnitude',  // 크기에 따른 색상
  scale: 0.5,
}));

// 발산장
scene.add(vectorField((x, y) => [x, y], {
  density: 15,
  color: '#ef4444',
}));
```

### 렌더링 전략
```
1. 뷰포트를 density × density 그리드로 분할
2. 각 그리드 중심에서 벡터 함수 평가
3. 벡터 크기/방향 → 화살표 인스턴스
4. GPU 인스턴싱으로 일괄 렌더링 (수백 개 화살표)
```

### 완료 기준
- 2D 벡터 필드 렌더링 (회전장, 발산장 등)
- 줌/팬 시 밀도 자동 조정
- 크기에 따른 컬러맵 적용

---

## Day 2: 테마 시스템

### 태스크
- [ ] 테마 인터페이스 정의 (배경색, 그리드색, 축색, 폰트, 컬러 팔레트)
- [ ] 내장 테마: '3b1b' (다크, 기본), 'light', 'dark', 'minimal'
- [ ] `createScene(canvas, { theme: '3b1b' })` API
- [ ] 커스텀 테마 지원

### 3b1b 테마 (기본)
```typescript
export const theme3b1b: Theme = {
  background: '#1c1c1c',
  grid: { color: '#333333', majorColor: '#555555' },
  axis: { color: '#ffffff', labelColor: '#aaaaaa' },
  palette: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'],
  font: { family: 'system-ui', size: 14 },
};
```

### 완료 기준
- 4종 내장 테마 동작
- 커스텀 테마로 전체 색상 변경 가능
- 테마 전환 시 즉시 반영

---

## Day 3: 텍스트/라벨 렌더링 + 테스트

### 태스크
- [ ] Canvas2D 텍스트 → 텍스처 변환
- [ ] 축 눈금 숫자 라벨
- [ ] 함수 라벨 (범례 + 인라인)
- [ ] 좌표 툴팁 텍스트
- [ ] 유닛 테스트 보완 (공개 API 커버리지 확인)

### 전략
```
WebGPU는 텍스트 렌더링이 없음
→ 오프스크린 Canvas2D에 텍스트 렌더링
→ 텍스처로 변환 → WebGPU 쿼드에 매핑
→ 또는 HTML overlay (position: absolute)로 더 간단하게
```

### 완료 기준
- 축에 숫자 라벨 표시 (-3, -2, -1, 0, 1, 2, 3)
- 함수 라벨 표시
- 호버 툴팁에 좌표 텍스트
- 핵심 모듈 유닛 테스트 통과

---

## Day 4: npm 패키지 빌드 + README

### 태스크
- [ ] tsup 설정 최종화 (ESM + CJS + 타입 선언)
- [ ] tree-shaking 확인 (불필요한 코드 제거)
- [ ] 번들 사이즈 측정 + 최적화 (목표: < 50KB gzipped)
- [ ] package.json exports 필드 설정
- [ ] README.md 작성 (영문, GitHub 최적화)
- [ ] 데모 GIF 3개 캡처 (2D plot, 3D surface, vector field)

### package.json
```json
{
  "name": "gpu-math",
  "version": "0.1.0",
  "description": "WebGPU-powered interactive math visualization",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": { "import": "./dist/index.js", "require": "./dist/index.cjs", "types": "./dist/index.d.ts" }
  },
  "files": ["dist"],
  "keywords": ["webgpu", "math", "visualization", "3d", "plot", "graph"]
}
```

### README 구조
```markdown
# gpu-math
> WebGPU-powered interactive math visualization for the browser

[데모 GIF]

## Features
- WebGPU accelerated (60fps)
- One-line API: `plot(x => Math.sin(x))`
- 2D & 3D support
- Interactive (pan, zoom, rotate, hover)
- Beautiful defaults (3Blue1Brown theme)

## Quick Start
npm install gpu-math

## Examples
[코드 + 스크린샷]

## API Reference
[요약 테이블]
```

### 완료 기준
- `pnpm build` → dist/ 생성, < 50KB gzipped
- tree-shaking으로 미사용 코드 제거 확인
- README에 GIF + Quick Start + API 요약

---

## Day 5: npm 퍼블리시 + 예제 사이트

### 태스크
- [ ] npm publish (gpu-math@0.1.0)
- [ ] 예제 사이트 배포 (Vercel)
- [ ] GitHub Release 생성
- [ ] CHANGELOG.md 작성
- [ ] GitHub Actions CI 설정
- [ ] GitHub Topics 설정 (webgpu, math, visualization, typescript)

### 런칭 체크리스트
```
□ npm publish 성공
□ 예제 사이트 접속 가능
□ README GIF가 잘 보임
□ npm install → import → 동작 확인
□ TypeScript 자동완성 동작
□ GitHub Actions CI 통과 (유닛 테스트)
□ GitHub Topics, Description 설정
□ LICENSE 파일 존재 (MIT)
```
