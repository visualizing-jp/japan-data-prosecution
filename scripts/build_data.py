#!/usr/bin/env python3
"""検察統計・犯罪白書の Excel から public/data の cube を書く。"""

from __future__ import annotations

import json
import re
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parents[1]
ESTAT = ROOT / "data/raw/estat"
HAKUSYO = ROOT / "data/raw/hakusyo"
OUT = ROOT / "public/data"

ERA_FROM = 1955
ERA_TO = 2024
TYPE_FROM = 2011

METRICS = [
    ("accepted", "受理人員", "規模"),
    ("indicted", "起訴人員", "規模"),
    ("disposed", "終局処理人員", "規模"),
    ("indictment_rate", "起訴率（総数）", "率"),
    ("indictment_rate_penal", "起訴率（刑法犯）", "率"),
    ("suspension_rate_penal", "起訴猶予率（刑法犯）", "率"),
    ("trial", "公判請求人員", "処理"),
    ("trial_rate", "公判請求率", "処理"),
    ("summary", "略式命令請求", "処理"),
    ("suspended", "起訴猶予", "処理"),
]

TYPE_CODES = [
    ("all", "総数", "総数"),
    ("penal", "刑法犯", "刑法犯"),
    ("traffic", "道路交通法等違反", "道路交通法等違反"),
    ("special", "特別法犯（道交除く）", "特別法犯（道路交通法等違反を除く。）"),
    ("theft", "窃盗", "窃盗"),
    ("fraud", "詐欺", "詐欺"),
    ("injury", "傷害", "傷害"),
    ("negligence", "過失傷害", "過失傷害"),
    ("murder", "殺人", "殺人"),
    ("rape", "不同意性交等", "不同意性交等"),
    ("indecent", "不同意わいせつ", "不同意わいせつ"),
    ("stimulant", "覚醒剤取締法", "覚醒剤取締法"),
]

GEO_COLS = {
    "penal": 4,
    "murder": 8,
    "injury": 9,
    "theft": 12,
    "fraud": 14,
    "traffic": 19,
}

GEO_METRICS = [
    ("penal", "刑法犯（人口10万人当たり）"),
    ("theft", "窃盗（人口10万人当たり）"),
    ("injury", "傷害（人口10万人当たり）"),
    ("fraud", "詐欺（人口10万人当たり）"),
    ("murder", "殺人（人口10万人当たり）"),
    ("traffic", "道路交通法等違反（人口10万人当たり）"),
    ("suspension_rate", "起訴猶予率（刑法犯）"),
]


def years_inclusive(a: int, b: int) -> list[str]:
    return [str(y) for y in range(a, b + 1)]


def round_n(v: float | None, digits: int) -> float | None:
    if v is None or not isinstance(v, (int, float)):
        return None
    if isinstance(v, bool):
        return None
    f = 10 ** digits
    return round(v * f) / f


def norm(s: object | None) -> str:
    if s is None:
        return ""
    return re.sub(r"\s+", "", str(s))


def num(v: object | None) -> float | None:
    if isinstance(v, bool) or v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    return None


class Cube:
    def __init__(self, dims: list[tuple[str, list[str]]], measures: list[str]):
        self.dims = [{"name": n, "codes": codes} for n, codes in dims]
        self.index = [{c: i for i, c in enumerate(codes)} for _, codes in dims]
        self.strides = []
        for i in range(len(dims)):
            s = 1
            for _, codes in dims[i + 1 :]:
                s *= len(codes)
            self.strides.append(s)
        self.size = 1
        for _, codes in dims:
            self.size *= len(codes)
        self.measures = {m: [None] * self.size for m in measures}

    def set(self, measure: str, coords: list[str], value: float | None) -> None:
        offset = 0
        for i, code in enumerate(coords):
            offset += self.index[i][code] * self.strides[i]
        self.measures[measure][offset] = value

    def to_json(self) -> dict:
        return {"dims": self.dims, "measures": self.measures}


def western_year(era: str, n: int) -> int | None:
    if era == "taisho":
        return 1911 + n
    if era == "showa":
        return 1925 + n
    if era == "heisei":
        return 1988 + n
    if era == "reiwa":
        return 2018 + n
    return None


