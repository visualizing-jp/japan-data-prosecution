#!/usr/bin/env bash
# 検察統計年報と犯罪白書の Excel を data/raw に置く。API キーは不要。
# macOS の bash 3.2 でも動くように連想配列は使わない。
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ESTAT="$ROOT/data/raw/estat"
HAKUSYO="$ROOT/data/raw/hakusyo"
mkdir -p "$ESTAT" "$HAKUSYO"

fetch_estat() {
  local name="$1" id="$2"
  echo "fetch $name"
  curl -fsSL -A "Mozilla/5.0" -o "$ESTAT/${name}.xlsx" \
    "https://www.e-stat.go.jp/stat-search/file-download?statInfId=${id}&fileKind=4"
}

# 2024年年報（lid=000001463686）。表番号 → statInfId
fetch_estat 24-00-02 000040302370
fetch_estat 24-00-03 000040302371
fetch_estat 24-00-05 000040302373
fetch_estat 24-00-11 000040302399
fetch_estat 24-00-12 000040302400

for f in 2-2-4-1.xlsx 2-2-4-2.xlsx; do
  echo "fetch hakusyo $f"
  curl -fsSL -A "Mozilla/5.0" -o "$HAKUSYO/$f" \
    "https://hakusyo1.moj.go.jp/jp/72/nfm/excel/$f"
done

echo "done"
