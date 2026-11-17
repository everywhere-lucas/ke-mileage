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