def parse_era_label(text: str) -> tuple[str | None, int | None]:
    t = re.sub(r"\s+", "", text)
    if "大正" in t:
        m = re.search(r"(\d+)", t)
        return "taisho", int(m.group(1)) if m else 1
    if "昭和" in t:
        if "元" in t:
            return "showa", 1
        m = re.search(r"(\d+)", t)
        return "showa", int(m.group(1)) if m else 1
    if "平成" in t:
        if "元" in t:
            return "heisei", 1
        m = re.search(r"(\d+)", t)
        return "heisei", int(m.group(1)) if m else 1
    if "令和" in t:
        if "元" in t:
            return "reiwa", 1
        m = re.search(r"(\d+)", t)
        return "reiwa", int(m.group(1)) if m else 1
    return None, None


def load_accept_indict() -> dict[int, tuple[float | None, float | None, float | None]]:
    """24-00-02: year -> (受理総数, 起訴, 不起訴計)."""
    ws = openpyxl.load_workbook(ESTAT / "24-00-02.xlsx", data_only=True).active
    era = None
    out: dict[int, tuple[float | None, float | None, float | None]] = {}
    for row in ws.iter_rows(min_row=8, max_row=130, max_col=9, values_only=True):
        label = row[1]
        if label is None:
            continue
        if isinstance(label, str):
            e, n = parse_era_label(label)
            if e:
                era = e
                year = western_year(era, n or 1)
            else:
                continue
        elif isinstance(label, (int, float)) and era:
            year = western_year(era, int(label))
        else:
            continue
        if year is None:
            continue
        out[year] = (num(row[3]), num(row[7]), num(row[8]))
    return out


def load_hakusyo_disposed() -> dict[int, dict[str, float | None]]:
    wb = openpyxl.load_workbook(HAKUSYO / "2-2-4-1.xlsx", data_only=True)
    ws1 = wb["2-2-4-1図①"]
    ws2 = wb["2-2-4-1図②"]
    out: dict[int, dict[str, float | None]] = {}
    for row in ws1.iter_rows(min_row=9, max_row=44, max_col=14, values_only=True):
        yraw = row[2]
        if not isinstance(yraw, str) or not yraw.endswith("年"):
            continue
        year = int(yraw.replace("年", ""))
        total, trial, summary, suspended, other, family = (
            num(row[3]),
            num(row[4]),
            num(row[6]),
            num(row[8]),
            num(row[10]),
            num(row[12]),
        )
        indicted = None if trial is None or summary is None else trial + summary
        nolle = None if suspended is None or other is None else suspended + other
        rate = None
        if indicted is not None and nolle is not None and indicted + nolle:
            rate = indicted / (indicted + nolle)
        out[year] = {
            "disposed": total,
            "trial": trial,
            "summary": summary,
            "suspended": suspended,
            "indictment_rate": rate,
        }
        _ = family
    for row in ws2.iter_rows(min_row=8, max_row=43, max_col=7, values_only=True):
        yraw = row[2]
        if not isinstance(yraw, str) or not yraw.endswith("年"):
            continue
        year = int(yraw.replace("年", ""))
        out.setdefault(year, {})
        trial_rate = num(row[6])
        out[year]["trial_rate"] = None if trial_rate is None else trial_rate / 100
    return out


def load_hakusyo_penal() -> dict[int, dict[str, float | None]]:
    ws = openpyxl.load_workbook(HAKUSYO / "2-2-4-2.xlsx", data_only=True).active
    out: dict[int, dict[str, float | None]] = {}
    for row in ws.iter_rows(min_row=8, max_row=50, max_col=12, values_only=True):
        yraw = row[2]
        if not isinstance(yraw, str) or not yraw.endswith("年"):
            continue
        year = int(yraw.replace("年", ""))
        ind = num(row[3])
        nolle = num(row[4])
        ind_rate = num(row[6])
        sus_rate = num(row[7])
        out[year] = {
            "indicted": ind,
            "nolle": nolle,
            "indictment_rate_penal": None if ind_rate is None else ind_rate / 100,
            "suspension_rate_penal": None if sus_rate is None else sus_rate / 100,
        }
    return out


def load_type_table() -> dict[str, dict[int, tuple[float | None, float | None, float | None]]]:
    """excel_label -> year -> (起訴, 不起訴, 起訴率％)."""
    ws = openpyxl.load_workbook(ESTAT / "24-00-05.xlsx", data_only=True)["24-00-05"]
    year_cols: list[tuple[int, int]] = []
    for c in range(1, ws.max_column + 1):
        v = ws.cell(4, c).value
        if isinstance(v, str) and "年" in v:
            year = wareki_year(v)
            if year is None:
                continue
            year_cols.append((year, c))

    wanted = {norm(excel): code for code, _label, excel in TYPE_CODES}
    found: dict[str, dict[int, tuple[float | None, float | None, float | None]]] = {
        code: {} for code, _, _ in TYPE_CODES
    }
    seen_injury = False
    for r in range(7, ws.max_row + 1):
        labels = [norm(ws.cell(r, c).value) for c in range(1, 7)]
        key = next((x for x in reversed(labels) if x), "")
        if key not in wanted:
            continue
        code = wanted[key]
        # 傷害は大分類行（最初の一致）だけ取る
        if code == "injury":
            if seen_injury:
                continue
            seen_injury = True
        for year, c in year_cols:
            found[code][year] = (num(ws.cell(r, c).value), num(ws.cell(r, c + 1).value), num(ws.cell(r, c + 2).value))
    return found


