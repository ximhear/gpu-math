# gpu-math 개발 계획서

## 비전

> **"웹을 위한 인터랙티브 3Blue1Brown 엔진"**

Manim(75K★)이 오프라인 비디오를 생성한다면, **gpu-math**는 브라우저에서 WebGPU를 활용하여 수학 시각화를 **실시간으로 렌더링**한다. 3Blue1Brown 스타일의 아름다운 수학 애니메이션을, 회전하고 확대하고 값을 확인할 수 있는 **인터랙티브** 경험으로 제공한다.

---

## 핵심 원칙

| 원칙 | 설명 |
|------|------|
| **WebGPU-first** | 차세대 GPU API(2025년 11월 이후 모든 주요 브라우저 지원). v0.1은 WebGPU 전용, WebGL2/Canvas2D 폴백은 v0.2+ 로드맵 |
| **심플한 API** | `plot(x => Math.sin(x))` — 한 줄로 시각화. 복잡함은 내부에 숨긴다 |
| **아름다운 기본값** | 설정 없이도 3Blue1Brown 수준의 비주얼. 다크 테마, 부드러운 곡선, 안티앨리어싱 |
| **임베더블** | 블로그, 문서, Jupyter 노트북 어디에나 삽입 가능. iframe 한 줄이면 충분 |
| **TypeScript-first** | 완전한 타입 지원. 자동완성과 타입 안전성으로 개발 경험 극대화 |

---

## 문서 가이드

| 문서 | 내용 |
|------|------|
| [architecture.md](architecture.md) | 패키지 구조, 렌더링 파이프라인, 카메라, 애니메이션, 셰이더 전략 |
| [api-design.md](api-design.md) | 공개 API 설계 — 코드 예시 중심 (Scene, 2D/3D 객체, 애니메이션, 테마) |
| [shaders.md](shaders.md) | WGSL 셰이더 상세 설계 — 공통 구조체, 각 셰이더의 Vertex/Fragment 코드 |
| [week1.md](week1.md) | WebGPU 기반 구축 (모노레포, 렌더 루프, 그리드, 카메라, Plot2D) |
| [week2.md](week2.md) | 핵심 수학 객체 (곡선 고도화, 파라메트릭, 점/벡터, 애니메이션) |
| [week3.md](week3.md) | 애니메이션 완성 + 3D (애니메이션 Part 2, 오비탈 카메라, 표면, 조명, 인터랙션) |
| [week4.md](week4.md) | 벡터 필드 + 배포 (벡터 필드, 테마, 레이블, 테스트, npm 빌드, README, 퍼블리시) |
| [week5-6.md](week5-6.md) | 생태계 + 런칭 (React 래퍼, 플레이그라운드, LaTeX, 선형대수/미적분, 런칭) |
| [testing-strategy.md](testing-strategy.md) | 테스트 전략 — 유닛/통합/비주얼 리그레션 3단계, CI/CD 파이프라인 |

---

## 기술 스택

- **언어**: TypeScript (strict mode)
- **GPU API**: WebGPU + WGSL 셰이더
- **빌드**: tsup (라이브러리 번들링) + Vite (예제/문서 사이트)
- **패키지 관리**: pnpm workspace (모노레포)
- **배포**: npm (패키지), Vercel (데모 사이트)
- **테스트**: Vitest + Playwright (비주얼 리그레션)

---

## 대상 사용자

1. **수학 교육자** — 강의 자료에 인터랙티브 시각화 삽입
2. **데이터 과학자** — 함수와 데이터를 빠르게 시각화
3. **개발자** — 프로젝트에 수학 시각화 컴포넌트 통합
4. **학생** — 수학 개념을 직관적으로 탐구

---

## 경쟁 환경 분석

| 프로젝트 | 장점 | 한계 | gpu-math의 차별화 |
|----------|------|------|-------------------|
| **Manim** (75K★) | 아름다운 영상, 거대 커뮤니티 | 오프라인 전용, Python, 비디오 렌더링 | 실시간 브라우저 렌더링, 인터랙티브 |
| **MathBox** (~12K★) | 브라우저 3D 수학 시각화 | 개발 중단, WebGL 기반, API 복잡 | 활발한 개발, WebGPU, 심플 API |
| **Mafs** (~3K★) | React 통합, 심플 API | 2D 전용, Canvas2D 기반 | 2D+3D, WebGPU 가속, 프레임워크 무관 |
| **Desmos** | 접근성 좋은 웹 계산기 | 비공개 소스, 2D 전용, 커스텀 제한 | 오픈소스, 3D, 프로그래밍 가능 |
| **three.js** | 범용 3D 엔진 | 수학 특화 아님, 러닝커브 높음 | 수학 시각화 전용, 한 줄 API |

---

## 6주 로드맵 개요

| 주차 | 마일스톤 | 핵심 산출물 |
|------|----------|-------------|
| **Week 1** | WebGPU 기반 구축 | 모노레포 셋업, 렌더 루프, 그리드, 카메라, `plot()` |
| **Week 2** | 핵심 수학 객체 | 곡선 렌더링, 매개변수 곡선, 벡터, 애니메이션 Part 1 |
| **Week 3** | 애니메이션 완성 + 3D | 애니메이션 Part 2, 3D 좌표계, 표면, 조명, 마우스 인터랙션 |
| **Week 4** | 벡터 필드 + 배포 | 벡터 필드, 테마, 레이블, 테스트, npm 빌드, README, 배포 |
| **Week 5-6** | 에코시스템 & 런칭 | React 래퍼, 플레이그라운드, LaTeX, 선형대수/미적분 시각화, 런칭 |

---

## 성공 지표

- **npm 다운로드**: 출시 1개월 내 1K/주
- **GitHub 스타**: 6개월 내 3K~10K
- **번들 크기**: core 패키지 < 50KB (gzipped)
- **첫 렌더링**: `plot()` 호출 후 16ms 이내 (60fps)

---

## 참고 자료

- [WebGPU 사양](https://www.w3.org/TR/webgpu/)
- [WGSL 사양](https://www.w3.org/TR/WGSL/)
- [3Blue1Brown/Manim](https://github.com/3b1b/manim)
- [Mafs](https://mafs.dev/)
- [MathBox](https://github.com/unconed/mathbox)
