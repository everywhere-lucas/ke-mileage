// 대한항공 보너스 좌석 수집 (브라우저용) — 화면 클릭 없이 조회 요청을 직접 보낸다.
//
// www.koreanair.com 에 스카이패스로 로그인된 탭에서 실행한다.
//   - 콘솔: 이 파일 내용을 붙여넣고 Enter → 끝나면 ke-result.json 다운로드
//   - 자동 작업: 이 파일을 실행한 뒤 window.keCollect({...}) 를 호출하고
//     window.__keProgress / window.__keResult 를 읽는다.
// 결과는 node scripts/merge.js ke-result.json 으로 public/mileage/data.json 에 합친다.
//
// 원리
// - "가는 편 항공편 선택" 화면이 쓰는 POST /api/ap/booking/avail/awardAvailability 를
//   같은 로그인 세션으로 보낸다. 응답 하나에
//     · 그날 편별 잔여석(일반석/프레스티지/일등석, 9 = 9석 이상)
//     · 앞뒤 3일(7일)의 좌석 있음/없음·성수기·운항 여부
//   가 들어 있다.
// - 로그인 없이 보내면 "로그인 후 진행해 주세요"만 돌아온다.
// - 개인 정보(회원번호·이름)는 요청에 넣지 않는다. 출발지 코드는 소문자 sel 이어야 한다.
// - 요청 사이 2~4초 대기. 401/403 이나 오류 3번 연속이면 즉시 멈추고 모은 것만 남긴다.
// - calendarFareMatrix(31일 달력)는 직접 호출하면 403 이라 쓰지 않는다.

