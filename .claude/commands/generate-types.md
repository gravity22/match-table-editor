# /generate-types

Supabase のスキーマから TypeScript 型を再生成し、アプリ型定義と同期する。

## 手順

1. ローカル Supabase が起動しているか確認する:
   ```bash
   npx supabase status
   ```
   起動していない場合は `npx supabase start` を実行する (Docker が必要)。

2. 型を再生成する:
   ```bash
   npx supabase gen types typescript --local > src/types/database.types.ts
   ```

3. `src/types/database.types.ts` が更新されたら、`src/types/index.ts` を読み込み
   エイリアス型 (`Tournament`, `Team`, `MatchResult` 等) が `database.types.ts` の
   `Tables<'tournaments'>` 等と対応しているか確認する。ズレがあれば修正する。

4. 型エラーを確認する:
   ```bash
   npx tsc --noEmit
   ```
   エラーがあれば影響箇所を報告する。

## 注意

- `src/types/database.types.ts` は **手動編集禁止**。常にこのコマンドで再生成する。
- リモートDB のスキーマを使う場合は `--local` を `--project-id <id>` に変更する。