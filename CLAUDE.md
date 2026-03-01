# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 目標アーキテクチャ

| レイヤー | 技術選定 | 無料枠 |
|---|---|---|
| Frontend + API Routes | Next.js 14 (App Router, TypeScript) | Vercel (100GB帯域) |
| Database + Auth + RLS | Supabase | 500MB DB / 50k MAU |
| Styling | Tailwind CSS + shadcn/ui | — |
| PDF出力 | ブラウザ印刷 (`@media print`) | — |

> **現状**: `docs/index.html` はゼロ依存の単一HTMLファイル。GitHub Pages でも引き続き動作する。移行完了まで維持する。

## 開発コマンド

```bash
npm run dev          # Next.js 開発サーバー起動
npm run build        # プロダクションビルド
npm run lint         # ESLint
npm run test         # Vitest (単体テスト)

npx supabase start   # ローカルSupabase起動 (Docker必須)
npx supabase db push # マイグレーションをリモートに適用
npx supabase db reset               # ローカルDBリセット + seed.sql 実行
npx supabase gen types typescript --local > src/types/database.types.ts
```

## プロジェクト構造

```
src/
├── app/                        # Next.js App Router
│   ├── (auth)/login/           # ログインページ
│   ├── tournaments/            # 一覧 + 新規作成
│   │   └── [id]/               # 閲覧 + 編集
│   ├── admin/                  # ユーザー・会場管理 (admin のみ)
│   └── middleware.ts           # Auth リダイレクト + ロール強制
├── components/
│   ├── document/               # 印刷共有コンポーネント (閲覧・印刷共通)
│   │   ├── TournamentDocument.tsx
│   │   ├── RoundRobinTable.tsx
│   │   └── Timetable.tsx
│   ├── editor/                 # スコア・チーム・イベント編集UI
│   └── ui/                     # shadcn/ui コンポーネント
├── lib/
│   ├── supabase/               # client.ts (ブラウザ) / server.ts (RSC・Server Actions) / middleware.ts
│   ├── schedule.ts             # サークル法スケジュール生成 (docs/index.html から移植)
│   ├── standings.ts            # 順位計算 (docs/index.html から移植)
│   └── permissions.ts          # canEdit(user, tournament) ヘルパー
└── types/
    ├── database.types.ts       # Supabase CLI 自動生成 — 手動編集禁止
    └── index.ts                # アプリ固有の型定義
supabase/
├── migrations/                 # Supabase CLI が順番に適用するSQLファイル
└── seed.sql                    # テスト用初期データ
```

## データモデル

```sql
venues        (id, name, manager_id → auth.users)
user_roles    (user_id → auth.users, role: 'admin'|'venue_manager'|'viewer', venue_id nullable)
tournaments   (id, venue_id → venues, title, subtitle, date, time_range,
               schedule_start, schedule_interval, created_by → auth.users)
teams         (id, tournament_id, name, position)
match_results (tournament_id, team_a_idx, team_b_idx, score_a, score_b,
               UNIQUE(tournament_id, team_a_idx, team_b_idx))
```

`match_results` は常に `team_a_idx < team_b_idx` で格納する。`score_a` = インデックスが小さいチームの得点。

## アクセス制御 — 3層構造

**3層すべてを常に一致させること。RLS が最終防衛ライン。**

| 層 | 場所 | 役割 |
|---|---|---|
| **Supabase RLS** | `supabase/migrations/` の POLICY 定義 | DB レベルの強制 (バイパス不可) |
| **Next.js Middleware** | `src/app/middleware.ts` | 未認証ユーザーを編集ルートからリダイレクト |
| **UI** | `src/lib/permissions.ts` の `canEdit()` | 編集ボタン・フォームの表示制御 |

ロール別権限:
- `admin`: すべての対戦表を編集可能
- `venue_manager`: `user_roles.venue_id` と一致する会場の対戦表のみ編集可能
- `viewer` / 未ログイン: 閲覧のみ

新しいテーブルを追加する際は、必ず同じマイグレーションファイル内に SELECT / INSERT / UPDATE / DELETE の RLS ポリシーを追加する。

## レスポンシブ対応

- **PC (≥768px)**: 2カラム — 左にサイドバーエディタ、右にA4ドキュメントプレビュー
- **スマホ (<768px)**: タブ切り替え — 「設定」「プレビュー」「印刷」の3タブ
- スコア入力セルのタップターゲットは最小 44px を確保する
- `<TournamentDocument>` コンポーネントは Web表示と印刷で共用する

## PDF 出力

ブラウザ印刷 (`window.print()`) + `@media print` CSS のみ使用。サーバーサイドPDF生成は不要。
`@page { size: A4 portrait; margin: 0; }` でサイズを固定。iOS / Android のシェアシートからも「PDFに保存」が使える。

## アルゴリズム (docs/index.html から移植)

**スケジュール生成** (`src/lib/schedule.ts`):
サークル法。チーム0を固定し、残りを毎ラウンド左ローテーション。奇数チームはダミーバイ (-1) を末尾追加してフィルタ除外。C(N,2) 試合を連続出場が最小になる順で生成。

**順位計算** (`src/lib/standings.ts`):
`i < j` のペアのみ処理してダブルカウントを防ぐ。両スコアが非null のときのみ試合成立と見なす。ソート順: 勝点 → 得失点差 → 総得点 → 元インデックス。
