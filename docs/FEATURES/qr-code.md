# QR코드 생성 기능 명세

## 목적

URL을 QR코드로 변환해 업무 중 빠르게 공유할 수 있게 한다.

## 사용자

- 개인 사용자
- URL을 QR코드 이미지로 저장하거나 다른 앱에 붙여넣고 싶은 사용자

## 범위

현재 구현:

- URL 입력
- URL 형식 검증
- QR코드 미리보기
- PNG 저장
- SVG 저장
- 이미지 클립보드 복사

첫 버전 제외:

- 색상 커스터마이징
- 로고 삽입
- QR error correction level 설정 UI
- Wi-Fi QR
- 연락처 QR
- 대량 생성
- QR 스캔 기능

## 입력

- URL 문자열

검증 기준:

- 빈 값은 허용하지 않는다.
- `http://` 또는 `https://` URL을 지원한다.
- scheme 없는 도메인 입력은 `https://`를 붙여 정규화한다.
- scheme 없는 `localhost:<port>` 입력은 로컬 개발 URL로 보고 `https://`를 붙여 정규화한다.
- 명시적 `http://` 또는 `https://` URL은 단일 label host, `localhost`, IPv6 loopback을 허용한다.
- `http://` 입력은 `https://`로 강제 변경하지 않는다.
- scheme 없는 입력에 userinfo가 포함되면 허용하지 않는다.
- scheme 없는 host label이 비어 있거나 잘못된 경우 허용하지 않는다.
- 잘못된 URL은 QR 생성 action을 실행하지 않는다.
- QR 렌더링 실패를 막기 위해 정규화된 URL은 UTF-8 기준 2,000 bytes를 넘지 않는다.
- QR payload, PNG/SVG 기본 파일명, 이미지 클립보드 복사는 정규화된 URL 기준으로 동작한다.

오류 메시지:

- `URL을 입력하세요.`
- `유효한 URL을 입력하세요.`
- `QR코드로 만들 URL이 너무 깁니다.`

## 출력

- 화면 미리보기 QR
- PNG 파일
- SVG 파일
- 클립보드 이미지

배경 옵션:

- 기본값은 `흰색`이다.
- UI 라벨은 `배경`이고, 옵션은 `흰색`, `투명`이다.
- 사용자는 내보내기 배경을 `흰색` 또는 `투명` 중 선택할 수 있다.
- PNG 저장, SVG 저장, 이미지 클립보드 복사는 같은 배경 옵션을 사용한다.
- `투명` 선택 시 QR 검은 모듈은 유지하고 흰 배경만 제거한다.
- 투명 배경 QR은 어두운 문서 위에서 판독성이 낮을 수 있다.

## UX 흐름

1. 사용자가 URL을 입력한다.
2. 유효한 URL이면 입력을 정규화한다. scheme 없는 도메인은 `https://`를 붙인다.
3. 현재 구현은 화면에서 QR 미리보기를 표시한다.
4. 사용자는 배경을 `흰색` 또는 `투명` 중 선택한다. 기본값은 `흰색`이다.
5. 사용자는 `PNG 저장` 또는 `SVG 저장`을 선택한다.
6. 사용자는 `이미지 복사`를 선택해 QR 이미지를 클립보드에 복사한다.
7. 작업 성공 시 짧은 성공 메시지를 표시한다.
8. 실패 시 원인과 다음 행동을 표시한다.

## 저장

PNG 저장:

- 사용자가 저장 위치와 파일명을 선택한다.
- Tauri file save dialog로 저장 위치와 파일명을 선택한다.
- 기본 파일명은 정규화된 URL 전체 기반 `{URL slug}-qr.png` 형식이다.
- URL slug는 정규화된 URL을 소문자로 바꾸고 `/`, `\`, `:`, `*`, `?`, `"`, `<`, `>`, `|`, 파일명 제어문자를 `-`로 치환한다.
- URL slug의 연속 `-`는 하나로 줄이고 앞뒤 `-`는 제거한다.
- URL slug가 비면 기본 파일명은 `url-qr.png`이다.
- UI는 저장 경로 선택과 QR SVG의 PNG bytes 변환을 담당한다.
- Rust command `save_qr_code_png`는 선택 경로에 PNG bytes를 저장한다.
- 저장 성공, 저장 실패, 저장 취소 상태를 구분해 표시한다.
- 선택한 배경 옵션을 적용한다.
- `흰색`은 기존처럼 흰 배경을 채운 뒤 QR을 그린다.
- `투명`은 canvas 흰 배경 fill 없이 QR을 그린다.

