# Worker 디자인 원칙

## 목적

`worker`는 업무 중 반복되는 작은 작업을 빠르게 처리하는 로컬 macOS GUI 앱이다. 디자인은 장식보다 작업 효율, 가독성, 기능 확장성을 우선한다.

첫 버전은 URL 기반 QR코드 생성 도구를 제공한다. 이후 이미지 변환, Windows 호환 한글 파일명 처리, 파일명 일괄 변경 같은 도구를 같은 구조 안에 추가한다.

## 디자인 방향

`worker`는 Apple의 Liquid Glass 디자인에서 영감을 받는다. 단, Liquid Glass를 그대로 모방하지 않는다.

적용 목표:

- macOS 앱처럼 조용하고 정돈된 인상
- 콘텐츠를 방해하지 않는 가벼운 glass-accent
- 기능 중심의 명확한 작업 흐름
- 향후 도구 추가가 쉬운 일관된 화면 구조
- QR코드, 파일명, 이미지 결과물을 정확히 확인할 수 있는 높은 가독성

## Liquid Glass 적용 원칙

Liquid Glass는 콘텐츠 레이어가 아니라 제어와 내비게이션 레이어에만 제한적으로 사용한다.

사용 가능 영역:

- 앱 좌측 도구 목록
- 상단 toolbar
- floating action group
- 상태 표시 영역
- 보조 panel의 얕은 배경

사용 금지 영역:

- QR코드 미리보기 영역
- 입력값이 긴 text field 내부
- 파일 목록 본문
- 변환 결과물 미리보기
- 경고/오류 메시지 본문
- glass 위에 또 다른 glass를 쌓는 구조

QR코드 미리보기는 항상 불투명한 흰색 또는 고대비 surface 위에 표시한다. QR 스캔 가능성이 장식보다 중요하다.

## 레이아웃 원칙

기본 구조는 다음을 따른다.

- 좌측: 도구 선택 sidebar
- 중앙: 선택한 도구의 작업 canvas
- 우측 또는 하단: 결과/출력 panel

첫 버전 QR 화면:

- 좌측 sidebar에는 `QR코드` 도구를 표시한다.
- 중앙 canvas에는 URL 입력과 QR 미리보기를 둔다.
- 결과 action은 `PNG 저장`, `SVG 저장`, `복사`로 묶는다.
- 작업 상태는 화면 하단 또는 결과 panel 안에 짧게 표시한다.

향후 기능도 같은 패턴을 따른다.

- 입력
- 옵션
- 미리보기
- 실행
- 저장/복사/내보내기
- 결과 상태

## 시각 스타일

- 전체 배경은 밝고 깨끗한 neutral surface를 기본으로 한다.
- 강한 gradient, 복잡한 배경 이미지, 장식용 blur blob은 사용하지 않는다.
- glass 효과는 얕게 사용한다. 투명도보다 경계, 그림자, contrast를 우선한다.
- radius는 macOS 느낌에 맞게 부드럽게 사용하되, 도구 app답게 과하게 둥글게 만들지 않는다.
- primary action에만 색 tint를 사용한다.
- 여러 버튼을 모두 tint 처리하지 않는다.
- destructive action은 명확한 warning 색과 confirm 흐름을 사용한다.

## 타이포그래피

- 시스템 글꼴을 사용한다.
- 숫자, 파일명, URL은 읽기 쉬운 크기와 충분한 line-height를 유지한다.
- 버튼 텍스트는 짧고 동사 중심으로 쓴다.
- 긴 설명문은 UI에 넣지 않는다. 필요한 경우 tooltip 또는 문서로 분리한다.
- QR 입력 오류는 짧고 직접적으로 표시한다.

예시:

- `유효한 URL을 입력하세요.`
- `PNG로 저장`
- `SVG로 저장`
- `이미지 복사`
- `복사 완료`

## 상호작용 원칙

- 사용자는 한 화면에서 입력, 미리보기, 저장을 끝낼 수 있어야 한다.
- 입력이 바뀌면 QR 미리보기가 빠르게 갱신된다.
- 저장/복사 완료 후 짧은 성공 상태를 보여준다.
- 실패 시 원인과 다음 행동을 알려준다.
- 모션은 상태 변화를 이해시키는 수준으로만 사용한다.
- reduce motion 설정을 고려한다.

## 접근성

- 투명도 없이도 모든 기능을 사용할 수 있어야 한다.
- reduce transparency 환경에서는 glass 효과를 불투명 surface로 대체한다.
- increase contrast 환경에서는 border와 text contrast를 강화한다.
- 키보드 포커스가 명확해야 한다.
- 모든 버튼은 이름만으로 기능을 알 수 있어야 한다.
- QR 미리보기와 저장 버튼은 키보드만으로 접근 가능해야 한다.

## 컴포넌트 원칙

공통 컴포넌트는 기능 확장을 전제로 설계한다.

- `ToolSidebar`: 도구 목록과 선택 상태
- `ToolCanvas`: 현재 도구의 입력/작업 영역
- `ResultPanel`: 결과 미리보기와 출력 action
- `ActionGroup`: 저장, 복사, 실행 같은 주요 action 묶음
- `StatusMessage`: 성공, 실패, 진행 상태 표시

각 도구는 자체 입력, 옵션, 결과를 가지되, 공통 shell과 action 패턴을 재사용한다.

## 첫 버전 QR 화면 기준

필수 화면 요소:

- URL 입력 field
- QR 미리보기
- PNG 저장 버튼
- SVG 저장 버튼
- 이미지 복사 버튼
- 입력 오류 표시
- 저장/복사 성공 상태

QR 미리보기 기준:

- 흰색 배경
- 충분한 padding
- 고정된 정사각형 영역
- 작은 창에서도 QR이 잘리지 않음
- glass/blur/gradient 효과 없음

## 하지 않을 것

- landing page처럼 보이는 첫 화면
- 과한 hero section
- 장식용 카드 남발
- glass 효과를 모든 panel에 적용
- QR 미리보기 위에 반투명 overlay
- 모호한 아이콘만 있는 주요 action
- 기능 설명을 UI에 길게 노출
- 한 가지 색상만 반복하는 단조로운 palette

## 디자인 검증 기준

기능 구현 후 다음을 확인한다.

- 작은 macOS 창에서도 주요 action이 보이는가
- QR코드가 실제로 스캔 가능한가
- URL 오류 상태가 명확한가
- PNG/SVG 저장과 이미지 복사가 구분되는가
- sidebar에 새 도구를 추가해도 구조가 무너지지 않는가
- reduce transparency, increase contrast 상황에서도 정보가 읽히는가
- 버튼/텍스트가 겹치거나 잘리지 않는가

## 참고 자료

- Apple WWDC25 `Meet Liquid Glass`
- Apple Human Interface Guidelines `Materials`
- Apple Newsroom Liquid Glass 발표
