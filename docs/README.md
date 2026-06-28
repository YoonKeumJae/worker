# Worker 문서 인덱스

## 목적

이 문서는 `worker` 저장소의 문서 구조와 읽는 순서를 안내한다.

## 먼저 읽을 문서

개발 작업 전:

1. `AGENTS.md`
2. `docs/PROJECT_SPEC.md`
3. `docs/ARCHITECTURE.md`
4. 관련 기능 문서
5. 관련 작업 계획

디자인 작업 전:

1. `docs/DESIGN_PRINCIPLES.md`
2. 관련 기능 문서
3. 구현된 화면 또는 계획 문서

GitHub/PR 작업 전:

1. `AGENTS.md`
2. `docs/GITHUB_SETTINGS.md`
3. `.github/pull_request_template.md`

## 문서 역할

- `README.md`: 프로젝트 소개, 현재 구현 범위, 빠른 시작, 검증 명령, 주요 문서 링크
- `AGENTS.md`: 에이전트 작업 규칙, 커밋/브랜치/리뷰/문서 운영 규칙
- `PROJECT_SPEC.md`: 제품 목표, 사용자, 범위, 비기능 요구사항
- `ARCHITECTURE.md`: 앱 구조, 모듈 경계, 데이터 흐름, 확장 방식
- `DESIGN_PRINCIPLES.md`: UX/UI 원칙, Liquid Glass 적용 기준, 접근성 기준
- `DEVELOPMENT.md`: 로컬 개발 환경, 설치, 실행, 테스트, 빌드 방법
- `GITHUB_SETTINGS.md`: GitHub Rulesets, Codex 리뷰, Copilot 리뷰 설정
- `.github/pull_request_template.md`: PR 설명, 테스트, 화면 확인, 보안/배포 영향 체크리스트
- `DECISIONS/`: 기술 선택과 중요한 의사결정 기록
- `FEATURES/`: 기능별 상세 명세
- `PLANS/`: 구현 전 작업 계획과 체크리스트
- `RUNBOOKS/`: 릴리스, 문제 해결, 반복 운영 절차

## 새 문서 위치 선택

- 제품 범위 변경: `PROJECT_SPEC.md`
- 구조 변경: `ARCHITECTURE.md`
- 디자인 원칙 변경: `DESIGN_PRINCIPLES.md`
- 개발 명령/환경 변경: `DEVELOPMENT.md`
- GitHub 운영 변경: `GITHUB_SETTINGS.md`
- 큰 기술/운영 결정: `DECISIONS/`
- 기능 상세: `FEATURES/`
- 구현 계획: `PLANS/`
- 반복 절차: `RUNBOOKS/`

## 작성 규칙

- 한국어로 작성한다.
- 결정된 사실과 미정 사항을 분리한다.
- 명령어는 실행 가능한 형태로 적는다.
- 문서와 코드가 충돌하면 코드와 현재 설정을 확인한 뒤 문서를 갱신한다.
- 외부 서비스 절차는 설정 경로, 권한, 주의 사항을 함께 적는다.

## 기능 문서

- [QR코드](FEATURES/qr-code.md)
- [이미지 포맷 변환](FEATURES/image-format-converter.md)
