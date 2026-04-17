-- Migration 008: Diferenciar analise INCOMPLETA (faltou material) de COMPLETA (material suficiente).
-- Score nao deve poluir KPIs quando incompleta.

ALTER TABLE dashboards_hub.tc_analises_ia
  ADD COLUMN IF NOT EXISTS status_avaliacao VARCHAR(20) DEFAULT 'completa';
-- valores: 'completa' | 'incompleta' | 'parcial'

CREATE INDEX IF NOT EXISTS idx_tc_analises_ia_status
  ON dashboards_hub.tc_analises_ia (status_avaliacao);

-- Marca analises antigas com score < 2 e sem oportunidades reais como provavelmente incompletas
-- (heuristica conservadora — usuario pode revisar manualmente)
UPDATE dashboards_hub.tc_analises_ia
SET status_avaliacao = 'incompleta'
WHERE status_avaliacao = 'completa'
  AND score IS NOT NULL
  AND score <= 2
  AND (
    LOWER(COALESCE(veredicto, '')) LIKE '%insuficient%'
    OR LOWER(COALESCE(veredicto, '')) LIKE '%incomplet%'
    OR LOWER(COALESCE(resumo, '')) LIKE '%materiais insuficient%'
    OR LOWER(COALESCE(resumo, '')) LIKE '%falta de informa%'
  );
