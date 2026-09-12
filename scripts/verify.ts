/**
 * 配信 cube の健全性チェック。
 *
 *   npm run verify
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { CubeView, type CubeJson, type DictEntry } from "../src/app/data/cube.ts";

const DATA = resolve(import.meta.dirname, "../public/data");

let failed = 0;

function ok(label: string, cond: boolean, detail = ""): void {
  console.log(`${cond ? "OK" : "NG"}  ${label}${detail ? `: ${detail}` : ""}`);
  if (!cond) failed += 1;
}

function near(a: number, b: number, tol: number): boolean {
  return Math.abs(a - b) <= tol;
}

interface EraFile extends CubeJson {
  metrics: DictEntry[];
}

interface TypeFile extends CubeJson {
  codes: DictEntry[];
}

interface GeoFile extends CubeJson {
  metrics: DictEntry[];
  areas: DictEntry[];
}

const eraRaw = JSON.parse(await readFile(resolve(DATA, "era.json"), "utf8")) as EraFile;
const typeRaw = JSON.parse(await readFile(resolve(DATA, "type.json"), "utf8")) as TypeFile;
const geoRaw = JSON.parse(await readFile(resolve(DATA, "geo.json"), "utf8")) as GeoFile;

const era = new CubeView(eraRaw);
const type = new CubeView(typeRaw);
const geo = new CubeView(geoRaw);

const accepted1965 = era.at("persons", { metric: "accepted", year: "1965" });
ok(
  "era 1965 受理≈8,225,842",
  accepted1965 !== null && near(accepted1965, 8_225_842, 1),
  String(accepted1965),
);

const accepted2024 = era.at("persons", { metric: "accepted", year: "2024" });
ok(
  "era 2024 受理≈927,108",
  accepted2024 !== null && near(accepted2024, 927_108, 1),
  String(accepted2024),
);

const indicted2024 = era.at("persons", { metric: "indicted", year: "2024" });
ok(
  "era 2024 起訴≈239,070",
  indicted2024 !== null && near(indicted2024, 239_070, 1),
  String(indicted2024),
);

const disposed2024 = era.at("persons", { metric: "disposed", year: "2024" });
ok(
  "era 2024 終局処理≈782,735",
  disposed2024 !== null && near(disposed2024, 782_735, 1),
  String(disposed2024),
);

const rate2024 = era.at("rate", { metric: "indictment_rate", year: "2024" });
ok(
  "era 2024 起訴率≈32.6%",
  rate2024 !== null && near(rate2024, 0.326, 0.002),
  String(rate2024),
);

const penalRate2024 = era.at("rate", { metric: "indictment_rate_penal", year: "2024" });
ok(
  "era 2024 刑法犯起訴率≈37.7%",
  penalRate2024 !== null && near(penalRate2024, 0.377, 0.002),
  String(penalRate2024),
);

const susRate2024 = era.at("rate", { metric: "suspension_rate_penal", year: "2024" });
ok(
  "era 2024 刑法犯起訴猶予率≈52.3%",
  susRate2024 !== null && near(susRate2024, 0.523, 0.002),
  String(susRate2024),
);

const penalRate1982 = era.at("rate", { metric: "indictment_rate_penal", year: "1982" });
ok(
  "era 1982 刑法犯起訴率≈57.5%",
  penalRate1982 !== null && near(penalRate1982, 0.575, 0.002),
  String(penalRate1982),
);

const accepted1968 = era.at("persons", { metric: "accepted", year: "1968" });
const accepted1969 = era.at("persons", { metric: "accepted", year: "1969" });
ok(
  "era 受理が 1968→1969 で減少（交通反則）",
  accepted1968 !== null && accepted1969 !== null && accepted1969 < accepted1968,
  `${accepted1968} → ${accepted1969}`,
);

const trialRate2024 = era.at("rate", { metric: "trial_rate", year: "2024" });
ok(
  "era 2024 公判請求率≈11.0%",
  trialRate2024 !== null && near(trialRate2024, 0.11, 0.002),
  String(trialRate2024),
);

const typeAll = type.at("indicted", { code: "all", year: "2024" });
ok(
  "type 2024 総数起訴≈239,070",
  typeAll !== null && near(typeAll, 239_070, 1),
  String(typeAll),
);

const typeAllRate = type.at("rate", { code: "all", year: "2024" });
ok(
  "type 2024 総数起訴率≈32.6%",
  typeAllRate !== null && near(typeAllRate, 0.326, 0.002),
  String(typeAllRate),
);

ok(
  "type 2024 刑法犯起訴≈69,026",
  type.at("indicted", { code: "penal", year: "2024" }) !== null &&
    near(type.at("indicted", { code: "penal", year: "2024" })!, 69_026, 1),
  String(type.at("indicted", { code: "penal", year: "2024" })),
);

const typePenalRate = type.at("rate", { code: "penal", year: "2024" });
ok(
  "type 2024 刑法犯起訴率≈37.7%",
  typePenalRate !== null && near(typePenalRate, 0.377, 0.002),
  String(typePenalRate),
);

ok("type 令和元年が欠測でない", type.at("indicted", { code: "all", year: "2019" }) !== null);

ok("geo 地検+全国が51", geoRaw.areas.length === 51, String(geoRaw.areas.length));

const nationalPenal = geo.at("value", { metric: "penal", year: "2024", area: "00000" });
ok(
  "geo 全国 刑法犯 人口10万人当たり≈392.3",
  nationalPenal !== null && near(nationalPenal, 392.3, 0.05),
  String(nationalPenal),
);

const relNat = geo.at("relative", { metric: "penal", year: "2024", area: "00000" });
ok("geo 全国 relative=1", relNat === 1, String(relNat));

const tokyoPenal = geo.at("value", { metric: "penal", year: "2024", area: "tokyo" });
ok(
  "geo 東京の人口当たりが全国と異なる",
  tokyoPenal !== null && nationalPenal !== null && tokyoPenal !== nationalPenal,
  `東京 ${tokyoPenal} / 全国 ${nationalPenal}`,
);

const natSus = geo.at("value", { metric: "suspension_rate", year: "2024", area: "00000" });
ok(
  "geo 全国 刑法犯起訴猶予率≈52.3%",
  natSus !== null && near(natSus, 0.523, 0.002),
  String(natSus),
);

if (failed > 0) {
  console.error(`\n${failed} checks failed`);
  process.exit(1);
}
console.log("\nall checks passed");