(function () {
  const ROUTES = ['JFK', 'LAX', 'SFO', 'CDG', 'FCO', 'LIS', 'SYD', 'BNE'];
  // 방향 순서(인덱스 0~25): JFK out, JFK back, LAX out, ...
  const DIRS = [];
  ROUTES.forEach(c => { DIRS.push([c, 'out']); DIRS.push([c, 'back']); });

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());   // 20261210
  const iso = s => s.slice(0, 4) + '-' + s.slice(4, 6) + '-' + s.slice(6, 8);    // 2026-12-10
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const kstNow = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 19) + '+09:00';

  async function keCollect(opts = {}) {
    const CFG = Object.assign({
      detailDays: 10,        // 오늘 ~ 오늘+10일: 26개 방향 모두 매일 편별 좌석 수
      farDirsPerRun: 4,      // 먼 날짜는 하루 4개 방향씩 돌아가며
      farStart: 0,           // 이번에 시작할 방향 인덱스 (data.json meta.yearRotation)
      farUntil: 360,         // 먼 날짜 끝 (보너스 좌석은 약 360일 전부터 열림)
      maxCalls: 600,
      delayMin: 2000,
      delayMax: 4000,
      download: false,
      only: null,            // 시험용: ['LAX'] 처럼 일부 노선만
    }, opts);

    if (location.host !== 'www.koreanair.com') throw new Error('www.koreanair.com 에서 실행하세요');
    if (!sessionStorage.getItem('ksessionId')) throw new Error('LOGIN: 로그인 세션이 없어요');

    const result = { meta: { startedAt: kstNow(), calls: 0 }, routes: {} };
    window.__keResult = result;
    const progress = s => { window.__keProgress = s; console.log(s); };
    let fails = 0;

    async function award(code, dir, date) {
      if (result.meta.calls >= CFG.maxCalls) throw new Error('LIMIT: 요청 한도 ' + CFG.maxCalls + '회');
      result.meta.calls++;
      const segment = dir === 'out'
        ? { departureDate: date, departureAirport: 'sel', arrivalAirport: code }
        : { departureDate: date, departureAirport: code, arrivalAirport: 'sel' };
      const res = await fetch('/api/ap/booking/avail/awardAvailability', {
        method: 'POST',
        credentials: 'include',
        headers: {
          ksessionId: sessionStorage.getItem('ksessionId'),
          Accept: 'application/json',
          'Content-Type': 'application/json',
          timestamp: String(Date.now()),
          channel: 'pc',
        },
        body: JSON.stringify({
          commercialFareFamilies: ['KEBONUSNEW'], currency: '', sta: false,
          segmentList: [segment],
          travelers: [{ travellerType: 'ADT', fqtvNumber: '', lastName: '', firstName: '', discountCode: '' }],
          corporateCode: 'string',
        }),
      });
      if (res.status === 401 || res.status === 403) throw new Error('BLOCKED: 응답 ' + res.status);
      if (!res.ok) {
        if (++fails >= 3) throw new Error('ERROR: 오류 3번 연속 (' + res.status + ')');
        return null;
      }
      const j = await res.json();
      if (j && j.code === 'COMM.9001') throw new Error('LOGIN: 로그인이 풀렸어요');
      fails = 0;
      const b = j && j.upsellBoundAvailList && j.upsellBoundAvailList[0];
      if (!b) return { flights: [], cal: {} };

      // 그날 편별 좌석 수 (인천 직항만)
      const flights = [];
      (b.availFlightList || []).forEach(f => {
        const fl = f.flightInfoList || [];
        if (fl.length !== 1 || Number(f.numberOfStops) > 0) return;
        const fi = fl[0];
        if (dir === 'out' && fi.departureAirport !== 'ICN') return;
        if (dir === 'back' && fi.arrivalAirport !== 'ICN') return;
        const s = { KEBONUSEY: 0, KEBONUSPR: 0, KEBONUSFC: 0 };
        (f.commercialFareFamilyList || []).forEach(c => { s[c.fareFamily] = c.soldout ? 0 : Math.min(9, Number(c.seatCount) || 0); });
        const t = fi.departureDateTime;  // 20261210100000
        flights.push([fi.carrierCode + String(fi.flightNumber).padStart(3, '0'), t.slice(8, 10) + ':' + t.slice(10, 12), fi.aircraftType, s.KEBONUSEY, s.KEBONUSPR, s.KEBONUSFC]);
      });

      // 앞뒤 7일. NIT = 운항 없음(기록 안 함)
      const cal = {};
      (b.upsellCalendarFareList || []).forEach(c => {
        if (c.emptyCode === 'NIT') { cal[iso(c.date)] = null; return; }
        const fam = (c.emptyFare || c.soldOut) ? [] : (c.fareFamilyInfoList || []).filter(x => !x.soldOut).map(x => x.fareFamilyType);
        const v = { a: fam.includes('KEBONUSEY') ? 1 : 0 };
        if (fam.includes('KEBONUSPR')) v.ap = 1;
        if (c.peakSeason) v.p = 1;
        cal[iso(c.date)] = v;
      });
      return { flights, cal };
    }

    function slot(code, dir) {
      result.routes[code] = result.routes[code] || {};
      return result.routes[code][dir] = result.routes[code][dir] || { days: {}, ranges: [] };
    }
    // 한 번 조회한 결과를 반영. 조회한 날은 편별 좌석(f), 앞뒤 날은 있음/없음
    function apply(s, date, r, lo, hi) {
      const k = iso(date);
      for (const ck in r.cal) {
        if (ck < lo || ck > hi || ck === k) continue;
        if (s.days[ck] && s.days[ck].f) continue;
        if (r.cal[ck] === null) delete s.days[ck]; else s.days[ck] = r.cal[ck];
      }
      if (r.cal[k] === null) { delete s.days[k]; return; }
      if (r.flights.length) {
        const v = { f: r.flights };
        if (r.cal[k] && r.cal[k].p) v.p = 1;
        s.days[k] = v;
      } else if (r.cal[k]) {
        s.days[k] = r.cal[k];
      }
    }

    const pause = () => sleep(CFG.delayMin + Math.random() * (CFG.delayMax - CFG.delayMin));
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const D = n => ymd(addDays(today, n));
    const farDirs = Array.from({ length: Math.min(CFG.farDirsPerRun, DIRS.length) }, (_, i) => (CFG.farStart + i) % DIRS.length);
    result.meta.farDirs = farDirs.map(i => DIRS[i].join(' '));
    result.meta.nextYearRotation = CFG.farStart;   // 끝까지 못 하면 여기서 다시 시작

    try {
      // 1) 가까운 날짜: 모든 방향, 매일
      for (const [code, dir] of DIRS) {
        if (CFG.only && !CFG.only.includes(code)) continue;
        const s = slot(code, dir);
        const lo = iso(D(0)), hi = iso(D(CFG.detailDays));
        let ok = true;
        for (let i = 0; i <= CFG.detailDays; i++) {
          if (i > 0 && s.days[iso(D(i))] === undefined && s._nit && s._nit[iso(D(i))]) continue;
          const r = await award(code, dir, D(i));
          if (r) {
            for (const ck in r.cal) if (r.cal[ck] === null) (s._nit = s._nit || {})[ck] = 1;
            apply(s, D(i), r, lo, hi);
          } else ok = false;
          await pause();
        }
        if (ok) s.ranges.push([lo, hi]);   // 빠진 날이 있으면 이 구간은 기존 데이터 유지
        delete s._nit;
        progress(code + ' ' + dir + ' 가까운 날짜 끝 (요청 ' + result.meta.calls + ')');
      }
      // 2) 먼 날짜: 이번 차례 방향만, 7일 간격 (한 번에 앞뒤 3일씩 보임)
      for (let n = 0; n < farDirs.length; n++) {
        const [code, dir] = DIRS[farDirs[n]];
        const s = slot(code, dir);
        const first = CFG.detailDays + 4;
        let last = first, ok = true;
        for (let i = first; i <= CFG.farUntil; i += 7) {
          const r = await award(code, dir, D(i));
          if (r) apply(s, D(i), r, iso(D(CFG.detailDays + 1)), iso(D(CFG.farUntil + 3))); else ok = false;
          last = i;
          await pause();
        }
        if (ok) s.ranges.push([iso(D(CFG.detailDays + 1)), iso(D(last + 3))]);
        result.meta.nextYearRotation = (farDirs[n] + 1) % DIRS.length;
        progress(code + ' ' + dir + ' 먼 날짜 끝 (요청 ' + result.meta.calls + ')');
      }
    } catch (e) {
      result.meta.stopped = e.message;
      progress('멈춤: ' + e.message);
    }

    result.meta.finishedAt = kstNow();
    progress('완료 — 요청 ' + result.meta.calls + '회' + (result.meta.stopped ? ' (중간에 멈춤)' : ''));
    if (CFG.download) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(result)], { type: 'application/json' }));
      a.download = 'ke-result.json';
      document.body.appendChild(a); a.click(); a.remove();
    }
    return result;
  }

  window.keCollect = keCollect;
  window.__keDirs = DIRS;
  // 콘솔에 붙여넣었을 때는 바로 실행 (자동 작업은 window.__keNoAutoRun = true 로 막음)
  if (!window.__keNoAutoRun) {
    keCollect({ download: true }).catch(e => console.error(e.message));
  }
})();
