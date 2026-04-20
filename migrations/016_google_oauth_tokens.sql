-- 016: tabela de tokens OAuth Google per-user (D-01) + triggered_by_user_id em tc_jobs (D-01/D-02)
SET search_path TO dashboards_hub;

CREATE TABLE IF NOT EXISTS google_oauth_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_enc TEXT NOT NULL,
  access_token TEXT NULL,
  expires_at TIMESTAMPTZ NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ NULL,
  revoked_at TIMESTAMPTZ NULL,
  error_message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_google_oauth_tokens_revoked
  ON google_oauth_tokens(revoked_at)
  WHERE revoked_at IS NULL;

-- tc_jobs.triggered_by_user_id: nullable pois jobs legados e scheduled jobs (futuro D-02) podem nao ter
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='dashboards_hub' AND table_name='tc_jobs') THEN
    ALTER TABLE tc_jobs
      ADD COLUMN IF NOT EXISTS triggered_by_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_tc_jobs_triggered_by_user_id ON tc_jobs(triggered_by_user_id);
  END IF;
END$$;
