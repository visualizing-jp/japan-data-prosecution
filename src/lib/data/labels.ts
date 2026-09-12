export const ERA_FROM = 1955;
export const ERA_TO = 2024;
export const TYPE_FROM = 2011;
export const GEO_YEAR = "2024";

export const METRICS = [
  { code: "accepted", label: "受理人員", kind: "persons", group: "規模" },
  { code: "indicted", label: "起訴人員", kind: "persons", group: "規模" },
  { code: "disposed", label: "終局処理人員", kind: "persons", group: "規模" },
  { code: "indictment_rate", label: "起訴率（総数）", kind: "rate", group: "率" },
  { code: "indictment_rate_penal", label: "起訴率（刑法犯）", kind: "rate", group: "率" },
  { code: "suspension_rate_penal", label: "起訴猶予率（刑法犯）", kind: "rate", group: "率" },
  { code: "trial", label: "公判請求人員", kind: "persons", group: "処理" },
  { code: "trial_rate", label: "公判請求率", kind: "rate", group: "処理" },
  { code: "summary", label: "略式命令請求", kind: "persons", group: "処理" },
  { code: "suspended", label: "起訴猶予", kind: "persons", group: "処理" },
] as const;

export const TYPE_CODES = [
  { code: "all", label: "総数", excel: "総数" },
  { code: "penal", label: "刑法犯", excel: "刑法犯" },
  { code: "traffic", label: "道路交通法等違反", excel: "道路交通法等違反" },
  { code: "special", label: "特別法犯（道交除く）", excel: "特別法犯（道路交通法等違反を除く。）" },
  { code: "theft", label: "窃盗", excel: "窃盗" },
  { code: "fraud", label: "詐欺", excel: "詐欺" },
  { code: "injury", label: "傷害", excel: "傷害" },
  { code: "negligence", label: "過失傷害", excel: "過失傷害" },
  { code: "murder", label: "殺人", excel: "殺人" },
  { code: "rape", label: "不同意性交等", excel: "不同意性交等" },
  { code: "indecent", label: "不同意わいせつ", excel: "不同意わいせつ" },
  { code: "stimulant", label: "覚醒剤取締法", excel: "覚醒剤取締法" },
] as const;

export const GEO_METRICS = [
  { code: "penal", label: "刑法犯（人口10万人当たり）", unit: "per100k" },
  { code: "theft", label: "窃盗（人口10万人当たり）", unit: "per100k" },
  { code: "injury", label: "傷害（人口10万人当たり）", unit: "per100k" },
  { code: "fraud", label: "詐欺（人口10万人当たり）", unit: "per100k" },
  { code: "murder", label: "殺人（人口10万人当たり）", unit: "per100k" },
  { code: "traffic", label: "道路交通法等違反（人口10万人当たり）", unit: "per100k" },
  { code: "suspension_rate", label: "起訴猶予率（刑法犯）", unit: "rate" },
] as const;
