# Worker

`worker`는 업무 중 반복적으로 필요한 작은 작업들을 로컬에서 처리하는 macOS용 GUI 앱이다.

첫 버전은 URL을 입력받아 QR코드를 생성한다. 생성된 QR코드는 PNG 저장, SVG 저장, 이미지 클립보드 복사를 지원한다.

## 목표

- 서버 없이 로컬에서 동작하는 개인 업무 도구 제공
- 반복 작업을 빠르게 처리하는 GUI 앱 제공
- 기능을 쉽게 추가할 수 있는 구조 유지
- 향후 Windows 앱 확장 가능성 확보

## 첫 버전 기능

- URL 입력
- QR코드 생성
- QR코드 미리보기
- PNG 파일 저장
- SVG 파일 저장
- QR 이미지 클립보드 복사

## 향후 기능 후보

- 이미지 파일 확장자 변경
- Windows 호환 한글 파일명 처리
- 텍스트 변환 도구
- 파일명 일괄 변경
- 이미지 크기 변경
- 문서/이미지 압축

## 기술 스택

- Tauri 2
- React
- TypeScript
- Vite
- Rust
- pnpm

## 개발 원칙

- UI와 작업 로직을 분리한다.
- 기능은 독립 모듈로 추가한다.
- 서버와 계정 없이 로컬에서 처리한다.
- 개인 데이터와 파일을 외부로 전송하지 않는다.
- 파일 작업은 원본 손상 위험을 줄이는 방식으로 구현한다.
- macOS 우선 개발, Windows 확장 가능성을 고려한다.

## 개발 환경

프로젝트 scaffold 후 아래 항목을 확정한다.

- Node.js 버전
- pnpm 버전
- Rust 버전
- Tauri CLI 사용 방식
- macOS 빌드 요구사항
- Windows 빌드 요구사항

## 실행

프로젝트 scaffold 후 실행 명령을 추가한다.

```bash
pnpm install
pnpm tauri dev
```

## 빌드

프로젝트 scaffold 후 빌드 명령을 추가한다.

```bash
pnpm tauri build
```

## 문서

- [문서 인덱스](docs/README.md)
- [프로젝트 명세](docs/PROJECT_SPEC.md)
- [아키텍처](docs/ARCHITECTURE.md)
- [디자인 원칙](docs/DESIGN_PRINCIPLES.md)
- [개발 가이드](docs/DEVELOPMENT.md)
- [GitHub 설정](docs/GITHUB_SETTINGS.md)
- [에이전트 작업 규칙](AGENTS.md)
- [기술 스택 결정](docs/DECISIONS/0001-tech-stack.md)
- [문서 구조 결정](docs/DECISIONS/0002-documentation-structure.md)
- [QR코드 기능 명세](docs/FEATURES/qr-code.md)
- [Tauri 스캐폴딩 계획](docs/PLANS/2026-06-10-scaffold-tauri.md)
