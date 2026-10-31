// 두 검사가 함께 쓰는 것들: index.html에서 셈하는 부분을 떼어 오기, 난수,
// 무작위 비스듬한 삼진 나무.
"use strict";
const fs = require("fs");
const path = require("path");

const HTML = path.join(__dirname, "..", "index.html");

// <script>의 첫머리부터 「자리잡기」(나무 그림) 앞까지가 셈하는 부분이다.
// 거기에는 DOM을 건드리는 코드가 없으므로 node에서 그대로 돌릴 수 있다.
function load(html = HTML) {
  const src = fs.readFileSync(html, "utf8");
  const a = src.indexOf('"use strict";', src.indexOf("<script>"));
  const b = src.indexOf("/* ══════════ 자리잡기");
  if (a < 0 || b < 0) throw new Error(html + "에서 셈하는 부분을 찾지 못했다");
  return new Function(src.slice(a, b) +
    "; return {skew, planarMaps, mapLayout, pip, pipEdge, pipName, ROOT};")();
}

// mulberry32. 처음에는 seed*1103515245로 된 선형 합동 생성기를 썼는데, 곱이
// 2⁵³을 넘어 아래 비트가 뭉개지는 바람에 9000번 돌려도 서로 다른 나무가
// 391가지뿐이었다.
function rng(seed) {
  return k => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return Math.floor(((t ^ t >>> 14) >>> 0) / 4294967296 * k);
  };
}

// 마디 n개짜리 비스듬한 삼진 나무. 계급이 음이 아닌 빈자리에만 마디를 붙이면
// 언제나 비스듬하다. 마디 이름은 ‘@’부터 ‘~’까지에서 무작위로 고르고, 인자의
// 차례도 섞는다.
function randomTree(rnd, n) {
  const codes = [];
  for (let c = 64; c <= 126; c++) codes.push(c);
  for (let i = codes.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [codes[i], codes[j]] = [codes[j], codes[i]];
  }
  const names = codes.slice(0, n).map(c => String.fromCharCode(c));
  const kids = names.map(() => ["-", "-", "-"]);
  const slots = [[0, 0, -1], [0, 1, 0], [0, 2, 1]];
  for (let i = 1; i < n; i++) {
    const ok = slots.map((s, ix) => ix).filter(ix => slots[ix][2] >= 0);
    const [p, s, rk] = slots.splice(ok[rnd(ok.length)], 1)[0];
    kids[p][s] = names[i];
    slots.push([i, 0, rk - 1], [i, 1, rk], [i, 2, rk + 1]);
  }
  const args = names.map((v, i) => v + kids[i].join(""));
  for (let i = args.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [args[i], args[j]] = [args[j], args[i]];
  }
  return args;
}

// 마디 1~63개짜리 나무를 하나 고르되, 홀수 번째에는 그 켤레 가운데 하나로 바꾼다.
// 켤레는 위의 생성기가 잘 만들지 않는 꼴(뿌리 가까이 계급이 낮은 나무)이다.
function pick(lib, rnd, t) {
  let args = randomTree(rnd, 1 + rnd(63));
  if (t % 2) args = lib.skew(args).conj[1 + rnd(3)];
  return args;
}

module.exports = {load, rng, randomTree, pick};