SVG 저장:

- 사용자가 저장 위치와 파일명을 선택한다.
- Tauri file save dialog로 저장 위치와 파일명을 선택한다.
- 기본 파일명은 정규화된 URL 전체 기반 `{URL slug}-qr.svg` 형식이다.
- URL slug 치환 규칙은 PNG 저장과 같다.
- URL slug가 비면 기본 파일명은 `url-qr.svg`이다.
- UI는 저장 경로 선택과 QR SVG 직렬화를 담당한다.
- Rust command `save_qr_code_svg`는 선택 경로에 SVG text를 저장한다.
- Rust command는 SVG 형태와 `.svg` 확장자를 확인한다.
- 저장 성공, 저장 실패, 저장 취소 상태를 구분해 표시한다.
- QR 벡터 데이터가 손상되지 않아야 한다.
- 선택한 배경 옵션을 적용한다.
- `흰색`은 기존 흰 배경 SVG를 유지한다.
- `투명`은 흰 배경 shape를 제거하고 QR 검은 모듈은 유지한다.

## 클립보드

- `이미지 복사`는 QR 이미지를 클립보드에 저장한다.
- UI는 QR SVG를 PNG bytes로 변환한다.
- Rust command `copy_qr_code_image`는 PNG bytes를 OS 이미지 클립보드에 저장한다.
- 복사 성공 후 `복사 완료` 상태를 표시한다.
- clipboard backend를 사용할 수 없으면 `이미지 복사를 지원하지 않는 환경입니다.` 상태를 표시한다.
- 복사 실패 시 `이미지 복사 실패. 다시 시도하세요.` 오류를 표시한다.
- 선택한 배경 옵션을 적용한다.

## 접근성

- URL 입력 field는 명확한 label을 가진다.
- 저장/복사 버튼은 키보드로 접근 가능해야 한다.
- 오류 메시지는 입력 field와 연결되어야 한다.
- QR 미리보기는 고대비 배경에서 표시한다.

## 테스트 기준

- 빈 URL 입력 시 오류 표시
- 잘못된 URL 입력 시 오류 표시
- scheme 없는 도메인 입력 시 `https://` 정규화
- scheme 없는 `localhost:<port>` 입력 시 `https://` 정규화
- `http://` 입력 시 scheme 유지
- 명시적 localhost, IPv6 loopback, 단일 label host URL 허용
- scheme 없는 userinfo와 잘못된 host label 거부
- QR 용량 제한을 넘는 URL 입력 시 오류 표시
- 정상 URL 입력 시 QR 미리보기 생성
- 기본 배경 옵션은 `흰색`
- PNG 저장은 선택한 배경 옵션을 PNG renderer에 전달
- PNG 저장 기본 파일명은 정규화된 URL 전체 기반 `{URL slug}-qr.png`
- SVG 저장은 선택한 배경 옵션을 SVG serializer에 전달
- SVG 저장 기본 파일명은 정규화된 URL 전체 기반 `{URL slug}-qr.svg`
- scheme 없는 입력의 PNG/SVG 기본 파일명은 `https://`가 붙은 정규화 URL 기준
- path, query, hash가 포함된 URL의 PNG/SVG 기본 파일명은 Windows 금지 문자와 파일명 제어문자를 포함하지 않음
- URL slug가 비면 PNG는 `url-qr.png`, SVG는 `url-qr.svg`
- 이미지 복사는 선택한 배경 옵션을 PNG renderer에 전달
- 투명 PNG 렌더링은 canvas에 흰 배경 fill을 하지 않음
- 흰 배경 PNG 렌더링은 canvas에 `#ffffff` fill을 수행
- 투명 SVG 저장은 흰 배경 shape를 포함하지 않음
- 흰색 SVG 저장은 기존 흰 배경을 유지

- 이미지 복사 성공
- 이미지 복사 지원 안 됨
- 이미지 복사 실패

현재 저장 테스트 기준:

- PNG 저장 성공
- SVG 저장 성공
- 저장 취소 시 오류가 아니라 취소 상태로 처리

## 확정 사항

- QR 미리보기 생성 라이브러리는 `qrcode.react`를 사용한다.

## 미정 사항

- 없음
