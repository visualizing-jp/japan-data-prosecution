/**
 * 配信データの取得。
 */

import { CubeView, type CubeJson, type DictEntry } from "./cube.ts";

export interface EraData {
  metrics: DictEntry[];
  cube: CubeView;
  years: number[];
}

export interface TypeData {
  codes: DictEntry[];
  cube: CubeView;
  years: string[];
}

export interface GeoData {
  metrics: DictEntry[];
  areas: DictEntry[];
  cube: CubeView;
  years: string[];
}

const cache = new Map<string, Promise<unknown>>();

function chunk<Raw, T>(name: string, transform: (raw: Raw) => T): Promise<T> {
  const hit = cache.get(name);
  if (hit !== undefined) return hit as Promise<T>;
  const promise = fetch(`${import.meta.env.BASE_URL}data/${name}.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`${name}.json の取得に失敗しました (${r.status})`);
      return r.json() as Promise<Raw>;
    })
    .then(transform);
  cache.set(name, promise);
  return promise;
}

export function loadEra(): Promise<EraData> {
  return chunk<CubeJson & { metrics: DictEntry[] }, EraData>("era", (raw) => ({
    metrics: raw.metrics,
    cube: new CubeView(raw),
    years: raw.dims.find((d) => d.name === "year")!.codes.map(Number),
  }));
}

export function loadType(): Promise<TypeData> {
  return chunk<CubeJson & { codes: DictEntry[] }, TypeData>("type", (raw) => ({
    codes: raw.codes,
    cube: new CubeView(raw),
    years: [...raw.dims.find((d) => d.name === "year")!.codes].reverse(),
  }));
}

export function loadGeo(): Promise<GeoData> {
  return chunk<CubeJson & { metrics: DictEntry[]; areas: DictEntry[] }, GeoData>(
    "geo",
    (raw) => ({
      metrics: raw.metrics,
      areas: raw.areas,
      cube: new CubeView(raw),
      years: [...raw.dims.find((d) => d.name === "year")!.codes].reverse(),
    }),
  );
}
