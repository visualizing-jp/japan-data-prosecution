# 日本では捕まえた人をどれだけ起訴してきたか

法務省「検察統計」と「犯罪白書」をもとに、起訴・不起訴・起訴猶予を探索するダッシュボード。

`crime`（警察の認知・検挙）の姉妹。visualizing.jp スタンドアロン（dataviz.jp サブスクツールではない）。

想定URL: https://japan-data-prosecution.visualizing.jp

## ビュー

| ビュー | 内容 |
| --- | --- |
| 時代 | 受理・終局処理・起訴率・起訴猶予率の長期推移 |
| 罪名 | 罪名別の起訴・不起訴・起訴率 |
| 地域 | 地検管内別の人口当たり受理と起訴猶予率 |

## 開発

```bash
npm install
npm run fetch && npm run data && npm run verify
npm run dev
```

Excel は `data/raw/` に置く（git 管理外）。配信用 JSON は `public/data/` を追跡する。API キーは不要。

| スクリプト | 内容 |
| --- | --- |
| `npm run fetch` | 年報・白書の Excel 取得 |
| `npm run data` | 配信用 cube 構築（Python / openpyxl） |
| `npm run verify` | 健全性チェック |
| `npm run dev` | Vite 開発サーバ（5291） |
| `npm run build` | 本番ビルド |
| `npm run typecheck` | TypeScript 検査 |

データ設計の正本は [`docs/data-sources.md`](docs/data-sources.md)。

## GitHub Pages / DNS

- `.github/workflows/pages.yml` で Pages にデプロイする。
- カスタムドメイン `japan-data-prosecution.visualizing.jp` は、Pages 設定と visualizing.jp 側 DNS（既存シリーズと同じ運用）で登録する。
