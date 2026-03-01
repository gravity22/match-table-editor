# /check-rls

アクセス制御の3層 (RLS / Middleware / UI) の整合性を監査する。

**引数**: 監査対象のテーブル名・機能名・ルートパスのいずれか (`$ARGUMENTS`)
引数を省略した場合はプロジェクト全体を監査する。

## 手順

1. **RLS層を確認** (`supabase/migrations/` を読む):
   - 対象テーブルに `ENABLE ROW LEVEL SECURITY` が設定されているか
   - SELECT / INSERT / UPDATE / DELETE の各操作に対してポリシーが存在するか
   - `admin` ロールは全操作を許可されているか
   - `venue_manager` は自分の `venue_id` に紐づくデータのみ操作できるか
   - `viewer` と未認証ユーザーは SELECT のみか

2. **Middleware層を確認** (`src/app/middleware.ts` を読む):
   - `/tournaments/[id]/edit` 等の編集ルートで認証チェックをしているか
   - `/admin/` 配下で `admin` ロールチェックをしているか
   - 未認証の場合は `/login` にリダイレクトされるか

3. **UI層を確認** (`src/lib/permissions.ts` と各コンポーネントを読む):
   - `canEdit(user, tournament)` ヘルパーが各編集ボタン・フォームで使われているか
   - `viewer` に編集UIが見えていないか
   - `venue_manager` が他会場の編集ボタンを見えないようにしているか

4. **監査レポートを出力**:
   ```
   ✅ RLS: tournaments SELECT — OK
   ✅ RLS: tournaments UPDATE (admin) — OK
   ❌ RLS: tournaments UPDATE (venue_manager) — ポリシーが存在しない
   ✅ Middleware: /tournaments/[id]/edit — 認証チェックあり
   ⚠️  UI: TournamentCard — canEdit() を使わず常に編集ボタンを表示している
   ```

5. 不足しているポリシーや修正が必要なコードを具体的に提示する。
   SQL修正案は `supabase/migrations/` への追加ファイルとして提示し、既存ファイルは変更しない。