# 문제 해결 Runbook

## 목적

개발과 운영 중 반복될 수 있는 문제 해결 절차를 기록한다.

## GitHub PR이 merge되지 않을 때

확인:

- PR이 draft 상태인지 확인
- `Validate` check가 통과했는지 확인
- unresolved conversation이 있는지 확인
- required approval이 필요한지 확인
- branch가 최신 `main`과 충돌 없는지 확인

조치:

- CI 실패면 Actions 로그를 확인한다.
- conversation이 있으면 반영하거나 답변 후 resolve한다.
- approval이 필요하면 collaborator approve를 받거나 개인 프로젝트 규칙을 조정한다.

## Codex 리뷰가 달리지 않을 때

확인:

- Codex repository 등록이 되어 있는지 확인
- Code review가 켜져 있는지 확인
- Automatic reviews가 켜져 있는지 확인
- PR이 draft가 아닌지 확인
- 수동 요청 코멘트가 정확한지 확인

수동 요청:

```md
@codex review
```

## Copilot 리뷰가 계속 달릴 때

확인:

- 개인 Copilot 설정의 Automatic code review가 꺼져 있는지 확인
- repository Ruleset에 `Automatically request Copilot code review`가 꺼져 있는지 확인
- organization Ruleset 또는 정책이 강제하지 않는지 확인

이미 달린 Copilot 리뷰는 자동으로 삭제되지 않는다. 필요한 경우 conversation을 resolve한다.

## Tauri 앱 실행이 안 될 때

아래 항목을 확인한다.

- Node.js 버전
- pnpm 버전
- Rust toolchain
- Tauri prerequisites
- macOS 권한/보안 설정
- dependency 설치 상태

명령:

```bash
pnpm install
pnpm run tauri:dev
```

Tauri/Rust 설정만 빠르게 확인하려면 다음을 실행한다.

```bash
pnpm run check:tauri
```

## CI가 실패할 때

확인:

- 실패한 job 이름
- 실패한 step
- 로컬에서 같은 명령 재현 가능 여부
- lockfile 변경 누락 여부
- package script 이름 변경 여부

문서 영향:

- 명령이 바뀌면 `README.md`, `docs/DEVELOPMENT.md`, `.github/workflows/ci.yml`을 함께 갱신한다.

## QR 저장 또는 이미지 복사가 실패할 때

확인:

- URL 입력이 유효한지 확인
- PNG 저장 경로가 `.png` 확장자인지 확인
- SVG 저장 경로가 `.svg` 확장자인지 확인
- 이미지 복사 실패 시 OS clipboard backend 사용 가능 여부 확인
- 투명 배경 선택 시 QR 검은 모듈은 유지되고 흰 배경만 제거되는지 확인

관련 Rust command:

- `save_qr_code_png`
- `save_qr_code_svg`
- `copy_qr_code_image`
