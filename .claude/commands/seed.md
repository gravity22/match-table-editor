# /seed

ローカル開発用のテストデータをDBに投入する。

**引数**: 省略可。`reset` を渡すと既存データを削除してから投入する (`$ARGUMENTS`)

## 投入するデータ

| ユーザーID | ロール | 会場 |
|---|---|---|
| admin | admin | (全会場) |
| minato | venue_manager | みなとフットサルコート |
| aoba | venue_manager | あおば体育館 |
| viewer | viewer | — |

パスワードはすべて `password1234` (ローカル開発専用)。

ログイン画面では「ユーザーID」欄にこれらの値を入力する。
内部的には Supabase Auth のメール形式に変換される (`admin` → `admin@local` など)。

各会場に対戦表を1件ずつ作成し、4チームのサンプルデータとスコアを入れる。

## 手順

1. `$ARGUMENTS` に `reset` が含まれる場合:
   ```bash
   npx supabase db reset
   ```
   これでマイグレーションが再適用され、`supabase/seed.sql` が自動実行される。

2. DBリセット後は Auth ユーザーも消えるため、以下のコマンドで再作成する:
   ```bash
   ANON_KEY=$(npx supabase status 2>/dev/null | grep 'service_role key' | awk '{print $NF}')
   # または .env.local の SUPABASE_SERVICE_ROLE_KEY を使用
   source .env.local

   for USER in "admin" "minato" "aoba" "viewer"; do
     curl -s -X POST http://127.0.0.1:54321/auth/v1/admin/users \
       -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
       -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
       -H "Content-Type: application/json" \
       -d "{\"email\":\"${USER}@local\",\"password\":\"password1234\",\"email_confirm\":true}" | jq -r '.id'
   done
   ```
   取得したUUIDを `user_roles` テーブルに登録する (Supabase Studio の Table Editor を使うと簡単)。

3. `reset` なしの場合は `supabase/seed.sql` の内容を確認し、
   `npx supabase db execute --file supabase/seed.sql` で追記投入する。

4. 投入後、各ユーザーでログインして権限が正しく動作することを確認する手順を表示する:
   - `admin` — 全対戦表の編集ボタンが表示される
   - `minato` — みなとフットサルコートの対戦表のみ編集可能
   - `viewer` — 編集ボタンが非表示

## seed.sql の場所

`supabase/seed.sql` を直接編集してテストデータを追加・修正する。
`supabase/migrations/` には投入しないこと (本番DBに適用されてしまう)。