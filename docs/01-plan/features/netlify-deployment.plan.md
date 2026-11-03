# Netlify 배포 준비 계획

- 요청: 기존 항공권 웹앱을 Netlify에 배포 가능하게 준비하고 지정 GitHub 원격에 커밋·푸시한다.
- 원격: https://github.com/owlsleep315/flight-fare-tracker.git
- 브랜치: 원격 기본 브랜치 `main`.
- 기존 데이터 및 조회 조건을 유지한다.
- 기존 `netlify.toml`과 GitHub Actions의 테스트·빌드 구성을 검증한다.
- README에 해당 저장소의 Netlify 연결 방법을 명시한다.
- 비밀 파일, 로컬 작업 상태, 빌드 결과를 Git에서 제외한다.
- 완료 기준: 테스트 통과, 정적 빌드 성공, 원격 `main`에 커밋 반영 확인.
- 실제 Netlify 사이트 연결·배포 성공과 GitHub 푸시 성공을 구분해 보고한다.
