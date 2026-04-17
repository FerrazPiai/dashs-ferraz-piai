-- Migration 010: Configuracao do provedor de IA selecionavel pelo admin
-- Singleton (id=1) com provider + modelos para analise/nota/coordenador.
-- Embedding continua fixo em OpenAI (text-embedding-3-small) por compatibilidade
-- com os vetores ja persistidos em tc_embeddings.

CREATE TABLE IF NOT EXISTS dashboards_hub.tc_ai_provider_config (
  id                INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  provider          VARCHAR(40) NOT NULL DEFAULT 'openai',
  model_analysis    VARCHAR(120) NOT NULL DEFAULT 'gpt-5.4-mini',
  model_note        VARCHAR(120) NOT NULL DEFAULT 'gpt-5.4-nano',
  model_coordinator VARCHAR(120),                      -- opcional: modelo para agent/coordenador
  price_in_per_mtok NUMERIC(10,4),                     -- custo por 1M tokens input (USD) — referencia para UI
  price_out_per_mtok NUMERIC(10,4),                    -- custo por 1M tokens output (USD)
  notes             TEXT,                              -- observacoes livres do admin
  updated_by        INT REFERENCES dashboards_hub.users(id),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT provider_valid CHECK (provider IN ('openai', 'openrouter'))
);

-- Seed inicial: mantem o comportamento atual (OpenAI)
INSERT INTO dashboards_hub.tc_ai_provider_config
  (id, provider, model_analysis, model_note, price_in_per_mtok, price_out_per_mtok, notes)
VALUES
  (1, 'openai', 'gpt-5.4-mini', 'gpt-5.4-nano', 0.75, 4.50, 'Configuracao inicial (migration 010)')
ON CONFLICT (id) DO NOTHING;
