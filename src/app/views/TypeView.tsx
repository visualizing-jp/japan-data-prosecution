/**
 * 罪名ビュー。罪名別の起訴率と起訴人員。
 */

import { use, useMemo, useState } from "react";
import { loadType } from "../data/chunks.ts";
import { TypeList } from "../components/TypeList.tsx";
import { Segmented } from "../components/Segmented.tsx";
import { YearSelect } from "../components/YearSelect.tsx";
import { TrendStack, type Panel, type Point } from "../components/TrendStack.tsx";
import { useWidth } from "../hooks/useWidth.ts";
import { useUrlState } from "../hooks/useUrlState.ts";
import { TYPE_FROM, ERA_TO } from "../../lib/data/labels.ts";

const int = new Intl.NumberFormat("ja-JP");
const pct = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const MODES = [
  { value: "rate", label: "起訴率" },
  { value: "persons", label: "起訴人員" },
] as const;

type ModeId = (typeof MODES)[number]["value"];

function dense(yearsAsc: number[], values: (number | null)[]): Point[] {
  const byYear = new Map(yearsAsc.map((y, i) => [y, values[i] ?? null]));
  return Array.from({ length: ERA_TO - TYPE_FROM + 1 }, (_, i) => ({
    year: TYPE_FROM + i,
    value: byYear.get(TYPE_FROM + i) ?? null,
  }));
}

export function TypeView() {
  const { codes, cube, years } = use(loadType());
  const yearsAsc = useMemo(() => cube.codes("year").map(Number), [cube]);

  const [mode, setMode] = useUrlState<ModeId>("mode", "rate", (v) =>
    MODES.some((m) => m.value === v),
  );
  const [year, setYear] = useUrlState("year", years[0]!, (v) => years.includes(v));
  const [code, setCode] = useUrlState<string>("type", "penal", (v) =>
    codes.some((c) => c.code === v),
  );
  const [hoverYear, setHoverYear] = useState<number | null>(null);
  const [ref, width] = useWidth<HTMLDivElement>();

  const current = codes.find((c) => c.code === code) ?? codes[0]!;

  const rows = useMemo(() => {
    const measure = mode === "rate" ? "rate" : "indicted";
    return codes.map((c) => ({
      type: c,
      values: cube.series(measure, "year", { code: c.code }),
    }));
  }, [codes, cube, mode]);

  const yearRank = useMemo(() => {
    return [...codes]
      .map((c) => ({
        code: c.code,
        label: c.label,
        rate: cube.at("rate", { code: c.code, year }) ?? 0,
        indicted: cube.at("indicted", { code: c.code, year }) ?? 0,
      }))
      .sort((a, b) => b.rate - a.rate);
  }, [codes, cube, year]);

  const panels = useMemo((): Panel[] => {
    return [
      {
        key: "rate",
        title: "起訴率",
        unit: "起訴 ÷（起訴＋不起訴）",
        format: (v) => `${pct.format(v * 100)}%`,
        formatTick: (v) => `${pct.format(v * 100)}%`,
        series: [
          {
            key: "rate",
            label: "",
            points: dense(yearsAsc, cube.series("rate", "year", { code })),
            emphasized: true,
          },
        ],
      },
      {
        key: "indicted",
        title: "起訴人員",
        unit: "人",
        format: (v) => `${int.format(Math.round(v))}人`,
        formatTick: (v) =>
          v >= 10_000 ? `${int.format(Math.round(v / 10_000))}万` : int.format(Math.round(v)),
        series: [
          {
            key: "indicted",
            label: "",
            points: dense(yearsAsc, cube.series("indicted", "year", { code })),
            emphasized: true,
          },
        ],
      },
    ];
  }, [cube, code, yearsAsc]);

  return (
    <div className="mx-auto flex w-full max-w-[1240px] gap-8 px-6 py-6 max-lg:flex-col-reverse">
      <aside className="w-[288px] shrink-0 max-lg:w-full">
        <div className="px-2 pb-3">
          <Segmented options={[...MODES]} value={mode} onChange={setMode} label="表示" />
        </div>
        <h2 className="px-2 pb-1 text-[11px] font-semibold tracking-wide text-faint">
          罪名
        </h2>
        <div className="max-h-[50vh] overflow-y-auto lg:max-h-[calc(100dvh-14rem)]">
          <TypeList rows={rows} years={yearsAsc} selected={code} onSelect={setCode} />
        </div>
        <div className="mt-3 border-t border-rule px-2 pt-2">
          <p className="pb-1 text-[10.5px] text-faint">{year}年の起訴率</p>
          <ul className="flex flex-col gap-0.5 text-[11.5px]">
            {yearRank.map((r) => (
              <li key={r.code} className="flex justify-between gap-2 tnum">
                <span className={r.code === code ? "font-semibold" : "text-muted"}>
                  {r.label}
                </span>
                <span className="text-faint">{pct.format(r.rate * 100)}%</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex flex-wrap items-baseline justify-between gap-3 pb-4">
          <div className="flex items-baseline gap-3">
            <h1 className="text-[19px] font-semibold tracking-tight">{current.label}</h1>
            <p
              className={`tnum text-[13px] ${hoverYear === null ? "text-faint" : "text-ink"}`}
            >
              {hoverYear ?? Number(year)}年
            </p>
          </div>
          <YearSelect years={years} value={year} onChange={setYear} />
        </header>

        <div ref={ref} className="min-h-[280px]">
          {width > 0 && (
            <TrendStack
              panels={panels}
              domain={[TYPE_FROM, ERA_TO]}
              width={width}
              hoverYear={hoverYear}
              onHoverYear={setHoverYear}
            />
          )}
        </div>

        <p className="mt-5 border-t border-rule pt-3 text-[11px] leading-relaxed text-muted">
          総数は道交違反が厚い。刑法犯は白書の定義（自動車過失を除く）。傷害は暴行を含む大分類。
        </p>
      </main>
    </div>
  );
}
