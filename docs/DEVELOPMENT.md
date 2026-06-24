# Worker 개발 가이드

## 목적

이 문서는 `worker`를 로컬에서 개발, 테스트, 빌드하는 방법을 기록한다.

## 기술 스택

- Tauri 2
- React
- TypeScript
- Vite
- Rust
- pnpm

## 개발 환경

필요 도구:

- Node.js 22.12.0 이상 또는 20.19.0 이상
- pnpm 10
- Rust stable
- Tauri 개발 prerequisites
- macOS 개발 환경

설치 확인:

```bash
node --version
pnpm --version
rustc --version
cargo --version
```

현재 확인된 로컬 상태:

- Node.js: `v24.14.0`
- pnpm: `10.24.0`
- Rust: `rustc 1.96.0`
- Cargo: `cargo 1.96.0`

CI 기준:

- Node.js 22.12.0
- pnpm 10
- `pnpm install --frozen-lockfile`
- `pnpm run lint`
- `pnpm run test`
- `pnpm run build`
- `pnpm run check:tauri`

## 설치

```bash
pnpm install
```

## 실행

Vite 개발 서버:

```bash
pnpm run dev
```

Tauri 개발 앱:

```bash
pnpm run tauri:dev
```

## 테스트와 검증

```bash
pnpm run lint
pnpm run test
pnpm run build
pnpm run check:tauri
```

Tauri 앱 패키징:

```bash
pnpm run tauri:build
```

`tauri:dev`와 `tauri:build`는 Rust stable과 Tauri OS별 prerequisites가 필요하다.

macOS 빌드 산출물:

```text
src-tauri/target/release/bundle/macos/Worker.app
src-tauri/target/release/bundle/dmg/Worker_0.1.0_aarch64.dmg
```

## 개발 절차

1. `main`에서 직접 작업하지 않는다.
2. 작업 브랜치를 만든다.
3. 관련 문서를 먼저 확인한다.
4. 필요한 경우 `docs/PLANS/`에 작업 계획을 작성한다.
5. 구현한다.
6. 테스트와 빌드를 실행한다.
7. 문서가 영향을 받으면 함께 갱신한다.
8. PR을 만든다.
9. CI와 리뷰를 통과한 뒤 병합한다.

## 테스트 기준

기능 변경 시 최소 확인:

- TypeScript type check
- UI 단위 테스트
- Rust 단위 테스트
- 앱 빌드
- 주요 화면 수동 확인

QR 기능 첫 버전 확인:

- URL 입력 검증
- QR 미리보기 생성
- 잘못된 URL 오류 표시
- PNG 저장
- SVG 저장
- 이미지 클립보드 복사
- 배경 옵션 기본값 `흰색`
- 배경 옵션 `투명` 선택 후 PNG/SVG/클립보드 복사 동작

## 문서 갱신 기준

- 새 명령 추가: `README.md`, `docs/DEVELOPMENT.md`
- 구조 변경: `docs/ARCHITECTURE.md`
- UI/디자인 변경: `docs/DESIGN_PRINCIPLES.md`
- 기능 범위 변경: `docs/PROJECT_SPEC.md`, `docs/FEATURES/`
- GitHub 설정 변경: `docs/GITHUB_SETTINGS.md`, 필요 시 `AGENTS.md`

## 미정 사항

- Tauri build prerequisites 상세화
- Windows 개발/빌드 절차
