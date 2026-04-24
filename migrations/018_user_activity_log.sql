-- Migration 018: Log de atividade de usuarios (acessos, navegacao, eventos).
-- Schema: dashboards_hub. Alimentado por INSERT batch assincrono (activity-logger service).
-- Retencao sugerida: 90 dias (limpeza por cron posterior se necessario).

CREATE TABLE IF NOT EXISTS dashboards_hub.user_activity_log (
  id              BIGSERIAL PRIMARY KEY,
  user_id         INTEGER REFERENCES dashboards_hub.users(id) ON DELETE CASCADE,
  user_email      VARCHAR(255),
  event_type      VARCHAR(32) NOT NULL,
  path            VARCHAR(500),
  dashboard_id    VARCHAR(100),
  login_method    VARCHAR(20),
  ip_address      VARCHAR(64),
  user_agent      TEXT,
  duration_ms     INTEGER,
  meta            JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_user_activity_event CHECK (
    event_type IN ('login', 'logout', 'login_failed', 'page_view', 'page_leave', 'session_check', 'password_change')
  )
);

CREATE INDEX IF NOT EXISTS idx_user_activity_user_created
  ON dashboards_hub.user_activity_log (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_activity_created
  ON dashboards_hub.user_activity_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_activity_event_created
  ON dashboards_hub.user_activity_log (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_activity_dashboard_created
  ON dashboards_hub.user_activity_log (dashboard_id, created_at DESC)
  WHERE dashboard_id IS NOT NULL;

COMMENT ON TABLE  dashboards_hub.user_activity_log IS 'Eventos de atividade dos usuarios (login, navegacao). INSERTs em batch via servico activity-logger.';
COMMENT ON COLUMN dashboards_hub.user_activity_log.event_type IS 'login | logout | login_failed | page_view | page_leave | session_check | password_change';
COMMENT ON COLUMN dashboards_hub.user_activity_log.duration_ms IS 'Tempo gasto na pagina (usado em page_leave) ou duracao de sessao (em logout)';
COMMENT ON COLUMN dashboards_hub.user_activity_log.meta IS 'Payload extra JSONB: referrer, to_path, error, etc.';
