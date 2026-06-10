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

- Node.js 22
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

## 프로젝트 생성 전 상태

현재 저장소는 문서와 GitHub 운영 설정이 준비된 상태다. 실제 Tauri scaffold는 아직 생성하지 않았다.

scaffold 후 이 문서에 다음을 갱신한다.

- 정확한 Node.js 버전
- 정확한 pnpm 버전
- 정확한 Rust toolchain
- 실제 설치 명령
- 실제 실행 명령
- 실제 테스트 명령
- 실제 빌드 명령

## 예상 명령

scaffold 후 기본 명령은 다음 형태를 목표로 한다.

```bash
pnpm install
pnpm tauri dev
pnpm test
pnpm build
pnpm tauri build
```

명령 이름이 달라지면 `README.md`, `docs/DEVELOPMENT.md`, CI를 함께 갱신한다.

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
- PNG 저장
- SVG 저장
- 이미지 클립보드 복사
- 잘못된 URL 오류 표시

## 문서 갱신 기준

- 새 명령 추가: `README.md`, `docs/DEVELOPMENT.md`
- 구조 변경: `docs/ARCHITECTURE.md`
- UI/디자인 변경: `docs/DESIGN_PRINCIPLES.md`
- 기능 범위 변경: `docs/PROJECT_SPEC.md`, `docs/FEATURES/`
- GitHub 설정 변경: `docs/GITHUB_SETTINGS.md`, 필요 시 `AGENTS.md`

## 미정 사항

- scaffold 후 실제 package scripts 확정
- Tauri build prerequisites 상세화
- Windows 개발/빌드 절차
