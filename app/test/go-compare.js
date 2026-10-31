// index.html의 셈이 Go 프로그램 skew-ternary-calc과 같은지 본다. 무작위 나무마다
// 두 쪽에서 Go가 찍는 출력 전체 — 싹까지 드러낸 나무(계급과 싹 번호), 켤레 셋,
// JS 지도 넷, DDP 지도 넷 — 를 만들어 글자 하나까지 견준다.
//
//   node go-compare.js [횟수=3000] [씨앗=1]
"use strict";
const path = require("path");
const {execFileSync} = require("child_process");
const {load, rng, pick} = require("./common");

const BIN = path.join(__dirname, "..", "..", "skew-ternary-calc");
const trials = +(process.argv[2] || 3000), seed = +(process.argv[3] || 1);
const lib = load(), rnd = rng(seed);

// Go의 printTree를 그대로 따른다
function treeLines(r) {
  const out = [], ch = c => String.fromCharCode(c), pad = (d, w) => String(d).padStart(w);
  (function walk(p) {
    const nd = r.node[p];
    out.push(".".repeat(nd.rank + 8) + " " + ch(p) + ":" +
      (nd.left < 0 ? pad(-nd.left, 3) : "  " + ch(nd.left)) +
      (nd.middle < 0 ? pad(-nd.middle, 3) : " " + ch(nd.middle) + " ") +
      (nd.right < 0 ? pad(-nd.right, 3) : " " + ch(nd.right)));
    for (const q of [nd.left, nd.middle, nd.right]) if (q > 0) walk(q);
  })(r.root);
  return out;
}

function mapLines(maps, label) {
  const out = [];
  maps.forEach((m, j) => {
    out.push(`--- T${"+".repeat(j)}의 ${label} 지도 ---`, "꼭짓점:");
    for (const c of m.verts) out.push(c.map(p => " " + lib.pipName(p)).join(""));
    out.push("면:");
    for (const c of m.faces) out.push(c.map(p => " " + lib.pipName(p)).join(""));
    out.push(`(모두 꼭짓점 ${m.v}개, 변 ${m.e}개, 면 ${m.f}개, 성분 ${m.c}개다.)`);
  });
  return out;
}

let same = 0, diff = 0;
const seen = new Set();
for (let t = 0; t < trials; t++) {
  const args = pick(lib, rnd, t);
  seen.add(args.join(" "));
  const r = lib.skew(args), M = lib.planarMaps(r);
  const got = [
    ...treeLines(r), "",
    ...[1, 2, 3].map(j => "+".repeat(j) + ":" + r.conj[j].map(a => " " + a).join("")),
    ...mapLines(M.js, "JS"), ...mapLines(M.ddp, "DDP"),
  ].join("\n") + "\n";
  const want = execFileSync(BIN, args, {encoding: "utf8"});
  if (got === want) same++;
  else if (++diff <= 3) console.log("다름:", args.join(" "));
}
console.log(`Go와 같음 ${same}, 다름 ${diff} (서로 다른 입력 ${seen.size}가지)`);
process.exitCode = diff ? 1 : 0;
