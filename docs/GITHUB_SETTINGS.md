# GitHub 설정

## Codex PR 리뷰

Codex PR 리뷰는 ChatGPT Codex settings에서 repository를 등록해 사용한다.

## 설정 절차

1. Codex cloud에서 이 GitHub repository를 연결한다.
2. ChatGPT Codex settings에서 code review 설정으로 이동한다.
3. `worker` repository에 대해 Code review를 켠다.
4. PR 생성 시 자동 리뷰를 원하면 Automatic reviews를 켠다.
5. 리뷰 기준은 루트 `AGENTS.md`의 `Review guidelines` 섹션을 따른다.

## 수동 리뷰 요청

자동 리뷰를 켜지 않은 경우 PR 코멘트에 다음처럼 요청한다.

```md
@codex review
```

특정 관점 리뷰가 필요하면 요청에 포함한다.

```md
@codex review for security regressions
```

## Codex GitHub Action 미사용

이 저장소는 API key 기반 Codex GitHub Action을 사용하지 않는다.

- `OPENAI_API_KEY` repository secret을 요구하지 않는다.
- `.github/workflows/codex-pr-review.yml`을 두지 않는다.
- PR 리뷰는 Codex repository 등록 방식으로 처리한다.

## GitHub Copilot 리뷰 비활성화

GitHub Copilot 자동 리뷰는 GitHub Actions workflow에서 직접 끄기 어렵다. GitHub repository settings 또는 organization settings에서 꺼야 한다.

권장 설정:

- repository Rulesets에서 `Automatically request Copilot code review`를 켜지 않는다.
- 이미 켜져 있으면 해당 branch ruleset에서 옵션을 제거한다.
- repository `Settings > Copilot > Code review`에서 자동 리뷰 설정을 비활성화한다.
- organization이 Copilot 자동 리뷰를 강제하면 organization settings에서 해당 repository를 제외한다.

이 저장소는 Copilot 리뷰 대신 Codex repository 등록 기반 PR 리뷰를 사용한다.
