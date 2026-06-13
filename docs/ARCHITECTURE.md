# Worker 아키텍처

## 목적

이 문서는 `worker`의 앱 구조, 모듈 경계, 데이터 흐름, 기능 확장 방식을 정의한다. 개발 시작 후 코드 구조가 바뀌면 이 문서도 함께 갱신한다.

## 기본 구조

`worker`는 서버 없이 로컬에서 동작하는 Tauri 기반 데스크톱 앱이다.

- UI: React + TypeScript + Vite
- 로컬 앱 shell: Tauri 2
- 로컬 작업 엔진: Rust
- 패키지 매니저: pnpm

현재 scaffold 구조:

```text
src/
  main.tsx
  app/
    App.tsx
    App.test.tsx
    styles.css
  components/
    ToolSidebar.tsx
  tools/
    qr-code/
      QrCodeTool.tsx
      qrCodeValidation.ts
      qrCodeValidation.test.ts
public/
  favicon.svg
src-tauri/
  Cargo.lock
  Cargo.toml
  tauri.conf.json
  capabilities/
    default.json
  icons/
    icon.png
    icon.icns
    icon.ico
    32x32.png
    128x128.png
    128x128@2x.png
  src/
    main.rs
    lib.rs
    commands/
      mod.rs
    tools/
      mod.rs
```

## 레이어

### UI 레이어

역할:

- 화면 렌더링
- 사용자 입력 처리
- 도구 선택 상태 관리
- 결과 미리보기 표시
- Tauri command 호출

포함 대상:

- React component
- TypeScript type
- UI state
- form validation
- client-side preview helper

포함 금지:

- 파일 시스템 직접 조작
- OS별 권한 처리
- 민감한 파일 처리 로직
- 긴 실행 작업

### Tool 레이어

역할:

- 기능별 입력/옵션/결과 모델 정의
- UI와 Rust command 사이 계약 정리
- 도구별 화면 조립

각 기능은 독립 tool module로 둔다.

예상 구조:

```text
src/
  app/
  components/
  tools/
    qr-code/
      QrCodeTool.tsx
      qrCodePng.ts
      qrCodeSvg.ts
      qrCodeValidation.ts
```

현재 QR tool module은 URL 입력, URL validation, QR 미리보기, PNG/SVG 저장, 이미지 클립보드 복사를 포함한다.
PNG 저장은 `src/tools/qr-code/qrCodePng.ts`에서 save dialog 호출, SVG-to-PNG 변환, Rust command 호출을 조율한다.
SVG 저장은 `src/tools/qr-code/qrCodeSvg.ts`에서 save dialog 호출, SVG 직렬화, Rust command 호출을 조율한다.
이미지 클립보드 복사는 `src/tools/qr-code/qrCodeClipboard.ts`에서 SVG-to-PNG 변환과 Rust command 호출을 조율한다.
SVG-to-PNG 변환은 `src/tools/qr-code/qrCodeImage.ts`에 분리해 PNG 저장과 이미지 복사가 공유한다.

### Tauri/Rust 레이어

역할:

- 파일 저장
- 클립보드 처리
- OS별 기능
- 성능이 필요한 변환 작업
- 보안상 UI에서 직접 처리하지 않을 작업

예상 구조:

```text
src-tauri/
  src/
    commands/
    tools/
      qr_code.rs
```

현재 Rust 레이어는 Tauri 앱 실행 엔트리만 가진다. `src-tauri/src/commands/`와 `src-tauri/src/tools/`는 후속 도구별 Rust 구현을 위한 자리다.
현재 Rust 레이어는 `save_qr_code_png` command로 UI가 전달한 PNG bytes를 사용자가 선택한 `.png` 경로에 저장한다.
`save_qr_code_svg` command는 UI가 전달한 SVG text를 사용자가 선택한 `.svg` 경로에 저장한다.
`copy_qr_code_image` command는 UI가 전달한 PNG bytes를 OS 이미지 클립보드에 저장한다.

## 데이터 흐름

QR코드 생성 첫 버전 흐름:

1. 사용자가 URL을 입력한다.
2. UI가 URL 형식을 검증한다.
3. QR 미리보기는 UI에서 즉시 생성한다.
4. PNG 저장 시 UI가 Tauri file save dialog로 저장 경로를 받는다.
5. UI가 현재 QR SVG를 PNG bytes로 변환한다.
6. UI가 `save_qr_code_png` command에 경로와 bytes를 전달한다.
7. Rust command가 PNG signature와 `.png` 확장자를 확인한 뒤 파일을 저장한다.
8. SVG 저장 시 UI가 Tauri file save dialog로 저장 경로를 받는다.
9. UI가 현재 QR SVG를 SVG text로 직렬화한다.
10. UI가 `save_qr_code_svg` command에 경로와 SVG text를 전달한다.
11. Rust command가 SVG 형태와 `.svg` 확장자를 확인한 뒤 파일을 저장한다.
12. 이미지 복사 시 UI가 현재 QR SVG를 PNG bytes로 변환한다.
13. UI가 `copy_qr_code_image` command에 PNG bytes를 전달한다.
14. Rust command가 PNG signature와 PNG decode 가능 여부를 확인한 뒤 OS 이미지 클립보드에 저장한다.
15. clipboard backend를 열 수 없으면 지원되지 않는 환경 상태를 반환하고, 복사 실패는 오류로 반환한다.

## 기능 추가 방식

새 도구는 다음 단위를 추가한다.

- feature spec: `docs/FEATURES/<feature>.md`
- UI tool module
- 필요 시 Rust command
- validation
- tests
- README 또는 DEVELOPMENT 문서 갱신

새 도구는 기존 도구의 내부 구현에 의존하지 않는다. 공통 UI와 공통 유틸만 공유한다.

## 상태 관리

초기 버전은 React local state를 기본으로 한다.

- 전역 상태 라이브러리는 도입하지 않는다.
- 도구 간 공유 상태가 생긴 뒤 필요성을 검토한다.
- 설정 저장이 필요해지면 별도 persistence 정책을 문서화한다.

## 보안과 개인정보

- 기본 기능은 네트워크 없이 동작한다.
- 사용자 입력, 파일명, 파일 내용은 외부로 전송하지 않는다.
- 파일 저장은 사용자 선택 경로에만 수행한다.
- 원본 파일을 수정하는 기능은 기본적으로 복사본 생성 방식을 우선한다.
- destructive action은 확인 단계를 둔다.

## 확장성 기준

좋은 기능 모듈:

- 독립적으로 이해 가능
- 입력/출력 type이 명확함
- UI와 작업 로직이 분리됨
- 테스트 가능
- 다른 기능을 깨뜨리지 않고 제거 가능

나쁜 기능 모듈:

- 공통 shell에 기능별 분기가 계속 추가됨
- 파일 작업이 React component에 들어감
- 도구 간 내부 상태를 직접 공유함
- OS별 처리가 UI에 노출됨

## 확정 사항

- QR 미리보기 생성 라이브러리는 `qrcode.react`를 사용한다.

## 미정 사항

- 없음
