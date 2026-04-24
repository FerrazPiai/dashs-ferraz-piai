-- Migration 016: Kill-switch global de alertas movido do .env para DB (singleton).
-- Admin controla via UI; dispatcher cacheia 10s para nao pesar em SELECTs.

CREATE TABLE IF NOT EXISTS dashboards_hub.tc_alert_global_config (
  id         INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled    BOOLEAN NOT NULL DEFAULT false,
  updated_by INTEGER REFERENCES dashboards_hub.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO dashboards_hub.tc_alert_global_config (id, enabled)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE dashboards_hub.tc_alert_global_config IS
  'Kill-switch global de alertas. Singleton (id=1). Substitui env var ALERTS_ENABLED.';
