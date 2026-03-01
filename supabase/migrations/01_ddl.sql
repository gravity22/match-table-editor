-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "moddatetime";

-- ============================================================
-- Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS venues (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  manager_id  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id    UUID  PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT  NOT NULL CHECK (role IN ('admin', 'venue_manager', 'viewer')),
  venue_id   UUID  REFERENCES venues(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tournaments (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id          UUID        REFERENCES venues(id) ON DELETE SET NULL,
  title             TEXT        NOT NULL DEFAULT '',
  subtitle          TEXT        NOT NULL DEFAULT '',
  location          TEXT        NOT NULL DEFAULT '',
  date              TEXT        NOT NULL DEFAULT '',
  time_range        TEXT        NOT NULL DEFAULT '',
  schedule_start    TEXT        NOT NULL DEFAULT '13:00',
  schedule_interval INTEGER     NOT NULL DEFAULT 14,
  rules             TEXT        NOT NULL DEFAULT '',
  created_by        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teams (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id  UUID        NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name           TEXT        NOT NULL,
  position       INTEGER     NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS match_results (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id  UUID        NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_a_idx     INTEGER     NOT NULL,
  team_b_idx     INTEGER     NOT NULL,
  game_number    SMALLINT    NOT NULL DEFAULT 1,
  score_a        INTEGER,
  score_b        INTEGER,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT match_results_unique UNIQUE (tournament_id, team_a_idx, team_b_idx, game_number),
  CHECK (team_a_idx < team_b_idx)
);

-- ============================================================
-- Updated_at triggers
-- ============================================================

CREATE TRIGGER set_updated_at_venues
  BEFORE UPDATE ON venues
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

CREATE TRIGGER set_updated_at_tournaments
  BEFORE UPDATE ON tournaments
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

CREATE TRIGGER set_updated_at_match_results
  BEFORE UPDATE ON match_results
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE venues        ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams         ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;

-- Helper function: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function: get current user's managed venue_id
CREATE OR REPLACE FUNCTION my_venue_id()
RETURNS UUID AS $$
  SELECT venue_id FROM user_roles
  WHERE user_id = auth.uid() AND role = 'venue_manager'
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- ---- venues ----
CREATE POLICY "venues_select_all"   ON venues FOR SELECT USING (true);
CREATE POLICY "venues_all_admin"    ON venues FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- ---- user_roles ----
CREATE POLICY "user_roles_select"    ON user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_roles_all_admin" ON user_roles FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- ---- tournaments ----
CREATE POLICY "tournaments_select"       ON tournaments FOR SELECT USING (true);
CREATE POLICY "tournaments_all_admin"    ON tournaments FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "tournaments_write_manager" ON tournaments FOR ALL TO authenticated
  USING (venue_id = my_venue_id() AND my_venue_id() IS NOT NULL)
  WITH CHECK (venue_id = my_venue_id() AND my_venue_id() IS NOT NULL);

-- ---- teams ----
CREATE POLICY "teams_select" ON teams FOR SELECT USING (true);
CREATE POLICY "teams_all_admin" ON teams FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "teams_write_manager" ON teams FOR ALL TO authenticated
  USING (
    tournament_id IN (
      SELECT id FROM tournaments WHERE venue_id = my_venue_id() AND my_venue_id() IS NOT NULL
    )
  )
  WITH CHECK (
    tournament_id IN (
      SELECT id FROM tournaments WHERE venue_id = my_venue_id() AND my_venue_id() IS NOT NULL
    )
  );

-- ---- match_results ----
CREATE POLICY "match_results_select" ON match_results FOR SELECT USING (true);
CREATE POLICY "match_results_all_admin" ON match_results FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "match_results_write_manager" ON match_results FOR ALL TO authenticated
  USING (
    tournament_id IN (
      SELECT id FROM tournaments WHERE venue_id = my_venue_id() AND my_venue_id() IS NOT NULL
    )
  )
  WITH CHECK (
    tournament_id IN (
      SELECT id FROM tournaments WHERE venue_id = my_venue_id() AND my_venue_id() IS NOT NULL
    )
  );

-- ============================================================
-- Restrict rules field to admin only
-- ============================================================

CREATE OR REPLACE FUNCTION restrict_rules_to_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF current_user <> 'postgres' AND NOT is_admin() AND NEW.rules IS DISTINCT FROM OLD.rules THEN
    RAISE EXCEPTION 'Only admins can modify tournament rules'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_rules_admin_only
  BEFORE UPDATE ON tournaments
  FOR EACH ROW EXECUTE FUNCTION restrict_rules_to_admin();
