# ke-mileage

대한항공 마일리지(보너스 항공권) 좌석 달력 — `everywherelucas.com/mileage`

- `public/mileage/index.html` 페이지
- `public/mileage/data.json` 좌석 데이터 (매일 오전 8시 갱신)
- `src/index.js` `/mileage` 경로만 처리하는 Cloudflare Worker
- 기존 홈페이지(website2)와 별개로 배포됩니다.

## data.json 형식

```
{ "updated": ISO시각,
  "routes": { "LAX": { "out": { "checked": ISO시각, "days": { "2026-12-01": {...} } },
                       "back": {...} } } }
```

날짜 값
- `f`: `[편명, 출발시각, 기종, 일반석, 프레스티지석, 일등석]` 배열 목록. 좌석 수 9는 "9석 이상"
- `a`: 1/0 — 좌석 수 없이 일반석 유무만 확인한 날 (주변 날짜 달력 조회)
- `ap`: 1 — 같은 달력 조회에서 프레스티지석이 있다고 나온 날
- `b`: `[편명, 출발시각, 일반석, 프레스티지석, 일등석]` 1/0 — 보너스 좌석 조회의 등급별 유무
- `p`: 1 — 성수기

`out` = 인천 출발, `back` = 인천 도착. 개인 정보는 넣지 않습니다.

## 수집 방법 (화면 클릭 없이)

- `scripts/ke-collect.js` — 대한항공 사이트(스카이패스 로그인 상태)에서 실행하는 브라우저 스크립트.
  화면이 내부적으로 부르는 `POST /api/ap/booking/avail/awardAvailability` 를 같은 로그인 세션으로 직접 보낸다.
  응답 하나에 그날 편별 잔여석 + 앞뒤 3일(7일)의 있음/없음·성수기·운항 여부(emptyCode NIT = 운항 없음)가 온다.
  - 출발지 코드는 소문자 `sel` (대문자면 500). 개인 정보는 요청에 넣지 않는다. 로그인 없으면 `COMM.9001`(로그인 후 진행).
  - 한 회차: 26개 방향 × 오늘~+10일 매일(편별 좌석) + `farStart`부터 4개 방향 × +11~+360일 7일 간격(있음/없음). 약 490회, 30~40분.
  - 요청 사이 2~4초. 401/403·로그인 풀림·오류 3번 연속이면 즉시 멈추고 모은 것만 결과에 남김. 빠진 구간은 기존 데이터 유지.
  - `calendarFareMatrix`(31일 달력)는 직접 호출하면 403 이라 쓰지 않는다.
  - 콘솔에 붙여넣으면 바로 실행되고 `ke-result.json` 이 다운로드된다.
- `scripts/merge.js` — `node scripts/merge.js ke-result.json` 으로 `public/mileage/data.json` 에 합친다.
  결과의 `ranges` 안 날짜만 교체(구간 안인데 없는 날 = 운항 없음 → 삭제), 지난 날짜 삭제, `meta.yearRotation` 갱신.
