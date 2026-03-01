-- ============================================================
-- Seed data for local development
-- Run: npx supabase db reset  (applies migrations + this seed)
-- ============================================================

-- Auth users (local dev only; password = "password1234")
-- Uses pgcrypto's crypt() to hash passwords as Supabase Auth expects bcrypt.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token,
  email_change_token_new, email_change,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-0000-0000-000000000001',
    'authenticated', 'authenticated',
    'admin@local',
    crypt('password1234', gen_salt('bf')),
    now(),
    '', '',
    '', '',
    '{"provider":"email","providers":["email"]}', '{}',
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-0000-0000-000000000002',
    'authenticated', 'authenticated',
    'minato@local',
    crypt('password1234', gen_salt('bf')),
    now(),
    '', '',
    '', '',
    '{"provider":"email","providers":["email"]}', '{}',
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-0000-0000-000000000003',
    'authenticated', 'authenticated',
    'aoba@local',
    crypt('password1234', gen_salt('bf')),
    now(),
    '', '',
    '', '',
    '{"provider":"email","providers":["email"]}', '{}',
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-0000-0000-000000000004',
    'authenticated', 'authenticated',
    'viewer@local',
    crypt('password1234', gen_salt('bf')),
    now(),
    '', '',
    '', '',
    '{"provider":"email","providers":["email"]}', '{}',
    now(), now()
  )
ON CONFLICT (id) DO NOTHING;

-- GoTrue は varchar 列が NULL だとクラッシュするため、念のため全行を空文字に統一
UPDATE auth.users SET
  confirmation_token      = COALESCE(confirmation_token, ''),
  recovery_token          = COALESCE(recovery_token, ''),
  email_change_token_new  = COALESCE(email_change_token_new, ''),
  email_change            = COALESCE(email_change, '')
WHERE id IN (
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000004'
);

-- Also insert into auth.identities (required for email/password login)
INSERT INTO auth.identities (
  id, provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'admin@local',  'a0000000-0000-0000-0000-000000000001', '{"sub":"a0000000-0000-0000-0000-000000000001","email":"admin@local"}',  'email', now(), now(), now()),
  ('a0000000-0000-0000-0000-000000000002', 'minato@local', 'a0000000-0000-0000-0000-000000000002', '{"sub":"a0000000-0000-0000-0000-000000000002","email":"minato@local"}', 'email', now(), now(), now()),
  ('a0000000-0000-0000-0000-000000000003', 'aoba@local',   'a0000000-0000-0000-0000-000000000003', '{"sub":"a0000000-0000-0000-0000-000000000003","email":"aoba@local"}',   'email', now(), now(), now()),
  ('a0000000-0000-0000-0000-000000000004', 'viewer@local', 'a0000000-0000-0000-0000-000000000004', '{"sub":"a0000000-0000-0000-0000-000000000004","email":"viewer@local"}', 'email', now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- Test venues
INSERT INTO venues (id, name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'みなとフットサルコート'),
  ('00000000-0000-0000-0000-000000000002', 'あおば体育館')
ON CONFLICT DO NOTHING;

-- User roles (after venues due to FK)
INSERT INTO user_roles (user_id, role, venue_id) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'admin',         NULL),
  ('a0000000-0000-0000-0000-000000000002', 'venue_manager', '00000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000003', 'venue_manager', '00000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000004', 'viewer',        NULL)
ON CONFLICT DO NOTHING;

-- Test tournaments
INSERT INTO tournaments (id, venue_id, title, subtitle, date, time_range, schedule_start, schedule_interval) VALUES
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '【みなとフットサルコート！みなと駅すぐ！】',
    'エリア最大４４分プレー保証！ウルトラビギナー！',
    '2026年2月21日（土）',
    '13:00～15:00',
    '13:00',
    14
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    '【あおば体育館】',
    '春季フットサル大会',
    '2026年3月15日（日）',
    '10:00～12:00',
    '10:00',
    12
  )
ON CONFLICT DO NOTHING;

-- Teams for tournament 1
INSERT INTO teams (tournament_id, name, position) VALUES
  ('10000000-0000-0000-0000-000000000001', 'FC.アズール', 0),
  ('10000000-0000-0000-0000-000000000001', 'レアル・ミサキ', 1),
  ('10000000-0000-0000-0000-000000000001', 'チームひばり', 2),
  ('10000000-0000-0000-0000-000000000001', 'FCナミカゼ', 3)
ON CONFLICT DO NOTHING;

-- Teams for tournament 2
INSERT INTO teams (tournament_id, name, position) VALUES
  ('10000000-0000-0000-0000-000000000002', 'チームA', 0),
  ('10000000-0000-0000-0000-000000000002', 'チームB', 1),
  ('10000000-0000-0000-0000-000000000002', 'チームC', 2)
ON CONFLICT DO NOTHING;

-- Default rules for all test tournaments
UPDATE tournaments SET rules =
$$○全選手すねあて着用
○11分1本勝負
○不戦敗のスコアは０-３扱いとします
○ルール：フットサル競技規則に準ずる。
　但し、5ファール、カードの累積、タイムアウト無し。
　対人へのスライディングタックルはファウルを取らせて頂く場合があります。
　ご不明点は審判にお尋ね下さい
○貴重品などは、各チームで管理して下さい。
　紛失した場合は、当施設及び主催者は一切の責任を負いかねます。
○ガラス製の眼鏡等【危険を伴う装飾品】の着用は全面禁止となります。
○大会で利用するコート以外へは立入禁止
○コート外でのボールの使用は禁止
　（コート防護ネットの外側、駐車場等では禁止）
○表彰：優勝⇒次回2,000円割引クーポン贈呈$$;

-- Sample scores for tournament 1
INSERT INTO match_results (tournament_id, team_a_idx, team_b_idx, score_a, score_b) VALUES
  ('10000000-0000-0000-0000-000000000001', 0, 1, 3, 1),
  ('10000000-0000-0000-0000-000000000001', 2, 3, 0, 2),
  ('10000000-0000-0000-0000-000000000001', 0, 2, 2, 2),
  ('10000000-0000-0000-0000-000000000001', 1, 3, 1, 0)
ON CONFLICT DO NOTHING;
