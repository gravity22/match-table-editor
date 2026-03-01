# /new-migration

新しい Supabase マイグレーションファイルを作成する。

**引数**: マイグレーションの内容を日本語または英語で説明する (`$ARGUMENTS`)

## 手順

1. `supabase/migrations/` 内の最新ファイルを読み込み、既存スキーマとポリシーのパターンを把握する

2. タイムスタンプ付きファイル名でマイグレーションを作成する:
   ```
   supabase/migrations/$(date -u +%Y%m%d%H%M%S)_<slug>.sql
   ```
   slug は引数を snake_case に変換したもの (例: `add_venue_logo`)

3. SQL の記述ルール:
   - テーブル作成は `CREATE TABLE IF NOT EXISTS`
   - カラム追加は `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
   - 削除系は必ずコメントで理由を記載
   - `updated_at` カラムがあるテーブルには自動更新トリガーを追加:
     ```sql
     CREATE TRIGGER set_updated_at
       BEFORE UPDATE ON <table>
       FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
     ```

4. **新テーブルには必ず同ファイル内に RLS ポリシーを追加する**:
   ```sql
   ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;

   -- 全認証ユーザーが閲覧可能
   CREATE POLICY "select_authenticated" ON <table>
     FOR SELECT TO authenticated USING (true);

   -- admin は全操作可能
   CREATE POLICY "all_admin" ON <table>
     FOR ALL TO authenticated
     USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
     WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

   -- venue_manager は自分の会場のデータのみ操作可能 (tournaments テーブルの場合の例)
   CREATE POLICY "write_venue_manager" ON tournaments
     FOR ALL TO authenticated
     USING (
       venue_id IN (
         SELECT venue_id FROM user_roles
         WHERE user_id = auth.uid() AND role = 'venue_manager'
       )
     )
     WITH CHECK (
       venue_id IN (
         SELECT venue_id FROM user_roles
         WHERE user_id = auth.uid() AND role = 'venue_manager'
       )
     );
   ```

5. マイグレーション作成後、型を再生成する:
   ```bash
   npx supabase gen types typescript --local > src/types/database.types.ts
   ```

6. スキーマ変更が `src/types/index.ts` の型定義に影響する場合は合わせて更新する