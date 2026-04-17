-- Migration 005: Migra analise de colaboradores de users da plataforma -> accounts do Kommo
-- Schema: dashboards_hub

-- Adiciona kommo_user_id em tc_analise_colaboradores
ALTER TABLE dashboards_hub.tc_analise_colaboradores
  ADD COLUMN IF NOT EXISTS kommo_user_id BIGINT;

-- Remove constraint antiga de unique(user_id, periodo) e adiciona nova (kommo_user_id, periodo)
ALTER TABLE dashboards_hub.tc_analise_colaboradores
  DROP CONSTRAINT IF EXISTS tc_analise_colaboradores_user_id_periodo_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tc_analise_colabs_kommo_periodo
  ON dashboards_hub.tc_analise_colaboradores (kommo_user_id, periodo)
  WHERE kommo_user_id IS NOT NULL;

-- user_id (plataforma) vira nullable — transicao
ALTER TABLE dashboards_hub.tc_analise_colaboradores
  ALTER COLUMN user_id DROP NOT NULL;

-- Adiciona kommo_user_id em tc_usuario_clientes (mapeamento opcional)
ALTER TABLE dashboards_hub.users
  ADD COLUMN IF NOT EXISTS kommo_user_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_users_kommo_user_id
  ON dashboards_hub.users (kommo_user_id);
