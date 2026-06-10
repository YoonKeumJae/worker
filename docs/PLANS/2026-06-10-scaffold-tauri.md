# Tauri 프로젝트 스캐폴딩 계획

## 목적

`worker` 개발을 시작할 수 있도록 Tauri 2 + React + TypeScript + Vite + pnpm 기반 프로젝트 구조를 생성한다.

## 전제

- GitHub 운영 문서와 브랜치 보호 규칙이 준비되어 있다.
- 기술 스택은 `docs/DECISIONS/0001-tech-stack.md`를 따른다.
- 디자인 원칙은 `docs/DESIGN_PRINCIPLES.md`를 따른다.

## 목표 결과

- Tauri 앱 scaffold 생성
- React/TypeScript/Vite 기본 앱 실행 가능
- pnpm lockfile 생성
- 기본 package scripts 정리
- CI가 실제 `lint`, `test`, `build`를 실행하도록 갱신
- README와 DEVELOPMENT 문서 갱신

## 권장 구조

```text
src/
  app/
  components/
  tools/
    qr-code/
src-tauri/
  src/
    commands/
    tools/
```

scaffold 도구가 생성하는 기본 구조와 충돌하면 기본 구조를 먼저 유지하고, 이후 작은 PR로 정리한다.

## 작업 순서

1. 새 작업 브랜치 생성: `chore/scaffold-tauri`
2. Tauri scaffold 생성
3. pnpm 의존성 설치
4. 기본 앱 실행 확인
5. 기본 lint/test/build 명령 확인 또는 추가
6. CI 갱신
7. README 갱신
8. DEVELOPMENT 갱신
9. ARCHITECTURE 갱신
10. PR 생성

## 검증

필수:

```bash
pnpm install
pnpm build
pnpm tauri build
```

가능하면 실행:

```bash
pnpm tauri dev
```

로컬 GUI 실행이 어려우면 실패 이유와 미검증 범위를 PR에 남긴다.

## 주의 사항

- 기존 문서를 덮어쓰지 않는다.
- `main`에 직접 push하지 않는다.
- 생성된 예제 코드는 Worker 목적에 맞게 최소 수정한다.
- QR 기능 구현은 scaffold PR에 섞지 않는다.
- 디자인 polish는 scaffold PR 범위에 넣지 않는다.

## 완료 기준

- 앱 scaffold가 저장소에 존재한다.
- CI가 통과한다.
- README, DEVELOPMENT, ARCHITECTURE가 실제 구조와 일치한다.
- 후속 QR 기능 구현 PR을 만들 수 있다.
