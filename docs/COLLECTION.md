# 수집 계약 v1

## 성공 관측

`data/observations/<고유ID>.json` 한 파일에 한 도시의 한 번의 조회를 기록합니다. importer가 생성한 실제 파일을 기준으로 사용하세요.

| 필드 | 의미 |
| --- | --- |
| schemaVersion | 1 |
| id | 영문/숫자/하이픈/밑줄의 고유 ID |
| date | Asia/Seoul 기준 실제 조회일 YYYY-MM-DD |
| observedAt | 시간대가 있는 실제 ISO 조회 시각 |
| timePrecision | second/minute. 기존 복원 자료만 day |
| origin / destination | ICN / NGO 또는 CTS |
| status | ok 또는 error |
| provenance | 새 조회는 skyscanner-monthly |
| coverage | 새 조회는 returned-candidates |
| evidence | 저장소 내 원본 JSON 경로 배열 |
| quotes | 도구가 반환한 후보 전체. 3~13박 필터 전 |

각 후보는 id(quote_id), departure, return, direct(boolean), airlines(array), prices.KRW, prices.JPY, baggage("unknown"), links.KRW/JPY를 포함합니다. 요금은 양의 정수이며 미조회 엔화는 null입니다. 출처에서 항공사를 모르면 추측하지 않습니다. KRW 없는 후보는 원화 최저가를 정할 수 없으므로 성공 관측에 넣지 않습니다.

같은 ID의 엔화 후보가 없으면 날짜가 같더라도 다른 항공편의 JPY를 연결하지 않습니다. 별도 조회에서 quote ID가 바뀌었다면 JPY는 null로 두고, 필요하면 같은 조회 조건으로 다시 조사하세요.

## 조회 실패 기록

예시의 날짜/ID/시각/사유를 실제 값으로 바꾼 후 새 파일로 저장합니다. 이 예시는 실제 관측 데이터에 포함하지 않습니다.

```json
{
  "schemaVersion": 1,
  "id": "2026-11-04-CTS-error-093000",
  "date": "2026-11-04",
  "observedAt": "2026-11-04T09:30:00+09:00",
  "timePrecision": "second",
  "origin": "ICN",
  "destination": "CTS",
  "status": "error",
  "provenance": "skyscanner-monthly",
  "error": "Skyscanner 월간 조회가 실패하여 요금을 확인하지 못했습니다.",
  "quotes": []
}
```

재시도 성공 시 새로운 시각의 관측을 추가합니다. UI는 날짜별 마지막 관측을 선택하므로 마지막 실패를 숨기지 않습니다. 도시별 독립 성공/실패가 가능합니다. 조회에 성공했지만 후보가 비어 있으면 `status: ok`, `quotes: []`로 저장합니다.

## 기존 예약 작업을 수정할 때 사용할 템플릿

아래의 저장소/브랜치/시각은 배포 준비가 끝난 뒤 확정합니다. 이 문서는 예약 작업을 생성하거나 실행하지 않습니다.

> 매일 [한국 시간 HH:MM]에 [OWNER/REPO]의 [BRANCH]를 최신 상태로 읽고 AGENTS.md와 config.json을 따른다. Skyscanner에서 2027년 1월 ICN–NGO와 ICN–CTS 왕복의 후보를 KRW와 JPY 각각 조사한다. 원본을 data/evidence에 보존하고 import 스크립트로 data/observations에 새 기록을 추가한다. 3~13박, 월 내 출국·귀국 조건의 원화 후보 최저가와 동일 후보의 엔화 표시가를 사용하며 수하물이나 실제 현지 체류 박수를 추정하지 않는다. 조회 실패나 미조회는 0원 또는 기존 가격 복제로 대체하지 않는다. 테스트와 빌드가 성공하면 승인된 브랜치에 데이터만 커밋·푸시한다. 전날 변화율과 날짜 변경, Skyscanner 검색 링크, 커밋 링크, 확인 가능한 경우 배포 결과를 한국어로 보고한다.

예약 실행 환경에 Skyscanner 및 GitHub 도구가 있어야 합니다. 웹 프런트엔드에 API 키를 넣거나 GitHub Actions에서 ChatGPT 앱 도구를 직접 호출하는 방식은 제공하지 않습니다. 연결 도구가 없는 예약 실행은 실패로 보고해야 하며, 이 정적 웹앱이 자동 수집까지 수행한다고 설명하면 안 됩니다.

## 공개 데이터의 범위

사이트에는 `dist/data/history.json`이 공개되며 가격과 검색 링크를 포함합니다. 원본 evidence는 정적 배포 디렉터리에 복사하지 않지만 공개 Git 저장소라면 공개됩니다. 민감한 인증 정보가 없는 도구의 structuredContent만 저장하세요.

여행 월/박수/노선 조건을 바꾸면 비교 기준이 달라집니다. 특히 복원 기록은 요약뿐이어서 재필터링에 한계가 있습니다. 새 조건은 별도 폴더/저장소 또는 버전이 분리된 새 데이터 계열로 관리하세요.