def wareki_year(text: str) -> int | None:
    t = re.sub(r"\s+", "", text)
    m = re.search(r"(\d+)", t)
    n = 1 if "元" in t else (int(m.group(1)) if m else None)
    if n is None:
        return None
    if "平成" in t:
        return 1988 + n
    if "令和" in t:
        return 2018 + n
    return None


OFFICES = {
    "総数": "00000",
    "東京": "tokyo",
    "横浜": "yokohama",
    "さいたま": "saitama",
    "千葉": "chiba",
    "水戸": "mito",
    "宇都宮": "utsunomiya",
    "前橋": "maebashi",
    "静岡": "shizuoka",
    "甲府": "kofu",
    "長野": "nagano",
    "新潟": "niigata",
    "大阪": "osaka",
    "京都": "kyoto",
    "神戸": "kobe",
    "奈良": "nara",
    "大津": "otsu",
    "和歌山": "wakayama",
    "名古屋": "nagoya",
    "津": "tsu",
    "岐阜": "gifu",
    "福井": "fukui",
    "金沢": "kanazawa",
    "富山": "toyama",
    "広島": "hiroshima",
    "山口": "yamaguchi",
    "岡山": "okayama",
    "鳥取": "tottori",
    "松江": "matsue",
    "福岡": "fukuoka",
    "佐賀": "saga",
    "長崎": "nagasaki",
    "大分": "oita",
    "熊本": "kumamoto",
    "鹿児島": "kagoshima",
    "宮崎": "miyazaki",
    "那覇": "naha",
    "仙台": "sendai",
    "福島": "fukushima",
    "山形": "yamagata",
    "盛岡": "morioka",
    "秋田": "akita",
    "青森": "aomori",
    "札幌": "sapporo",
    "函館": "hakodate",
    "旭川": "asahikawa",
    "釧路": "kushiro",
    "高松": "takamatsu",
    "徳島": "tokushima",
    "高知": "kochi",
    "松山": "matsuyama",
}


def load_geo_per100k() -> tuple[list[tuple[str, str]], dict[str, dict[str, float | None]]]:
    ws = openpyxl.load_workbook(ESTAT / "24-00-12.xlsx", data_only=True)["24-00-12"]
    areas: list[tuple[str, str]] = []
    values: dict[str, dict[str, float | None]] = {}
    for r in range(6, ws.max_row + 1):
        name = ws.cell(r, 2).value
        if not isinstance(name, str):
            continue
        name = name.strip()
        if name not in OFFICES:
            continue
        code = OFFICES[name]
        areas.append((code, "全国" if name == "総数" else name))
        values[code] = {m: num(ws.cell(r, col).value) for m, col in GEO_COLS.items()}
    return areas, values


def load_geo_suspension() -> dict[str, float | None]:
    """刑法犯の起訴・起訴猶予（列10–11）。表の総数は道交除く特別法犯を含む。"""
    ws = openpyxl.load_workbook(ESTAT / "24-00-11.xlsx", data_only=True)["24-00-11-刑法犯"]
    out: dict[str, float | None] = {}
    for r in range(7, ws.max_row + 1):
        raw = ws.cell(r, 3).value or ws.cell(r, 2).value
        if not isinstance(raw, str):
            continue
        name = raw.strip()
        if name in {"最高検察庁"} or "管内" in name or "(高検)" in name or "（高検）" in name:
            continue
        name = name.replace("(地検)", "").replace("（地検）", "")
        if name not in OFFICES:
            continue
        code = OFFICES[name]
        ind = num(ws.cell(r, 10).value)
        sus = num(ws.cell(r, 11).value)
        if ind is None or sus is None or ind + sus == 0:
            out[code] = None
        else:
            out[code] = sus / (ind + sus)
    return out


