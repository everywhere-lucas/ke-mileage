// ke-collect.js 결과를 public/mileage/data.json 에 합친다.
// 사용: node scripts/merge.js ke-result.json [data.json 경로]
//
// - 결과의 각 노선·방향마다 ranges(조회한 날짜 구간) 안의 날짜는 새 결과로 바꾼다.
//   (구간 안인데 결과에 없는 날 = 운항 없음 → 지움)
// - 구간 밖 날짜와 다른 노선은 그대로 둔다. 오늘 이전 날짜는 지운다.
// - meta 의 기존 키는 유지하고 yearRotation 만 갱신한다.
const fs = require('fs');
const path = require('path');

const resultPath = process.argv[2];
const dataPath = process.argv[3] || path.join(__dirname, '..', 'public', 'mileage', 'data.json');
if (!resultPath) { console.error('사용: node scripts/merge.js ke-result.json'); process.exit(1); }

const result = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
data.meta = data.meta || {};
data.routes = data.routes || {};

const kst = new Date(Date.now() + 9 * 3600e3);
const today = kst.toISOString().slice(0, 10);
const stamp = (result.meta && result.meta.finishedAt) || kst.toISOString().slice(0, 19) + '+09:00';

let changedDirs = 0;
for (const code of Object.keys(result.routes || {})) {
  for (const dir of Object.keys(result.routes[code])) {
    const r = result.routes[code][dir];
    if (!r.ranges || !r.ranges.length) continue;   // 끝까지 조회 못 한 방향은 건드리지 않음
    data.routes[code] = data.routes[code] || {};
    const cur = data.routes[code][dir] = data.routes[code][dir] || { days: {} };
    const inRange = k => r.ranges.some(([a, b]) => k >= a && k <= b);
    for (const k of Object.keys(cur.days)) if (inRange(k)) delete cur.days[k];
    for (const [k, v] of Object.entries(r.days)) if (inRange(k)) cur.days[k] = v;
    cur.checked = stamp;
    changedDirs++;
  }
}

// 오늘 이전 날짜 정리 + 날짜순 정렬
for (const code of Object.keys(data.routes)) {
  for (const dir of Object.keys(data.routes[code])) {
    const days = data.routes[code][dir].days || {};
    const sorted = {};
    Object.keys(days).sort().forEach(k => { if (k >= today) sorted[k] = days[k]; });
    data.routes[code][dir].days = sorted;
  }
}

if (result.meta && typeof result.meta.nextYearRotation === 'number') data.meta.yearRotation = result.meta.nextYearRotation;
data.meta.source = 'koreanair awardAvailability';
data.updated = stamp;

fs.writeFileSync(dataPath, JSON.stringify(data));
console.log('합침: ' + changedDirs + '개 방향, 요청 ' + ((result.meta && result.meta.calls) || 0) + '회' +
  (result.meta && result.meta.stopped ? ', 중간에 멈춤: ' + result.meta.stopped : ''));
