-- Migration 015: Sistema de Alertas do Torre de Controle (Google Chat + auto-analise)
-- Ver spec: docs/superpowers/specs/2026-04-18-torre-controle-sistema-alertas-design.md
-- 3 tabelas: tc_alert_channels, tc_alert_configs, tc_alert_dispatch_log
-- Todas idempotentes (IF NOT EXISTS). Schema: dashboards_hub.

------------------------------------------------------------------------
-- 1. tc_alert_channels
--    Canais configurados (Google Chat spaces, futuramente Slack/email).
------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dashboards_hub.tc_alert_channels (
  id            SERIAL PRIMARY KEY,
  provider      VARCHAR(20) NOT NULL DEFAULT 'google_chat',
  space_name    VARCHAR(200) NOT NULL,
  display_name  VARCHAR(200),
  created_by    INTEGER REFERENCES dashboards_hub.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_alert_channel UNIQUE (provider, space_name)
);

------------------------------------------------------------------------
-- 2. tc_alert_configs
--    1 linha por tipo de alerta. Toggle on/off, canal, rate limit, template.
------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dashboards_hub.tc_alert_configs (
  alert_type           VARCHAR(80) PRIMARY KEY,
  enabled              BOOLEAN NOT NULL DEFAULT false,
  channel_id           INTEGER REFERENCES dashboards_hub.tc_alert_channels(id) ON DELETE SET NULL,
  rate_limit_per_hour  INTEGER NOT NULL DEFAULT 10,
  message_template     TEXT,
  notes                TEXT,
  updated_by           INTEGER REFERENCES dashboards_hub.users(id) ON DELETE SET NULL,
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Seed dos tipos iniciais (desabilitados por padrao; admin ativa via UI)
INSERT INTO dashboards_hub.tc_alert_configs (alert_type, enabled, rate_limit_per_hour, message_template, notes)
VALUES
  (
    'analysis.bad_quality',
    false,
    10,
    E'🚨 *Analise com qualidade insuficiente*\n\n*Cliente:* {{empresa}}\n*Lead:* #{{lead_id}} · *Fase:* {{fase_nome}}\n*Responsavel:* {{owner_name}}\n\n*Motivo:* {{motivo_curto}}\n*Materiais faltantes:* {{lista_materiais}}\n\n🔗 {{kommo_url}}\n_Gerado em {{timestamp_br}}_',
    'Disparado quando uma analise IA e gerada com status_avaliacao=incompleta OU faltando materiais criticos (slides/miro/figma em F3/F5).'
  ),
  (
    'lead.stage_regressed',
    false,
    20,
    E'↩️ *Lead regrediu de fase*\n\n*Cliente:* {{empresa}}\n*Lead:* #{{lead_id}}\n*De:* {{fase_anterior}} → *Para:* {{fase_nova}}\n\n🔗 {{kommo_url}}',
    'Somente log por padrao. Se habilitado, envia mensagem ao canal configurado.'
  ),
  (
    'analysis.skipped_no_transcription',
    false,
    20,
    E'⚠️ *Analise pulada - sem transcricao*\n\n*Cliente:* {{empresa}}\n*Lead:* #{{lead_id}} · *Fase:* {{fase_nome}}\n\nLead avancou mas nao possui transcricao. Analise nao foi enfileirada.\n\n🔗 {{kommo_url}}',
    'Disparado quando lead avanca de fase mas falta transcricao (material obrigatorio).'
  )
ON CONFLICT (alert_type) DO NOTHING;

------------------------------------------------------------------------
-- 3. tc_alert_dispatch_log
--    Log completo de todas as tentativas. Coracao da dedup (fingerprint UNIQUE).
------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dashboards_hub.tc_alert_dispatch_log (
  id           BIGSERIAL PRIMARY KEY,
  alert_type   VARCHAR(80) NOT NULL,
  fingerprint  VARCHAR(64) NOT NULL,
  payload      JSONB,
  status       VARCHAR(20) NOT NULL,
  attempts     INTEGER NOT NULL DEFAULT 0,
  last_error   TEXT,
  channel_id   INTEGER REFERENCES dashboards_hub.tc_alert_channels(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  CONSTRAINT uq_alert_dispatch_fingerprint UNIQUE (fingerprint),
  CONSTRAINT ck_alert_dispatch_status CHECK (
    status IN ('pending', 'delivered', 'failed', 'skipped', 'rate_limited')
  )
);

CREATE INDEX IF NOT EXISTS idx_tc_alert_dispatch_type_created
  ON dashboards_hub.tc_alert_dispatch_log (alert_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tc_alert_dispatch_status_created
  ON dashboards_hub.tc_alert_dispatch_log (status, created_at DESC);

-- Comentarios para documentacao inline
COMMENT ON TABLE  dashboards_hub.tc_alert_channels      IS 'Canais Google Chat (ou futuros providers) cadastrados pelo admin';
COMMENT ON TABLE  dashboards_hub.tc_alert_configs       IS 'Configuracao por tipo de alerta: toggle, canal, rate limit, template';
COMMENT ON TABLE  dashboards_hub.tc_alert_dispatch_log  IS 'Log de todas as tentativas de envio. fingerprint UNIQUE garante idempotencia';
COMMENT ON COLUMN dashboards_hub.tc_alert_dispatch_log.fingerprint IS 'sha256(alert_type|lead_id|fase_id|analise_id) — mesma combinacao nunca dispara 2x';
