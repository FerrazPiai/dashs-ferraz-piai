-- Migration 013: Rastreia a ultima falha da analise IA em cada fase do projeto
-- para que o SuperPainel possa mostrar um banner inline com o erro.

ALTER TABLE dashboards_hub.tc_projeto_fases
  ADD COLUMN IF NOT EXISTS ultima_falha_em  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ultima_falha_msg TEXT;
