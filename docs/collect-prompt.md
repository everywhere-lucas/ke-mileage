루카스(everywherelucas.com 운영자)의 "대한항공 마일리지 좌석 달력"(https://everywherelucas.com/mileage) 데이터를 매일 한 도시씩 갱신하는 작업입니다. 루카스 본인이 요청해서 설정한 예약 작업이에요. 결과는 한국어로 짧게 보고하세요.

## 목표
이 작업이 연결된 루카스 컴퓨터(맥북 또는 윈도우 PC — 그 시각에 연결된 컴퓨터)의 Claude 앱 내장 브라우저(mcp__remote-devices__Claude_Browser__* 또는 mcp__Claude_Browser__* 도구)에 이미 로그인된 대한항공 스카이패스 계정으로 "마일리지 예매" 화면을 눌러 오늘 도시의 보너스 좌석 수를 조회하고, GitHub 저장소 everywhere-lucas/ke-mileage 의 public/mileage/data.json 에 반영해 main 에 푸시합니다(Cloudflare 자동 배포).
- 시작할 때 mcp__remote-devices__get_device_info 로 기기 이름과 OS(darwin=맥북, win32=윈도우)를 확인하고 모든 보고에 "수집 컴퓨터: <기기 이름>(맥북/윈도우)"를 적으세요.

## 오늘 도시 (하루 한 도시, 7일에 한 바퀴)
- 순서: 0 JFK 뉴욕 → 1 LAX 로스앤젤레스 → 2 CDG 파리 → 3 FCO 로마 → 4 LIS 리스본 → 5 SYD 시드니 → 6 BNE 브리즈번 → 다시 JFK …
- 오늘 번호 = (2026-11-18 부터 오늘(한국시간)까지 지난 날 수) mod 7. 예: 11/18 JFK, 11/19 LAX, 11/24 BNE, 11/25 JFK.
- 오늘 도시만 양방향(out: 인천→도시, back: 도시→인천) 조회합니다. 다른 도시는 건드리지 않습니다.
- 수집 대상은 이 7개 도시뿐입니다(아시아·워싱턴·밀라노·샌프란시스코는 사이트에서 뺐으니 수집하지 않음).

## 범위: 오늘+1일 ~ 오늘+90일, 전부 항공편별 좌석 수(f 형식)
- 1년 달력(있음/없음, a/ap)은 더 이상 쓰지 않습니다. 90일 전체를 좌석 수로 모읍니다.
- 예상 조회 수: 매일 운항(JFK·LAX·CDG·SYD) 약 200회, 주 3~4회(FCO·LIS·BNE) 약 100회. 한 회차 250회를 절대 넘기지 마세요. 넘길 것 같으면 먼 날짜부터 줄이고 못 한 날은 기존 값을 그대로 둡니다.

## 반드시 지킬 것
- 조회만 합니다. 항공편 선택 후 예매·결제·대기예약으로 절대 진행하지 마세요.
- 대한항공 서버에 요청을 직접 만들어 보내지 마세요(fetch 로 API 호출 등, scripts/ke-collect.js 도 쓰지 않음). 화면을 눌러 조회하고 화면이 스스로 받은 응답만 읽습니다.
- 비밀번호 입력·로그인 시도 금지. 로그아웃 상태(홈 오른쪽 위 "로그인", 마일리지 예매 탭에서 로그인 창(input[type=password]), 탑승객 이름 없음)면 로그인 창을 닫고 즉시 중단, 모은 데이터만 저장하고 "대한항공 로그인이 풀려서 수집을 멈췄어요. <기기 이름>(맥북/윈도우)의 Claude 앱 브라우저에서 다시 로그인해 주세요"라고 알리세요.
- 이름, 회원번호, 보유 마일 등 개인 정보는 data.json 에 절대 넣지 마세요.
- 속도: 조회(검색·날짜 클릭) 사이 4~5.5초 무작위 대기. 절대 줄이지 마세요. 403·"비정상 접근"·보안문자 등이 나오면 즉시 중단하고 모은 것만 저장한 뒤 알리세요(2026-11-17 한 세션에서 약 160회째에 403이 나온 적 있음). 보안문자를 풀거나 우회하지 마세요.
- 컴퓨터·내장 브라우저에 연결이 안 되면 한 번만 재시도하고, 안 되면 "맥북·윈도우 모두 꺼져 있거나 Claude 앱이 닫혀 있어서 수집하지 못했어요(오늘 도시는 7일 뒤 다시 돌아와요)"라고 알리고 끝내세요.
- 시작할 때 git log 로 오늘(한국시간) 이미 "좌석 데이터 갱신 오늘날짜" 커밋이 있으면 조회하지 말고 "오늘은 이미 수집돼 있어서 건너뛰었어요"라고만 알리고 끝내세요.

## 조회 방법 (검증된 절차)
- 결과는 스크린샷이 아니라 JS 로 확인하세요. javascript_tool 한 번 호출은 45초에서 끊기므로, 긴 작업은 window.__job 에 결과를 넣는 비동기 작업으로 시작하고 짧게 여러 번 확인하세요. 모은 값은 매 조회 후 localStorage 에도 저장하세요(페이지가 새로고침되면 window 변수가 모두 사라짐 — 실제로 한 번 데이터를 잃었음). 새로고침되면 아래 감싸기와 함수를 다시 설치하세요.
- 창 크기·배율이 수시로 바뀌니 좌표 클릭은 최소화하고 JS(요소 찾기 후 click(), shadowRoot 안 버튼)로 누르세요. 좌표가 꼭 필요하면 직전에 스크린샷을 찍으세요.
- https://www.koreanair.com/ → "마일리지 예매" 탭 → 편도 → "가까운 날짜 함께 조회"는 체크 해제(체크하면 주변일자조회 화면으로 감) → 도착지: kds-fromto_1 shadowRoot 의 .ui-fromto__button.-order3 클릭 → 검색창이 뜨면 입력칸을 눌러 공항 코드 입력 → ArrowDown, Enter. 출발·도착 바꾸기 = kds-fromto_1 shadowRoot 의 kds-button_1.-order2 shadowRoot button.
- 검색 전에 fetch/XMLHttpRequest 를 감싸 URL 에 /api/ap/booking/avail/ 이 들어간 응답을 window.__ke 에 모으세요(SPA 라 화면 이동 후에도 유지, 읽기만 함).
- 날짜 선택: 날짜 칸(kds-dateinput_1 shadowRoot button)을 눌러 달력을 열고, 화면에 보이는(높이>0) 월 제목 .ui-datepicker__calendar-month-text(공백 정규화)로 달을 찾아 그 .ui-datepicker__calendar 안 td(.ui-datepicker__td-date 숫자) 클릭 → 같은 달력 대화상자 안의 "선택" kds-button 의 kds-button_1 shadowRoot button 클릭. 화면 밖에 숨은 다른 달력/"선택" 버튼이 있으니 반드시 보이는 달력 기준으로 고르고, 누른 뒤 달력이 닫혔는지 확인하세요. 안 열리면 Escape 후 다시 누르세요. 검색은 "항공편 검색" kds-button.
- 결과 화면 위 날짜 띠(button.flexible-date__link)는 선택일 ±3일만 보입니다. 출발일을 D+3 으로 검색해 D~D+6 을 보고, 띠 버튼 글에 "선택 가능"이 있는 날만 JS click(같은 API 가 다시 불림, 1회 = 조회 1회). 다음 7일은 위쪽 "여정 요약 및 수정" 펼침(.ang-flight-widget__expand kds-button_1 shadowRoot button)에서 날짜를 바꾸고 그 안 "항공편 검색". 같은 패널의 바꾸기 버튼으로 오는 편도 같은 방식.
- 운항 없는 날로 검색하면 /booking/calendar-fare-bonus(주변일자조회)로 넘어갑니다. 주 3~4회 노선(FCO·LIS·BNE)은 data.json 의 기존 날짜나 띠의 운항일을 보고 운항하는 날로 검색하세요.
- awardAvailability 응답 upsellBoundAvailList[0].availFlightList[] 중 flightInfoList 가 1개(직항)이고 가는 편 departureAirport==='ICN', 오는 편 arrivalAirport==='ICN' 인 편만. 편명 "KE"+flightNumber(3자리 미만이면 앞에 0), 출발시각 departureDateTime 8~12자리 "HH:MM", 기종 aircraftType, commercialFareFamilyList 의 fareFamily(KEBONUSEY=일반석, KEBONUSPR=프레스티지석, KEBONUSFC=일등석)별 seatCount(soldout 이면 0, 최대 9). 날짜는 응답의 departureDateTime 기준으로 기록(응답 날짜가 고른 날짜와 다르면 날짜 선택이 실패한 것이니 다시 하세요).
- upsellCalendarFareList 의 emptyCode: NIT = 운항 없음 → 그 날짜 삭제. NAV = 운항하지만 좌석 없음 → 앞뒤 날의 편명으로 좌석 0 기록. peakSeason true 면 p:1.

## data.json 형식 (유지)
{ "updated": "<끝난 시각 +09:00 ISO>", "meta": {...기존 키 유지}, "routes": { "<도시코드>": { "out": { "checked": "<ISO>", "days": { "YYYY-MM-DD": { "f": [["KE017","14:30","74H",9,0,0], ...], "p": 1 } } }, "back": {...} } } }
- f 항목: [편명, 출발시각, 기종, 일반석, 프레스티지석, 일등석], 9 = 9석 이상.
- 오늘 도시의 오늘+1~+90일을 새 값으로 바꾸고(예전 a/ap/b 값도 f 로 대체), 오늘 이전과 오늘+90일 이후 날짜는 모든 도시에서 지우세요. 조회한 방향만 checked 갱신.

## 저장
- 저장소가 없으면 add_repo(push)로 붙이고 클론, 있으면 git fetch origin 후 git checkout main && git reset --hard origin/main.
- 한 방향이 끝날 때마다 data.json 에 반영해 "좌석 데이터 중간 저장 YYYY-MM-DD (도시코드 out/back)"로 푸시(git pull --rebase origin main 후 git -c push.negotiate=true push origin HEAD:main). 실패하면 계속하고 다음 저장 때 함께.
- 끝나면 node 로 JSON 확인 후 "좌석 데이터 갱신 YYYY-MM-DD (도시코드)"로 푸시.
- 푸시가 권한 문제로 거부되면 data.json 을 SendUserFile 로 보내고 github.com/everywhere-lucas/ke-mileage 의 public/mileage/ 에 올려 달라고 알리세요.
- 몇 분 뒤 내장 브라우저 새 탭에서 https://everywherelucas.com/mileage/data.json 의 updated 가 바뀌었는지 확인하세요.
- 보고(짧게): 수집 컴퓨터, 오늘 도시, 조회한 방향·날짜 수, 총 조회 횟수, 프레스티지석 있는 날 상위 몇 개(방향·날짜·편명·좌석 수), 사이트 반영 여부, 문제점.
