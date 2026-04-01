# 테스트 전략

## 개요

gpu-math는 WebGPU 기반이므로 일반 Node.js 테스트 환경에서는 GPU 렌더링을 실행할 수 없다. 테스트를 **3단계**로 나누어 커버리지와 실행 속도를 균형 있게 유지한다.

```
Level 1: 유닛 테스트 (Vitest, Node.js)       — 빠름, GPU 불필요
Level 2: 통합 테스트 (Vitest + 브라우저 모드)  — 실제 WebGPU 디바이스
Level 3: 비주얼 리그레션 (Playwright)          — 스크린샷 비교
```

---

## 1. 유닛 테스트 (Level 1)

### 도구
- **Vitest** (Node.js 환경)
- GPU 없이 실행 가능한 순수 로직만 대상

### 대상 모듈

| 모듈 | 테스트 내용 |
|------|-------------|
| `math/Sampling.ts` | 적응적 샘플링 — 입력 함수에 대한 샘플 포인트 수/위치 검증 |
| `math/CoordinateSystem.ts` | 월드 ↔ 스크린 좌표 변환 정확성 |
| `math/Transform.ts` | 행렬 연산 (곱셈, 역행렬, 투영) |
| `math/Range.ts` | 범위 계산, 클램핑, 병합 |
| `camera/Camera2D.ts` | 팬/줌 상태 → 뷰 매트릭스 계산 |
| `camera/Camera3D.ts` | 구면 좌표 → 뷰/투영 매트릭스 계산 |
| `animation/Tween.ts` | 이징 함수 출력값 검증 |
| `animation/Morph.ts` | 함수 보간 로직 (t=0 → f, t=1 → g) |
| `animation/Sequence.ts` | 시퀀스 스케줄링 순서/타이밍 |
| `themes/` | 테마 객체 구조 검증, 커스텀 테마 빌더 |

### 예시
```typescript
// math/Sampling.test.ts
import { adaptiveSample } from '../src/math/Sampling';

describe('adaptiveSample', () => {
  it('직선 함수는 최소 샘플만 생성', () => {
    const points = adaptiveSample(x => 2 * x + 1, [-5, 5]);
    expect(points.length).toBeLessThan(50);
  });

  it('급변 구간에서 샘플 밀도 증가', () => {
    const points = adaptiveSample(x => Math.tan(x), [-1.5, 1.5]);
    // x=±π/2 근처에서 밀도가 높아야 함
    const nearPi2 = points.filter(p => Math.abs(Math.abs(p.x) - Math.PI/2) < 0.1);
    const nearZero = points.filter(p => Math.abs(p.x) < 0.1);
    expect(nearPi2.length).toBeGreaterThan(nearZero.length);
  });

  it('NaN/Infinity 구간을 건너뜀', () => {
    const points = adaptiveSample(x => 1/x, [-2, 2]);
    expect(points.every(p => isFinite(p.y))).toBe(true);
  });
});
```

### 실행
```bash
pnpm test              # 유닛 테스트만 (빠름, CI 기본)
pnpm test:unit         # 명시적 유닛 테스트
```

---

## 2. 통합 테스트 (Level 2)

### 도구
- **Vitest browser mode** (실제 브라우저에서 실행)
- 실제 WebGPU 디바이스를 사용하여 파이프라인/렌더링 검증

### 대상

| 테스트 | 검증 내용 |
|--------|-----------|
| WebGPU 디바이스 초기화 | `navigator.gpu` 접근, adapter/device 생성 |
| 셰이더 컴파일 | 모든 WGSL 셰이더가 에러 없이 컴파일 |
| 파이프라인 생성 | 각 셰이더의 렌더 파이프라인 생성 성공 |
| 버퍼 업로드 | 정점 데이터 → GPU 버퍼 업로드 → readback 일치 |
| 렌더 패스 실행 | 커맨드 인코딩 → submit → 프레임 완료 (에러 없음) |
| `createScene` → `destroy` | 리소스 생성/해제 라이프사이클 |

### 예시
```typescript
// engine/Pipeline.browser.test.ts
import { initGPU } from '../src/engine/device';

describe('WebGPU Pipeline', () => {
  it('grid 셰이더 컴파일 성공', async () => {
    const canvas = document.createElement('canvas');
    const gpu = await initGPU(canvas);
    const module = gpu.device.createShaderModule({ code: gridWGSL });
    const info = await module.getCompilationInfo();
    expect(info.messages.filter(m => m.type === 'error')).toHaveLength(0);
  });
});
```

### 환경 설정
```typescript
// vitest.config.browser.ts
export default defineConfig({
  test: {
    browser: {
      enabled: true,
      name: 'chromium',
      provider: 'playwright',
      headless: true,
    },
  },
});
```

### 실행
```bash
pnpm test:browser      # 브라우저 통합 테스트 (WebGPU 필요)
```

### 제약사항
- **CI 환경**: GitHub Actions에서 headless Chrome은 WebGPU를 지원하지 않을 수 있음. `--enable-unsafe-webgpu` 플래그 또는 SwiftShader(소프트웨어 렌더러) 필요.
- **대안**: CI에서 브라우저 테스트 실패 시 skip하고, 로컬 또는 GPU가 있는 CI 러너에서만 실행.

---

## 3. 비주얼 리그레션 테스트 (Level 3)

### 도구
- **Playwright** (스크린샷 캡처 + 픽셀 비교)

