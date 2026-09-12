/**
 * 地域ビュー。地検管内の人口当たり受理と起訴猶予率。
 * 地検は都道府県と一致しないため、地図ではなく全国比の順位で出す。
 */

import { use, useMemo } from "react";
import { loadGeo } from "../data/chunks.ts";
import { TypePicker, type PickerRow } from "../components/TypePicker.tsx";
import { YearSelect } from "../components/YearSelect.tsx";
import { useUrlState } from "../hooks/useUrlState.ts";
import { GEO_METRICS } from "../../lib/data/labels.ts";

const RATE_CODES = new Set(["suspension_rate"]);

const one = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const pct = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const rateFmt = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function formatValue(metric: string, value: number | null): string {
  if (value === null) return "データなし";
  if (RATE_CODES.has(metric)) return `${pct.format(value * 100)}%`;
  return `${rateFmt.format(value)}`;
}

export function GeoView() {
  const { metrics, areas, cube, years } = use(loadGeo());
  const selectable = useMemo(
    () => metrics.filter((m) => GEO_METRICS.some((g) => g.code === m.code)),
    [metrics],
  );

  const [year, setYear] = useUrlState("year", years[0]!, (v) => years.includes(v));
  const [metric, setUrlMetric] = useUrlState<string>("metric", "penal", (v) =>
    selectable.some((c) => c.code === v),
  );
  const [office, setOffice] = useUrlState<string>("office", "", (v) =>
    v === "" || areas.some((a) => a.code === v && a.code !== "00000"),
  );

  const offices = useMemo(() => areas.filter((a) => a.code !== "00000"), [areas]);
  const currentMeta = selectable.find((m) => m.code === metric) ?? selectable[0]!;

  const national = cube.at("value", { metric, year, area: "00000" });

  const picker = useMemo((): PickerRow[] => {
    return selectable.map((m) => {
      const v = cube.at("value", { metric: m.code, year, area: "00000" });
      const magnitude =
        v === null ? 0 : RATE_CODES.has(m.code) ? Math.round(v * 10000) : Math.round(v * 10);
      return {
        code: m.code,
        label: m.label,
        households: magnitude,
        display: formatValue(m.code, v),
      };
    });
  }, [selectable, cube, year]);

  const ranked = useMemo(() => {
    return offices
      .map((a) => {
        const value = cube.at("value", { metric, year, area: a.code });
        const relative = cube.at("relative", { metric, year, area: a.code });
        return { ...a, value, relative };
      })
      .filter((a) => a.relative !== null && a.value !== null)
      .sort((a, b) => (b.relative ?? 0) - (a.relative ?? 0));
  }, [offices, cube, metric, year]);

  const maxRel = Math.max(...ranked.map((r) => r.relative ?? 0), 1);
  const selected = ranked.find((r) => r.code === office);

  return (
    <div className="mx-auto flex w-full max-w-[1240px] gap-8 px-6 py-6 max-lg:flex-col-reverse">
      <aside className="w-[300px] shrink-0 max-lg:w-full lg:sticky lg:top-6 lg:flex lg:max-h-[calc(100dvh-3rem)] lg:flex-col lg:self-start">
        <h2 className="flex items-baseline justify-between px-2 pb-1 text-[11px] font-semibold tracking-wide text-faint">
          <span>指標</span>
          <span className="font-normal">全国</span>
        </h2>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <TypePicker rows={picker} selected={metric} onSelect={setUrlMetric} />
        </div>
        <p className="mt-2 border-t border-rule px-2 pt-2 text-[10.5px] leading-relaxed text-faint">
          棒の長さは全国比。地検管内は都道府県と一致しない。
        </p>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex flex-wrap items-baseline justify-between gap-3 pb-4">
          <div className="flex min-w-0 items-baseline gap-3">
            <h1 className="truncate text-[19px] font-semibold tracking-tight">
              {currentMeta.label}
            </h1>
            <p className="tnum shrink-0 text-[13px] text-muted">
              全国 {formatValue(metric, national)}
            </p>
          </div>
          <YearSelect years={years} value={year} onChange={setYear} />
        </header>

        <p className="tnum min-h-9 pb-4 text-[12.5px]">
          {selected !== undefined ? (
            <>
              <span className="font-semibold">{selected.label}</span>
              <span className="text-muted">
                {` ${formatValue(metric, selected.value)}`}
                {selected.relative === null
                  ? ""
                  : ` · 全国の${one.format(selected.relative)}倍`}
              </span>
            </>
          ) : ranked.length >= 2 ? (
            <span className="text-muted">
              最も高い{" "}
              <span className="font-semibold text-ink">
                {ranked[0]!.label} {one.format(ranked[0]!.relative ?? 0)}
              </span>
              {"  ／  最も低い "}
              <span className="font-semibold text-ink">
                {ranked.at(-1)!.label} {one.format(ranked.at(-1)!.relative ?? 0)}
              </span>
            </span>
          ) : (
            <span className="text-muted">地検管内の全国比。</span>
          )}
        </p>

        <ul className="flex flex-col">
          {ranked.map((row, i) => {
            const isSelected = row.code === office;
            const widthPct = ((row.relative ?? 0) / maxRel) * 100;
            return (
              <li key={row.code}>
                <button
                  type="button"
                  onClick={() => setOffice(isSelected ? "" : row.code)}
                  aria-pressed={isSelected}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded px-2 py-[5px] text-left transition-[background-color,transform] duration-150 ease-out active:scale-[0.97] ${
                    isSelected ? "bg-ink/[0.06]" : "hover:bg-ink/[0.03]"
                  }`}
                >
                  <span className="tnum w-6 shrink-0 text-[11px] text-faint">{i + 1}</span>
                  <span
                    className={`w-[4.5rem] shrink-0 truncate text-[12px] ${
                      isSelected ? "font-semibold text-ink" : "text-muted"
                    }`}
                  >
                    {row.label}
                  </span>
                  <span className="h-[9px] min-w-0 flex-1 bg-ink/[0.05]">
                    <span
                      className={`block h-full ${isSelected ? "bg-accent" : "bg-accent/45"}`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </span>
                  <span
                    className={`tnum w-[7.5rem] shrink-0 text-right text-[11px] ${
                      isSelected ? "text-ink" : "text-faint"
                    }`}
                  >
                    {formatValue(metric, row.value)}
                    {row.relative === null ? "" : ` · ${one.format(row.relative)}`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <p className="mt-5 border-t border-rule pt-3 text-[11px] leading-relaxed text-muted">
          数値は地検管内の指標値。右端は全国を1とした相対値。起訴猶予率は刑法犯の起訴と起訴猶予から算出（道交を除く）。
        </p>
      </main>
    </div>
  );
}
