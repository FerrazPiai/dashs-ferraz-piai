-- Migration 011: Expande veredicto e modelo_usado para evitar varchar overflow
-- IA gera veredictos como "Projeto em risco - cliente desengajado desde fase 3"
-- e modelo_usado pode ter formato "gpt-4.1 (openai) (final)" > 50 chars.

ALTER TABLE dashboards_hub.tc_analises_ia
  ALTER COLUMN veredicto     TYPE VARCHAR(200),
  ALTER COLUMN modelo_usado  TYPE VARCHAR(100);
