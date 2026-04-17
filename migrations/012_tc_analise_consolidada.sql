-- Migration 012: Coluna JSONB para guardar os novos eixos da Analise Consolidada
-- (avanco, qualidade_time) sem alterar oportunidades / dores / riscos / recomendacoes
-- ja existentes.

ALTER TABLE dashboards_hub.tc_analises_ia
  ADD COLUMN IF NOT EXISTS consolidado JSONB;

-- Analises antigas ficam NULL; UI trata consolidado IS NULL como "sem eixos novos".
