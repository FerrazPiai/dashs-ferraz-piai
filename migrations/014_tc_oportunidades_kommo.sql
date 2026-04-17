-- Migration 014: Rastreia oportunidades enviadas para o Kommo a partir da
-- Analise Consolidada (pipeline Expansao 12184212).

CREATE TABLE IF NOT EXISTS dashboards_hub.tc_oportunidades_kommo (
  id              SERIAL PRIMARY KEY,
  analise_id      INTEGER REFERENCES dashboards_hub.tc_analises_ia(id) ON DELETE SET NULL,
  lead_origem_id  BIGINT,
  kommo_lead_id   BIGINT NOT NULL,
  produtos        JSONB NOT NULL,
  valor_total     NUMERIC(14,2) NOT NULL DEFAULT 0,
  criado_em       TIMESTAMPTZ DEFAULT NOW(),
  criado_por      INTEGER REFERENCES dashboards_hub.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tc_opk_analise
  ON dashboards_hub.tc_oportunidades_kommo(analise_id);

CREATE INDEX IF NOT EXISTS idx_tc_opk_lead_origem
  ON dashboards_hub.tc_oportunidades_kommo(lead_origem_id);
