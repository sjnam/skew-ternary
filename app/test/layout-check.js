// index.html의 mapLayout이 셈한 지도 좌표를 검사한다. 무작위 나무마다 JS 지도 넷과
// DDP 지도 넷에 대해
//   (ㄱ) 꼭짓점–변 마디 선분끼리 끝점 말고는 만나지 않는다,
//   (ㄴ) 꼭짓점마다 변 마디들이 반시계로 놓인 차례가 α의 꼭짓점 고리와 같다,
//   (ㄷ) 바깥 면 마디를 뺀 무게중심 세분의 삼각형이 모두 넓이가 양수다.
// (ㄷ)이면 교차가 없으니 (ㄱ)은 따로 한 번 더 보는 셈이고, (ㄴ)이 있어야 그림이
// 그저 평면 그래프가 아니라 프로그램이 셈한 바로 그 지도임이 보장된다.
// 덤으로 가장 가까운 두 꼭짓점의 거리(둘레 원의 반지름 1)가 얼마나 줄어드는지 적는다.
//
//   node layout-check.js [횟수=1000] [씨앗=1]
"use strict";
const {load, rng, pick} = require("./common");

const trials = +(process.argv[2] || 1000), seed = +(process.argv[3] || 1);
const lib = load(), rnd = rng(seed);
const cross = (ax, ay, bx, by, cx, cy) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);

function check(m) {
  const L = lib.mapLayout(m), {x, y} = L, errs = [];

  // (ㄷ)
  const out = L.fNode(L.outF);
  for (const [p, q, r] of L.tris) {
    if (p === out || q === out || r === out) continue;
    if (!(cross(x[p], y[p], x[q], y[q], x[r], y[r]) > 0)) { errs.push("ㄷ 삼각형이 뒤집혔다"); break; }
  }

  // (ㄴ) 고리 차례대로 갈 때 반시계로 도는 각의 합이 정확히 한 바퀴여야 한다
  m.verts.forEach((c, v) => {
    const ang = c.map(p => { const u = L.eIx[lib.pipEdge(p)]; return Math.atan2(y[u] - y[v], x[u] - x[v]); });
    let turn = 0;
    for (let i = 0; i < c.length; i++) {
      let d = ang[(i + 1) % c.length] - ang[i];
      while (d <= 0) d += 2 * Math.PI;
      turn += d;
    }
    if (Math.abs(turn - 2 * Math.PI) > 1e-6) errs.push("ㄴ 꼭짓점 " + v + "의 차례");
  });

  // (ㄱ) 판정식을 선분 길이로 나누어 '직선까지의 거리'로 바꾸고, 긴 선분에 비례하는
  // 허용치로 0을 가린다. 몰린 자리에서는 좌표가 10⁻⁸쯤이라 절대 허용치는 못 쓴다.
  // 한 직선 위에 놓인 두 선분은 그 직선에 내린 구간이 겹치는지로 따진다.
  const seg = [];
  for (let v = 0; v < L.V; v++) for (const p of m.verts[v]) seg.push([v, L.eIx[lib.pipEdge(p)]]);
  outer: for (let i = 0; i < seg.length; i++) for (let j = i + 1; j < seg.length; j++) {
    const [a1, a2] = seg[i], [b1, b2] = seg[j];
    if (a1 === b1 || a1 === b2 || a2 === b1 || a2 === b2) continue;
    const la = Math.hypot(x[a2] - x[a1], y[a2] - y[a1]), lb = Math.hypot(x[b2] - x[b1], y[b2] - y[b1]);
    const tol = 1e-9 * Math.max(la, lb);
    const zA = d => Math.abs(d / la) < tol ? 0 : Math.sign(d), zB = d => Math.abs(d / lb) < tol ? 0 : Math.sign(d);
    const s1 = zA(cross(x[a1], y[a1], x[a2], y[a2], x[b1], y[b1]));
    const s2 = zA(cross(x[a1], y[a1], x[a2], y[a2], x[b2], y[b2]));
    const s3 = zB(cross(x[b1], y[b1], x[b2], y[b2], x[a1], y[a1]));
    const s4 = zB(cross(x[b1], y[b1], x[b2], y[b2], x[a2], y[a2]));
    let hit;
    if (s1 === 0 && s2 === 0) {
      const ux = x[a2] - x[a1], uy = y[a2] - y[a1], eps = tol * la * la;
      const t = w => (x[w] - x[a1]) * ux + (y[w] - y[a1]) * uy;
      const lo = Math.min(t(b1), t(b2)), hi = Math.max(t(b1), t(b2));
      hit = hi > eps && lo < ux * ux + uy * uy - eps;
    } else hit = s1 * s2 <= 0 && s3 * s4 <= 0;
    if (hit) { errs.push("ㄱ 선분이 엇갈린다"); break outer; }
  }

  let minD = Infinity;
  for (let i = 0; i < L.V; i++) for (let j = i + 1; j < L.V; j++)
    minD = Math.min(minD, Math.hypot(x[i] - x[j], y[i] - y[j]));
  return {errs, minD, edges: L.E};
}

let ok = 0, bad = 0;
const seen = new Set(), near = {};
for (let t = 0; t < trials; t++) {
  const args = pick(lib, rnd, t);
  seen.add(args.join(" "));
  const M = lib.planarMaps(lib.skew(args));
  for (const kind of ["js", "ddp"]) M[kind].forEach((m, j) => {
    const res = check(m);
    if (res.errs.length) { if (++bad <= 5) console.log("틀림:", kind, j, args.join(" "), res.errs.join("; ")); }
    else ok++;
    const band = Math.min(6, Math.floor(res.edges / 10));
    (near[band] = near[band] || []).push(res.minD);
  });
}
console.log(`지도 ${ok}장 통과, ${bad}장 틀림 (서로 다른 입력 ${seen.size}가지)`);
for (const band of Object.keys(near).sort((a, b) => a - b)) {
  const ds = near[band].sort((a, b) => a - b);
  console.log(`  변 ${band * 10}~${band * 10 + 9}개: 가장 가까운 두 꼭짓점 — ` +
    `중앙값 ${ds[ds.length >> 1].toFixed(3)}, 최솟값 ${ds[0].toExponential(1)}`);
}
process.exitCode = bad ? 1 : 0;
