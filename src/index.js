// everywherelucas.com/mileage 경로만 담당하는 Worker.
// 페이지와 좌석 데이터(public/mileage/*)를 정적 파일로 내보낸다.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // /mileage → /mileage/ (상대 경로 ./data.json 이 맞게 잡히도록)
    if (url.pathname === '/mileage') {
      url.pathname = '/mileage/';
      return Response.redirect(url.toString(), 301);
    }

    const res = await env.ASSETS.fetch(request);

    // 좌석 데이터는 하루 한 번 바뀌므로 짧게만 캐시
    if (url.pathname.endsWith('/data.json')) {
      const out = new Response(res.body, res);
      out.headers.set('Cache-Control', 'public, max-age=300');
      return out;
    }
    return res;
  },
};
