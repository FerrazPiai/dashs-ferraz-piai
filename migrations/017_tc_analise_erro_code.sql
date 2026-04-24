-- 017: erro_code + erro_mensagem em tc_analises_ia (D-04 fail-mark mid-job)
-- Permite ao frontend identificar analise marcada incompleta por token Google expirado
-- (erro_code = 'google_reauth_required') e exibir banner de reauth.
SET search_path TO dashboards_hub;

ALTER TABLE tc_analises_ia
  ADD COLUMN IF NOT EXISTS erro_code VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS erro_mensagem TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_tc_analises_erro_code
  ON tc_analises_ia (erro_code)
  WHERE erro_code IS NOT NULL;