def build_era() -> dict:
    years = years_inclusive(ERA_FROM, ERA_TO)
    cube = Cube([("metric", [m[0] for m in METRICS]), ("year", years)], ["persons", "rate"])
    accept = load_accept_indict()
    disposed = load_hakusyo_disposed()
    penal = load_hakusyo_penal()
    for y in range(ERA_FROM, ERA_TO + 1):
        ys = str(y)
        a, i, nolle = accept.get(y, (None, None, None))
        d = disposed.get(y, {})
        p = penal.get(y, {})
        cube.set("persons", ["accepted", ys], round_n(a, 0))
        cube.set("persons", ["indicted", ys], round_n(i, 0))
        cube.set("persons", ["disposed", ys], round_n(d.get("disposed"), 0))
        cube.set("persons", ["trial", ys], round_n(d.get("trial"), 0))
        cube.set("persons", ["summary", ys], round_n(d.get("summary"), 0))
        cube.set("persons", ["suspended", ys], round_n(d.get("suspended"), 0))
        if i is not None and nolle is not None and i + nolle:
            indictment_rate = i / (i + nolle)
        else:
            indictment_rate = d.get("indictment_rate")
        cube.set("rate", ["indictment_rate", ys], round_n(indictment_rate, 4))
        cube.set("rate", ["trial_rate", ys], round_n(d.get("trial_rate"), 4))
        cube.set("rate", ["indictment_rate_penal", ys], round_n(p.get("indictment_rate_penal"), 4))
        cube.set("rate", ["suspension_rate_penal", ys], round_n(p.get("suspension_rate_penal"), 4))
    metrics = [{"code": c, "label": lab, "level": 1, "parent": g} for c, lab, g in METRICS]
    return {**cube.to_json(), "metrics": metrics}


def build_type() -> dict:
    years = years_inclusive(TYPE_FROM, ERA_TO)
    codes = [c for c, _, _ in TYPE_CODES]
    cube = Cube([("code", codes), ("year", years)], ["indicted", "nolle", "rate"])
    table = load_type_table()
    penal = load_hakusyo_penal()
    for code, _label, _excel in TYPE_CODES:
        for y in range(TYPE_FROM, ERA_TO + 1):
            if code == "penal":
                # 年報の刑法犯大分類は過失運転を含み、白書の刑法犯と一致しない。
                p = penal.get(y, {})
                ind = p.get("indicted")
                nolle = p.get("nolle")
                rate = p.get("indictment_rate_penal")
            else:
                ind, nolle, rate_pct = table.get(code, {}).get(y, (None, None, None))
                rate = None if rate_pct is None else rate_pct / 100
            cube.set("indicted", [code, str(y)], round_n(ind, 0))
            cube.set("nolle", [code, str(y)], round_n(nolle, 0))
            if rate is None and ind is not None and nolle is not None and ind + nolle:
                rate = ind / (ind + nolle)
            cube.set("rate", [code, str(y)], round_n(rate, 4))
    dict_codes = [{"code": c, "label": lab, "level": 1} for c, lab, _ in TYPE_CODES]
    return {**cube.to_json(), "codes": dict_codes}


def build_geo() -> dict:
    areas, per100k = load_geo_per100k()
    sus = load_geo_suspension()
    year = "2024"
    area_codes = [c for c, _ in areas]
    metric_codes = [c for c, _ in GEO_METRICS]
    cube = Cube(
        [("metric", metric_codes), ("year", [year]), ("area", area_codes)],
        ["value", "relative"],
    )
    national = per100k["00000"]
    for code, _name in areas:
        row = per100k[code]
        for m, _lab in GEO_METRICS:
            if m == "suspension_rate":
                val = sus.get(code)
            else:
                val = row.get(m)
            cube.set("value", [m, year, code], round_n(val, 4))
            if m == "suspension_rate":
                nat = sus.get("00000")
            else:
                nat = national.get(m)
            rel = None
            if val is not None and nat not in (None, 0):
                rel = val / nat
            cube.set("relative", [m, year, code], 1 if code == "00000" and val is not None else round_n(rel, 4))
    return {
        **cube.to_json(),
        "metrics": [{"code": c, "label": lab, "level": 1} for c, lab in GEO_METRICS],
        "areas": [{"code": c, "label": n, "level": 1} for c, n in areas],
    }


def write_json(name: str, data: dict) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / f"{name}.json"
    text = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    path.write_text(text)
    print(f"  {name}.json  {path.stat().st_size / 1024:.1f} KB")


def main() -> None:
    print("building cubes")
    write_json("era", build_era())
    write_json("type", build_type())
    write_json("geo", build_geo())
    print("done")


if __name__ == "__main__":
    main()
