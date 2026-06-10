# 0002. 문서 구조 선택

## 상태

Accepted

## 날짜

2026-06-10

## 결정

문서는 목적별로 `docs/` 아래에 분리한다.

```text
docs/
  PROJECT_SPEC.md
  ARCHITECTURE.md
  DESIGN_PRINCIPLES.md
  DEVELOPMENT.md
  GITHUB_SETTINGS.md
  DECISIONS/
  FEATURES/
  PLANS/
  RUNBOOKS/
```

## 배경

개발 시작 전 에이전트와 사용자가 같은 기준으로 작업해야 한다. 문서가 섞이면 기능 명세, 작업 계획, 운영 절차, 의사결정 근거가 뒤섞여 유지보수가 어렵다.

## 규칙

- 제품 정의는 `PROJECT_SPEC.md`에 둔다.
- 구조 설명은 `ARCHITECTURE.md`에 둔다.
- 디자인 원칙은 `DESIGN_PRINCIPLES.md`에 둔다.
- 개발 절차는 `DEVELOPMENT.md`에 둔다.
- GitHub 운영 설정은 `GITHUB_SETTINGS.md`에 둔다.
- 큰 결정은 `DECISIONS/`에 ADR로 남긴다.
- 기능별 상세 명세는 `FEATURES/`에 둔다.
- 구현 전 계획은 `PLANS/`에 둔다.
- 반복 운영 절차는 `RUNBOOKS/`에 둔다.

## 결과

문서 작업 시 목적에 맞는 위치를 먼저 선택한다. 새 루트 문서는 만들지 않는다.

## 후속 작업

- scaffold 후 `ARCHITECTURE.md`, `DEVELOPMENT.md` 갱신
- 기능 추가마다 `FEATURES/` 문서 작성 또는 갱신
