# 0001. 기술 스택 선택

## 상태

Accepted

## 날짜

2026-06-10

## 결정

`worker`의 기술 스택은 다음으로 정한다.

- Tauri 2
- React
- TypeScript
- Vite
- Rust
- pnpm

## 배경

`worker`는 서버 없이 로컬에서 동작하는 macOS GUI 앱이다. 첫 버전은 QR코드 생성 기능을 제공하고, 이후 이미지 변환, Windows 호환 한글 파일명 처리, 파일명 일괄 변경 등 로컬 작업 도구를 확장할 계획이다.

기술 선택 기준:

- macOS GUI 앱 개발 가능
- 향후 Windows 앱 확장 가능
- 서버 없이 로컬 실행 가능
- 파일 처리와 이미지 처리에 적합
- 기능별 모듈화 가능
- 앱 크기와 리소스 사용량이 과하지 않음

## 검토한 대안

### Swift/SwiftUI

장점:

- macOS 네이티브 품질이 높음
- Apple 플랫폼 UI와 잘 맞음

단점:

- Windows 확장성이 낮음
- 웹 기반 UI 생태계 재사용이 어렵다

### Electron

장점:

- React/TypeScript 개발이 쉽다
- 크로스 플랫폼 사례가 많다

단점:

- 앱 크기와 메모리 사용량이 크다
- 작은 로컬 도구 모음 앱에는 부담이 크다

### Tauri

장점:

- macOS와 Windows 확장이 가능하다
- Electron보다 가볍다
- Rust로 파일 처리와 OS 작업을 안정적으로 구현할 수 있다
- React/TypeScript UI를 사용할 수 있다

단점:

- Rust/Tauri 경계를 설계해야 한다
- 일부 OS 기능은 구현 검증이 필요하다

## 결과

Tauri 2 + React + TypeScript + Vite + Rust + pnpm을 사용한다.

UI는 React/TypeScript로 구성하고, 파일 저장과 OS 기능은 Rust/Tauri command로 처리한다.

## 후속 작업

- Tauri scaffold 생성
- 실제 package scripts 확정
- QR 생성 라이브러리 검토
- 클립보드 이미지 처리 방식 검증
