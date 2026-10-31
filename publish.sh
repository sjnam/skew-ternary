#!/usr/bin/env bash
#
# publish.sh — app/index.html을 sjnam.github.io의 skew-ternary/에 올린다.
#
# 사이트 저장소에 사본을 복사하고, 그 저장소의 deploy.sh로 커밋·푸시하고 Pages
# 빌드를 기다린 다음, https://sjnam.github.io/skew-ternary/가 이 파일과 바이트까지
# 같은지 본다. deploy.sh는 사이트의 루트만 대조하므로 이 마지막 확인은 따로 한다.
#
#   ./publish.sh            (make publish)
#   SITE=~/elsewhere ./publish.sh
#
set -euo pipefail

cd "$(dirname "$0")"

SITE="${SITE:-$HOME/workspace/sjnam.github.io}"
SRC="app/index.html"
DST="skew-ternary/index.html"
URL="https://sjnam.github.io/skew-ternary/"

say() { printf '\033[1m==>\033[0m %s\n' "$*"; }
die() { printf 'publish.sh: %s\n' "$*" >&2; exit 1; }

[ -x "$SITE/deploy.sh" ] || die "${SITE}/deploy.sh가 없다 (SITE를 확인할 것)"

# 공개된 페이지가 늘 이 저장소의 어떤 커밋과 같도록, 커밋하지 않은 고침은 올리지 않는다.
git diff --quiet HEAD -- "$SRC" || die "${SRC}에 커밋하지 않은 고침이 있다; 먼저 커밋할 것"

# deploy.sh는 바뀐 것을 모두(git add -A) 커밋하므로, 사이트에 다른 고침이 있으면 멈춘다.
[ -z "$(git -C "$SITE" status --porcelain)" ] ||
  die "${SITE}에 커밋하지 않은 고침이 있다; 그것부터 정리할 것"

if cmp -s "$SRC" "$SITE/$DST"; then
  say "사이트의 사본이 이미 ${SRC}과 같다; 배포는 건너뛰고 확인만 한다"
else
  say "사본을 갱신한다"
  cp "$SRC" "$SITE/$DST"
  rev=$(git log -1 --format='%h %s' -- "$SRC")
  "$SITE/deploy.sh" -m "skew-ternary: ${rev}"
fi

# 빌드가 끝나도 CDN이 옛 사본을 한동안 내줄 수 있으니 몇 번 더 본다.
say "$URL 확인"
want=$(shasum -a 256 < "$SRC" | cut -d' ' -f1)
for attempt in 1 2 3 4 5 6; do
  got=$(curl -fsSL --max-time 20 "$URL?publish=$attempt" | shasum -a 256 | cut -d' ' -f1) || got=""
  if [ "$got" = "$want" ]; then
    say "공개된 페이지가 ${SRC}과 같다"
    exit 0
  fi
  [ "$attempt" -lt 6 ] && sleep 10
done
die "빌드는 끝났지만 ${URL}이 아직 ${SRC}과 다르다 (대개 CDN의 옛 사본; 잠시 뒤 다시)"