### 전략

```
1. 테스트 시나리오 실행 (예: plot(sin(x)) 렌더링)
2. 캔버스 스크린샷 캡처 (.png)
3. 기준 이미지(baseline)와 픽셀 단위 비교
4. 차이가 임계값(0.1%) 이상이면 실패
5. 기준 이미지는 git에 커밋 (tests/snapshots/)
```

### 대상 시나리오

| 시나리오 | 검증 내용 |
|----------|-----------|
| 기본 그리드 | 그리드 + 축 렌더링, 테마 색상 |
| sin(x) 플롯 | 곡선 형태, 안티앨리어싱, 선 두께 |
| 다중 플롯 + 범례 | 여러 곡선 색상 구분, 범례 위치 |
| 파라메트릭 곡선 | 원, 리사주 곡선 형태 |
| 점/벡터/화살표 | 인스턴싱 렌더링, 라벨 위치 |
| 3D 표면 | 표면 형태, 컬러맵, 라이팅 |
| 줌 인/아웃 | 적응적 샘플링, 그리드 간격 |
| 다크/라이트 테마 | 테마 전환 시 색상 |

### 예시
```typescript
// tests/visual/plot.spec.ts
import { test, expect } from '@playwright/test';

test('sin(x) 기본 렌더링', async ({ page }) => {
  await page.goto('/test-fixtures/sin.html');
  await page.waitForSelector('canvas');
  // WebGPU 렌더링 완료 대기 (1프레임)
  await page.waitForTimeout(100);
  await expect(page.locator('canvas')).toHaveScreenshot('sin-default.png', {
    maxDiffPixelRatio: 0.001,
  });
});

test('3b1b 테마 그리드', async ({ page }) => {
  await page.goto('/test-fixtures/grid-3b1b.html');
  await page.waitForSelector('canvas');
  await page.waitForTimeout(100);
  await expect(page.locator('canvas')).toHaveScreenshot('grid-3b1b.png', {
    maxDiffPixelRatio: 0.001,
  });
});
```

### 기준 이미지 관리
```
tests/
├── snapshots/
│   ├── sin-default.png
│   ├── grid-3b1b.png
│   ├── surface-viridis.png
│   └── ...
├── fixtures/              # 테스트용 HTML 페이지
│   ├── sin.html
│   ├── grid-3b1b.html
│   └── ...
└── visual/
    ├── plot.spec.ts
    ├── grid.spec.ts
    └── surface.spec.ts
```

### 기준 이미지 업데이트
```bash
pnpm test:visual --update-snapshots   # 기준 이미지 갱신
```

### 실행
```bash
pnpm test:visual       # 비주얼 리그레션 테스트
```

---

## CI/CD 파이프라인

### GitHub Actions 워크플로우

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: pnpm install
      - run: pnpm test:unit

  browser:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: pnpm install
      - run: npx playwright install chromium
      - run: pnpm test:browser
        env:
          # SwiftShader 소프트웨어 렌더러로 WebGPU 실행
          CHROMIUM_FLAGS: '--enable-unsafe-webgpu --use-gl=swiftshader'
        continue-on-error: true  # GPU 미지원 환경 대비

  visual:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: pnpm install
      - run: npx playwright install chromium
      - run: pnpm test:visual
        env:
          CHROMIUM_FLAGS: '--enable-unsafe-webgpu --use-gl=swiftshader'
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: visual-diff
          path: tests/snapshots/*-diff.png
```

### 스크립트 정의 (루트 package.json)
```json
{
  "scripts": {
    "test": "pnpm test:unit",
    "test:unit": "vitest run",
    "test:browser": "vitest run --config vitest.config.browser.ts",
    "test:visual": "playwright test --config tests/playwright.config.ts",
    "test:all": "pnpm test:unit && pnpm test:browser && pnpm test:visual"
  }
}
```

---

## 테스트 일정 (week4에 통합)

| 시점 | 작성할 테스트 |
|------|---------------|
| Week 1 완료 시 | Level 1: 좌표 변환, 카메라 매트릭스 유닛 테스트 |
| Week 2 완료 시 | Level 1: 샘플링, 이징, 모핑 유닛 테스트 |
| Week 3 완료 시 | Level 2: 셰이더 컴파일, 파이프라인 통합 테스트 |
| Week 4 Day 1-2 | Level 3: 핵심 시나리오 비주얼 리그레션 (8개) |
| Week 4 Day 3 | CI/CD 파이프라인 설정 |

---

## GPU 테스트 환경 주의사항

1. **CI에서 WebGPU**: GitHub Actions의 기본 Ubuntu 러너에는 GPU가 없음. SwiftShader(소프트웨어 Vulkan) + `--enable-unsafe-webgpu` 플래그로 WebGPU를 에뮬레이션할 수 있지만, 렌더링 결과가 실제 GPU와 미세하게 다를 수 있음.

2. **비주얼 리그레션 허용 오차**: GPU 벤더/드라이버에 따라 안티앨리어싱 결과가 달라질 수 있으므로, `maxDiffPixelRatio: 0.001` (0.1%) 수준의 허용 오차 필요. CI에서는 SwiftShader 기준 이미지를 별도로 관리하는 것이 안정적.

3. **테스트 격리**: 각 테스트는 독립된 `<canvas>` + `createScene`으로 실행하고, 테스트 후 `scene.destroy()` 호출하여 GPU 리소스 해제.
