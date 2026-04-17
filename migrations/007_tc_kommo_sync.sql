-- Migration 007: Sistema de sync Kommo DB-first
-- Schema: dashboards_hub

-- Companies (1 company -> N leads)
CREATE TABLE IF NOT EXISTS dashboards_hub.tc_kommo_companies (
  id              BIGINT PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  responsible_user_id BIGINT,
  custom_fields   JSONB DEFAULT '[]',
  raw             JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Leads do pipeline Saber (e outros se precisar no futuro)
CREATE TABLE IF NOT EXISTS dashboards_hub.tc_kommo_leads (
  id              BIGINT PRIMARY KEY,
  company_id      BIGINT REFERENCES dashboards_hub.tc_kommo_companies(id) ON DELETE SET NULL,
  pipeline_id     BIGINT NOT NULL,
  status_id       BIGINT NOT NULL,
  name            VARCHAR(500),
  price           NUMERIC(14,2),
  responsible_user_id BIGINT,
  custom_fields   JSONB DEFAULT '[]',
  raw             JSONB,
  removed_from_kommo BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tc_kommo_leads_status ON dashboards_hub.tc_kommo_leads(status_id);
CREATE INDEX IF NOT EXISTS idx_tc_kommo_leads_company ON dashboards_hub.tc_kommo_leads(company_id);
CREATE INDEX IF NOT EXISTS idx_tc_kommo_leads_pipeline ON dashboards_hub.tc_kommo_leads(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_tc_kommo_leads_responsible ON dashboards_hub.tc_kommo_leads(responsible_user_id);

-- Accounts (usuarios do Kommo — responsaveis/closers)
CREATE TABLE IF NOT EXISTS dashboards_hub.tc_kommo_users (
  id              BIGINT PRIMARY KEY,
  name            VARCHAR(255),
  email           VARCHAR(255),
  raw             JSONB,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Estado da ultima sincronizacao (1 linha unica)
CREATE TABLE IF NOT EXISTS dashboards_hub.tc_sync_state (
  id                     INTEGER PRIMARY KEY DEFAULT 1,
  ultima_sync_iniciada   TIMESTAMPTZ,
  ultima_sync_concluida  TIMESTAMPTZ,
  ultima_sync_erro       TEXT,
  leads_total            INTEGER DEFAULT 0,
  leads_novos            INTEGER DEFAULT 0,
  leads_atualizados      INTEGER DEFAULT 0,
  companies_total        INTEGER DEFAULT 0,
  duracao_ms             INTEGER,
  CHECK (id = 1)
);

INSERT INTO dashboards_hub.tc_sync_state (id) VALUES (1) ON CONFLICT DO NOTHING;
