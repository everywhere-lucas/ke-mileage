// 2026-11-15 수동 조회 결과(인천 → 로스앤젤레스)로 첫 data.json을 만든다.
// 사용: node scripts/seed-data.js > public/mileage/data.json
function fmt(d){return d.toISOString().slice(0,10)}
function range(a,b){const out=[];const d=new Date(a+'T00:00:00Z'),e=new Date(b+'T00:00:00Z');while(d<=e){out.push(fmt(d));d.setUTCDate(d.getUTCDate()+1)}return out}

const m={};
const base={a17:'74H',e17:9,p17:0,a11:'388',e11:9,p11:0};
const ov={'02':{p11:2},'03':{p11:1},'07':{a17:'388',a11:'74H'},'13':{e11:7},'14':{a17:'388',a11:'74H'},
  '17':{a11:'74H'},'18':{a11:'74H'},'20':{a11:'74H'},'21':{a11:'74H'},'23':{a11:'74H'},
  '27':{a11:'74H'},'28':{e17:0,a11:'74H'},'29':{e17:0,e11:0}};
range('2026-12-01','2026-12-23').concat(range('2026-12-26','2026-12-29')).forEach(k=>{
  const o=Object.assign({},base,ov[k.slice(8)]||{});
  m[k]={f:[['KE017','14:30',o.a17,o.e17,o.p17,0],['KE011','19:40',o.a11,o.e11,o.p11,0]]};
});
m['2026-12-24']={a:0};m['2026-12-25']={a:1};m['2026-12-30']={a:0};m['2026-12-31']={a:0};
[['2027-01-14','2027-01-15'],['2027-01-17','2027-02-11']].forEach(r=>range(...r).forEach(k=>m[k]={a:1}));
[['2027-01-01','2027-01-05'],['2027-01-12','2027-01-13'],['2027-01-16','2027-01-16']].forEach(r=>range(...r).forEach(k=>m[k]={a:0}));
[['2026-12-25','2026-12-27'],['2027-01-02','2027-01-05'],['2027-02-05','2027-02-09']].forEach(r=>range(...r).forEach(k=>{if(m[k])m[k].p=1}));

const data={
  updated:'2026-11-15T20:00:00+09:00',
  // 키 설명: f=[편명, 출발시각, 기종, 일반석, 프레스티지석, 일등석] (좌석 수 9 = 9석 이상)
  //          a=1/0 (달력 화면에서 일반석 유무만 확인), p=1 성수기
  routes:{
    LAX:{out:{checked:'2026-11-15T20:00:00+09:00',days:m}}
  }
};
process.stdout.write(JSON.stringify(data)+'\n');
