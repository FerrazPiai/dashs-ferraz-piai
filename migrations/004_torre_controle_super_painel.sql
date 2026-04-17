-- Migration 004: Super Painel Torre de Controle
-- Schema: dashboards_hub
-- Adiciona: job queue, cache de extracoes, analises IA, embeddings, base de conhecimento,
--          atribuicoes usuario-cliente e analise semanal de colaboradores.
-- Pre-requisito: migrations 001, 002 e 003 aplicadas.

-- pgvector extension (necessaria para embeddings)
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- Job Queue (workflow assincrono de analises)
-- ============================================================================
CREATE TABLE IF NOT EXISTS dashboards_hub.tc_jobs (
  id              SERIAL PRIMARY KEY,
  tipo            VARCHAR(50) NOT NULL,                 -- analyze_phase, analyze_bulk
  referencia_id   INTEGER,
  lead_id         VARCHAR(50),
  lock_key        VARCHAR(255),                         -- dedup entre jobs do mesmo escopo
  status          VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  progresso       JSONB DEFAULT '{}',
  resultado       JSONB,
  tentativas      INTEGER DEFAULT 0,
  expires_at      TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '10 minutes'),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Unicidade por lock_key APENAS entre jobs ativos
CREATE UNIQUE INDEX IF NOT EXISTS idx_tc_jobs_lock_active
  ON dashboards_hub.tc_jobs (lock_key)
  WHERE status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS idx_tc_jobs_status
  ON dashboards_hub.tc_jobs (status);

-- ============================================================================
-- Extracoes (cache de conteudo por URL/lead)
-- ============================================================================
CREATE TABLE IF NOT EXISTS dashboards_hub.tc_extracoes (
  id              SERIAL PRIMARY KEY,
  lead_id         VARCHAR(50) NOT NULL,
  fase            VARCHAR(50),
  plataforma      VARCHAR(50),                          -- slides, reuniao, transcricao, figma, miro
  url_origem      TEXT NOT NULL,
  conteudo_full   TEXT,
  conteudo_medium TEXT,
  conteudo_short  TEXT,
  tokens_full     INTEGER,
  hash_conteudo   VARCHAR(64),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tc_extracoes_lead_url
  ON dashboards_hub.tc_extracoes (lead_id, url_origem);

-- ============================================================================
-- Analises IA (versionadas por projeto_fase)
-- ============================================================================
CREATE TABLE IF NOT EXISTS dashboards_hub.tc_analises_ia (
  id                  SERIAL PRIMARY KEY,
  projeto_fase_id     INTEGER NOT NULL REFERENCES dashboards_hub.tc_projeto_fases(id) ON DELETE CASCADE,
  versao              INTEGER NOT NULL DEFAULT 1,
  modelo_usado        VARCHAR(50),
  score               NUMERIC(3,1),
  veredicto           VARCHAR(50),
  resumo              TEXT,
  analise_materiais   TEXT,
  percepcao_cliente   JSONB DEFAULT '{}',
  dores               JSONB DEFAULT '[]',
  oportunidades       JSONB DEFAULT '[]',
  riscos              JSONB DEFAULT '[]',
  recomendacoes       JSONB DEFAULT '[]',
  contexto_rag        JSONB DEFAULT '{}',
  tokens_input        INTEGER,
  tokens_output       INTEGER,
  custo_estimado      NUMERIC(8,4),
  nota_kommo          TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(projeto_fase_id, versao)
);

CREATE INDEX IF NOT EXISTS idx_tc_analises_ia_fase
  ON dashboards_hub.tc_analises_ia (projeto_fase_id);

-- ============================================================================
-- Embeddings (pgvector para RAG camada 2)
-- ============================================================================
CREATE TABLE IF NOT EXISTS dashboards_hub.tc_embeddings (
  id              SERIAL PRIMARY KEY,
  referencia_tipo VARCHAR(50) NOT NULL,                 -- analise_ia, conhecimento
  referencia_id   INTEGER NOT NULL,
  conteudo_texto  TEXT,
  embedding       vector(1536),                         -- text-embedding-3-small
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tc_embeddings_vec
  ON dashboards_hub.tc_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 20);

CREATE INDEX IF NOT EXISTS idx_tc_embeddings_meta
  ON dashboards_hub.tc_embeddings USING gin (metadata);

-- ============================================================================
-- Base de conhecimento (RAG camada 3 — playbooks, boas praticas)
-- ============================================================================
CREATE TABLE IF NOT EXISTS dashboards_hub.tc_conhecimento (
  id              SERIAL PRIMARY KEY,
  categoria       VARCHAR(100),
  fase_aplicavel  VARCHAR(50),
  titulo          VARCHAR(255) NOT NULL,
  conteudo        TEXT NOT NULL,
  fonte           VARCHAR(255),
  relevancia      INTEGER DEFAULT 5,
  ativo           BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Atribuicoes usuario-cliente (permissoes do operacao)
-- ============================================================================
CREATE TABLE IF NOT EXISTS dashboards_hub.tc_usuario_clientes (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES dashboards_hub.users(id) ON DELETE CASCADE,
  cliente_id      INTEGER NOT NULL REFERENCES dashboards_hub.tc_clientes(id) ON DELETE CASCADE,
  funcao          VARCHAR(50),                          -- consultor, analista, coordenador, gestor
  squad           VARCHAR(100),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, cliente_id)
);

CREATE INDEX IF NOT EXISTS idx_tc_usuario_clientes_user
  ON dashboards_hub.tc_usuario_clientes (user_id);

-- ============================================================================
-- Analise semanal de colaboradores
-- ============================================================================
CREATE TABLE IF NOT EXISTS dashboards_hub.tc_analise_colaboradores (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES dashboards_hub.users(id) ON DELETE CASCADE,
  periodo         DATE NOT NULL,
  score_medio     NUMERIC(3,1),
  total_clientes  INTEGER,
  clientes_risco  INTEGER,
  pontos_fortes   JSONB DEFAULT '[]',
  pontos_atencao  JSONB DEFAULT '[]',
  recomendacoes   JSONB DEFAULT '[]',
  distribuicao    JSONB DEFAULT '{}',
  modelo_usado    VARCHAR(50),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, periodo)
);
