/**
 * 指標カテゴリのヘルパ。
 */

import type { DictEntry } from "./cube.ts";

export function listMetrics(items: DictEntry[]): DictEntry[] {
  return items;
}

export function geoMetrics(items: DictEntry[]): DictEntry[] {
  return items.filter((m) => m.code !== "00000");
}
