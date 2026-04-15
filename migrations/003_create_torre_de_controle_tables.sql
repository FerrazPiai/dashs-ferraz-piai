-- Migration 003: Tabelas Torre de Controle — Relacionamento com Clientes
-- Schema: dashboards_hub (mesmo schema do hub)
-- Executar contra o banco 'ferrazpiai' no Easypanel

-- ============================================================================
-- CORE: Clientes, Projetos, Fases
-- ============================================================================

-- Clientes (registro unico por empresa)
CREATE TABLE IF NOT EXISTS dashboards_hub.tc_clientes (
  id              SERIAL PRIMARY KEY,
  id_externo      VARCHAR(50),                          -- ID do CRM/sistema externo (ex: 26791207)
  nome            VARCHAR(255) NOT NULL,
  segmento        VARCHAR(100),                         -- ex: "Acabamentos e Construção", "SaaS B2B"
  porte           VARCHAR(50),                          -- ex: "PME", "Enterprise", "Startup"
  cnpj            VARCHAR(20),
  contato_nome    VARCHAR(255),                         -- contato principal
  contato_email   VARCHAR(255),
  contato_telefone VARCHAR(30),
  ativo           BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tc_clientes_id_externo
  ON dashboards_hub.tc_clientes (id_externo) WHERE id_externo IS NOT NULL;

-- Squads / Equipes
CREATE TABLE IF NOT EXISTS dashboards_hub.tc_squads (
  id              SERIAL PRIMARY KEY,
  nome            VARCHAR(100) NOT NULL UNIQUE,
  coordenador     VARCHAR(255),
  ativo           BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Membros da equipe de um projeto
CREATE TABLE IF NOT EXISTS dashboards_hub.tc_membros (
  id              SERIAL PRIMARY KEY,
  nome            VARCHAR(255) NOT NULL,
  email           VARCHAR(255),
  cargo           VARCHAR(100),                         -- ex: "Consultor", "Designer", "Analista de Tráfego"
  squad_id        INTEGER REFERENCES dashboards_hub.tc_squads(id),
  ativo           BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Fases configuráveis (template de fases por produto)
CREATE TABLE IF NOT EXISTS dashboards_hub.tc_fases_config (
  id              SERIAL PRIMARY KEY,
  produto         VARCHAR(50) NOT NULL DEFAULT 'saber', -- saber, ter, executar, potencializar
  nome            VARCHAR(100) NOT NULL,                -- ex: "Kickoff", "Fase 2", "Projeto concluído"
  ordem           INTEGER NOT NULL,                     -- ordem de exibição
  descricao       TEXT,                                 -- descrição da fase
  checklist_modelo JSONB DEFAULT '[]',                  -- checklist padrão esperado nesta fase
  UNIQUE(produto, ordem)
);

-- Projetos (um cliente pode ter vários projetos — um por produto)
CREATE TABLE IF NOT EXISTS dashboards_hub.tc_projetos (
  id              SERIAL PRIMARY KEY,
  cliente_id      INTEGER NOT NULL REFERENCES dashboards_hub.tc_clientes(id) ON DELETE CASCADE,
  squad_id        INTEGER REFERENCES dashboards_hub.tc_squads(id),
  produto         VARCHAR(50) NOT NULL DEFAULT 'saber', -- saber, ter, executar
  status          VARCHAR(30) NOT NULL DEFAULT 'em_andamento', -- em_andamento, concluido, cancelado, pausado
  data_inicio     DATE,
  data_previsao   DATE,                                 -- previsão de conclusão
  data_conclusao  DATE,
  observacoes     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tc_projetos_cliente
  ON dashboards_hub.tc_projetos (cliente_id);
CREATE INDEX IF NOT EXISTS idx_tc_projetos_status
  ON dashboards_hub.tc_projetos (status);

-- Membros alocados em cada projeto
CREATE TABLE IF NOT EXISTS dashboards_hub.tc_projeto_membros (
  projeto_id      INTEGER NOT NULL REFERENCES dashboards_hub.tc_projetos(id) ON DELETE CASCADE,
  membro_id       INTEGER NOT NULL REFERENCES dashboards_hub.tc_membros(id) ON DELETE CASCADE,
  papel           VARCHAR(100),                         -- ex: "Líder", "Consultor", "Suporte"
  PRIMARY KEY (projeto_id, membro_id)
);

-- ============================================================================
-- MATRIZ: Status por Fase (os dots verde/amarelo/vermelho)
-- ============================================================================

CREATE TABLE IF NOT EXISTS dashboards_hub.tc_projeto_fases (
  id              SERIAL PRIMARY KEY,
  projeto_id      INTEGER NOT NULL REFERENCES dashboards_hub.tc_projetos(id) ON DELETE CASCADE,
  fase_config_id  INTEGER NOT NULL REFERENCES dashboards_hub.tc_fases_config(id),
  status_cor      VARCHAR(20),                          -- verde, amarelo, vermelho, NULL (não ocorreu)
  score           NUMERIC(3,1) CHECK (score >= 0 AND score <= 10),
  data_inicio     DATE,
  data_conclusao  DATE,
  responsavel     VARCHAR(255),                         -- quem conduziu esta fase
  resumo          TEXT,                                 -- resumo da reunião/entrega
  analise_materiais TEXT,                               -- análise dos materiais entregues
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(projeto_id, fase_config_id)
);

CREATE INDEX IF NOT EXISTS idx_tc_projeto_fases_projeto
  ON dashboards_hub.tc_projeto_fases (projeto_id);

-- ============================================================================
-- RELATÓRIOS DE AUDITORIA (o "MEGA relatório")
-- ============================================================================

-- Header do relatório — um por projeto+fase (pode ter múltiplas versões)
CREATE TABLE IF NOT EXISTS dashboards_hub.tc_relatorios (
  id              SERIAL PRIMARY KEY,
  projeto_fase_id INTEGER NOT NULL REFERENCES dashboards_hub.tc_projeto_fases(id) ON DELETE CASCADE,
  versao          INTEGER NOT NULL DEFAULT 1,           -- permite re-auditorias
  auditor         VARCHAR(255),                         -- quem fez a auditoria
  data_auditoria  DATE NOT NULL DEFAULT CURRENT_DATE,
  parecer_geral   TEXT,                                 -- parecer final do auditor
  score_geral     NUMERIC(3,1) CHECK (score_geral >= 0 AND score_geral <= 10),
  status          VARCHAR(30) NOT NULL DEFAULT 'rascunho', -- rascunho, finalizado, revisado
  metadata        JSONB DEFAULT '{}',                   -- dados extras flexíveis
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(projeto_fase_id, versao)
);

CREATE INDEX IF NOT EXISTS idx_tc_relatorios_fase
  ON dashboards_hub.tc_relatorios (projeto_fase_id);

-- ============================================================================
-- RESUMO DO CONTEÚDO (seção do relatório)
-- Cada tópico: "Definição e Sizing de Mercado", "Estudo de Concorrentes", etc.
-- ============================================================================

CREATE TABLE IF NOT EXISTS dashboards_hub.tc_relatorio_conteudo (
  id              SERIAL PRIMARY KEY,
  relatorio_id    INTEGER NOT NULL REFERENCES dashboards_hub.tc_relatorios(id) ON DELETE CASCADE,
  topico          VARCHAR(255) NOT NULL,                -- ex: "Definição e Sizing de Mercado (TAM / SAM / SOM)"
  presente        BOOLEAN NOT NULL DEFAULT false,       -- true = entregue, false = ausente
  qualificador    VARCHAR(50),                          -- "Presente e detalhado", "Presente e aprofundado"
  descricao       TEXT,                                 -- descrição da análise do tópico
  ordem           INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_tc_relatorio_conteudo_rel
  ON dashboards_hub.tc_relatorio_conteudo (relatorio_id);

-- ============================================================================
-- CHECKLIST DE AUDITORIA
-- Status: feito, ausente, nao_aplicavel, extra
-- ============================================================================

CREATE TABLE IF NOT EXISTS dashboards_hub.tc_relatorio_checklist (
  id              SERIAL PRIMARY KEY,
  relatorio_id    INTEGER NOT NULL REFERENCES dashboards_hub.tc_relatorios(id) ON DELETE CASCADE,
  item            VARCHAR(500) NOT NULL,                -- ex: "Definição e Sizing de Mercado (TAM / SAM / SOM)"
  status          VARCHAR(20) NOT NULL DEFAULT 'feito', -- feito, ausente, nao_aplicavel, extra
  slides_ref      TEXT,                                 -- ex: "Slides: TAM - Jundiaí | Critérios utilizados"
  observacao      TEXT,
  ordem           INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_tc_relatorio_checklist_rel
  ON dashboards_hub.tc_relatorio_checklist (relatorio_id);

-- ============================================================================
-- AVALIAÇÃO DE QUALIDADE (critérios de avaliação)
-- ============================================================================

CREATE TABLE IF NOT EXISTS dashboards_hub.tc_relatorio_avaliacao (
  id              SERIAL PRIMARY KEY,
  relatorio_id    INTEGER NOT NULL REFERENCES dashboards_hub.tc_relatorios(id) ON DELETE CASCADE,
  criterio        VARCHAR(255) NOT NULL,                -- ex: "Revisão de Português e Clareza"
  score           NUMERIC(3,1) CHECK (score >= 0 AND score <= 10),
  titulo_secao    VARCHAR(255),                         -- ex: "Erros encontrados", "Documentação"
  descricao       TEXT NOT NULL,                        -- análise detalhada
  correcoes       TEXT,                                 -- correções indicadas (se houver)
  parecer         TEXT,                                 -- parecer final do critério
  ordem           INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_tc_relatorio_avaliacao_rel
  ON dashboards_hub.tc_relatorio_avaliacao (relatorio_id);

-- ============================================================================
-- INSATISFAÇÕES DO CLIENTE
-- ============================================================================

CREATE TABLE IF NOT EXISTS dashboards_hub.tc_insatisfacoes (
  id              SERIAL PRIMARY KEY,
  projeto_fase_id INTEGER NOT NULL REFERENCES dashboards_hub.tc_projeto_fases(id) ON DELETE CASCADE,
  descricao       TEXT NOT NULL,
  gravidade       VARCHAR(20) DEFAULT 'media',          -- baixa, media, alta, critica
  resolvida       BOOLEAN DEFAULT false,
  data_resolucao  DATE,
  acao_tomada     TEXT,                                 -- o que foi feito para resolver
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tc_insatisfacoes_fase
  ON dashboards_hub.tc_insatisfacoes (projeto_fase_id);

-- ============================================================================
-- OPORTUNIDADES DE EXPANSÃO
-- ============================================================================

CREATE TABLE IF NOT EXISTS dashboards_hub.tc_oportunidades (
  id              SERIAL PRIMARY KEY,
  projeto_fase_id INTEGER NOT NULL REFERENCES dashboards_hub.tc_projeto_fases(id) ON DELETE CASCADE,
  titulo          VARCHAR(255) NOT NULL,
  descricao       TEXT,
  valor_estimado  NUMERIC(12,2),                        -- valor em BRL
  status          VARCHAR(30) DEFAULT 'identificada',   -- identificada, qualificada, proposta_enviada, fechada, perdida
  responsavel     VARCHAR(255),
  data_identificacao DATE DEFAULT CURRENT_DATE,
  data_fechamento DATE,
  crm_sync        BOOLEAN DEFAULT false,                -- se já foi criada no CRM
  crm_id          VARCHAR(100),                         -- ID no CRM externo
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tc_oportunidades_fase
  ON dashboards_hub.tc_oportunidades (projeto_fase_id);
CREATE INDEX IF NOT EXISTS idx_tc_oportunidades_status
  ON dashboards_hub.tc_oportunidades (status);

-- ============================================================================
-- RECOMENDAÇÕES (do auditor para a equipe)
-- ============================================================================

CREATE TABLE IF NOT EXISTS dashboards_hub.tc_recomendacoes (
  id              SERIAL PRIMARY KEY,
  relatorio_id    INTEGER NOT NULL REFERENCES dashboards_hub.tc_relatorios(id) ON DELETE CASCADE,
  tipo            VARCHAR(50) NOT NULL DEFAULT 'melhoria', -- melhoria, correcao, urgente, estrategica
  descricao       TEXT NOT NULL,
  prioridade      VARCHAR(20) DEFAULT 'media',          -- baixa, media, alta, critica
  implementada    BOOLEAN DEFAULT false,
  ordem           INTEGER DEFAULT 0
);

-- ============================================================================
-- AÇÕES PENDENTES / FOLLOW-UPS
-- ============================================================================

CREATE TABLE IF NOT EXISTS dashboards_hub.tc_acoes (
  id              SERIAL PRIMARY KEY,
  projeto_id      INTEGER NOT NULL REFERENCES dashboards_hub.tc_projetos(id) ON DELETE CASCADE,
  projeto_fase_id INTEGER REFERENCES dashboards_hub.tc_projeto_fases(id) ON DELETE SET NULL,
  descricao       TEXT NOT NULL,
  responsavel     VARCHAR(255),
  prazo           DATE,
  status          VARCHAR(30) DEFAULT 'pendente',       -- pendente, em_andamento, concluida, cancelada
  prioridade      VARCHAR(20) DEFAULT 'media',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tc_acoes_projeto
  ON dashboards_hub.tc_acoes (projeto_id);
CREATE INDEX IF NOT EXISTS idx_tc_acoes_status
  ON dashboards_hub.tc_acoes (status);

-- ============================================================================
-- PRODUTOS / SERVIÇOS ANALISADOS (o que está sendo entregue ao cliente)
-- ============================================================================

CREATE TABLE IF NOT EXISTS dashboards_hub.tc_projeto_produtos (
  id              SERIAL PRIMARY KEY,
  projeto_id      INTEGER NOT NULL REFERENCES dashboards_hub.tc_projetos(id) ON DELETE CASCADE,
  nome            VARCHAR(255) NOT NULL,                -- ex: "Gestão de Tráfego Pago", "SEO", "Branding"
  tipo            VARCHAR(50),                          -- servico, produto, consultoria
  valor_mensal    NUMERIC(12,2),
  status          VARCHAR(30) DEFAULT 'ativo',          -- ativo, pausado, cancelado
  data_inicio     DATE,
  observacoes     TEXT
);

CREATE INDEX IF NOT EXISTS idx_tc_projeto_produtos_projeto
  ON dashboards_hub.tc_projeto_produtos (projeto_id);

-- ============================================================================
-- MÉTRICAS / KPIs POR FASE
-- ============================================================================

CREATE TABLE IF NOT EXISTS dashboards_hub.tc_metricas (
  id              SERIAL PRIMARY KEY,
  projeto_fase_id INTEGER NOT NULL REFERENCES dashboards_hub.tc_projeto_fases(id) ON DELETE CASCADE,
  nome            VARCHAR(100) NOT NULL,                -- ex: "CPL", "ROAS", "Leads Gerados", "MQL"
  valor           NUMERIC(14,2),
  unidade         VARCHAR(30),                          -- ex: "R$", "%", "unidades", "dias"
  meta            NUMERIC(14,2),                        -- meta/target
  comparativo     NUMERIC(14,2),                        -- valor do período anterior
  direcao         VARCHAR(10),                          -- "up" (melhor=maior) ou "down" (melhor=menor)
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tc_metricas_fase
  ON dashboards_hub.tc_metricas (projeto_fase_id);

-- ============================================================================
-- RISCOS DO PROJETO
-- ============================================================================

CREATE TABLE IF NOT EXISTS dashboards_hub.tc_riscos (
  id              SERIAL PRIMARY KEY,
  projeto_id      INTEGER NOT NULL REFERENCES dashboards_hub.tc_projetos(id) ON DELETE CASCADE,
  descricao       TEXT NOT NULL,
  tipo            VARCHAR(50),                          -- churn, insatisfacao, atraso, qualidade, financeiro
  probabilidade   VARCHAR(20) DEFAULT 'media',          -- baixa, media, alta
  impacto         VARCHAR(20) DEFAULT 'medio',          -- baixo, medio, alto, critico
  mitigacao       TEXT,                                 -- plano de mitigação
  status          VARCHAR(30) DEFAULT 'ativo',          -- ativo, mitigado, materializado, encerrado
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tc_riscos_projeto
  ON dashboards_hub.tc_riscos (projeto_id);

-- ============================================================================
-- HISTÓRICO DE TRANSIÇÕES DE FASE
-- ============================================================================

CREATE TABLE IF NOT EXISTS dashboards_hub.tc_historico_fases (
  id              SERIAL PRIMARY KEY,
  projeto_fase_id INTEGER NOT NULL REFERENCES dashboards_hub.tc_projeto_fases(id) ON DELETE CASCADE,
  campo           VARCHAR(50) NOT NULL,                 -- ex: "status_cor", "score"
  valor_anterior  TEXT,
  valor_novo      TEXT,
  motivo          TEXT,
  usuario         VARCHAR(255),                         -- quem fez a mudança
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tc_historico_fase
  ON dashboards_hub.tc_historico_fases (projeto_fase_id);

-- ============================================================================
-- DOCUMENTOS / SLIDES (referências a materiais)
-- ============================================================================

CREATE TABLE IF NOT EXISTS dashboards_hub.tc_documentos (
  id              SERIAL PRIMARY KEY,
  projeto_fase_id INTEGER REFERENCES dashboards_hub.tc_projeto_fases(id) ON DELETE SET NULL,
  relatorio_id    INTEGER REFERENCES dashboards_hub.tc_relatorios(id) ON DELETE SET NULL,
  titulo          VARCHAR(255) NOT NULL,
  tipo            VARCHAR(50),                          -- slide, documento, planilha, video, link
  url             TEXT,                                 -- link externo (Google Drive, etc)
  descricao       TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TAGS (categorização flexível)
-- ============================================================================

CREATE TABLE IF NOT EXISTS dashboards_hub.tc_tags (
  id              SERIAL PRIMARY KEY,
  nome            VARCHAR(50) NOT NULL UNIQUE,
  cor             VARCHAR(7),                           -- hex color
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dashboards_hub.tc_projeto_tags (
  projeto_id      INTEGER NOT NULL REFERENCES dashboards_hub.tc_projetos(id) ON DELETE CASCADE,
  tag_id          INTEGER NOT NULL REFERENCES dashboards_hub.tc_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (projeto_id, tag_id)
);

-- ============================================================================
-- SEED: Fases padrão do produto "Saber"
-- ============================================================================

INSERT INTO dashboards_hub.tc_fases_config (produto, nome, ordem, descricao) VALUES
  ('saber', 'Kickoff', 1, 'Reunião de alinhamento inicial — objetivos, expectativas, KPIs e cronograma'),
  ('saber', 'Fase 2', 2, 'Imersão e Descoberta — TAM/SAM/SOM, concorrentes, ICPs, personas, JTBD, PUV'),
  ('saber', 'Fase 3', 3, 'Estratégia e Planejamento — posicionamento, canais, plano de ação'),
  ('saber', 'Fase 4', 4, 'Execução e Implementação — materiais, campanhas, integrações'),
  ('saber', 'Fase 5', 5, 'Análise de Resultados — métricas, ROI, ajustes estratégicos'),
  ('saber', 'Projeto concluído', 6, 'Encerramento — apresentação de resultados, case de sucesso, renovação')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SEED: Tags comuns
-- ============================================================================

INSERT INTO dashboards_hub.tc_tags (nome, cor) VALUES
  ('risco-churn', '#ef4444'),
  ('case-sucesso', '#22c55e'),
  ('upsell', '#f59e0b'),
  ('escalacao', '#ef4444'),
  ('renovacao', '#3b82f6'),
  ('atraso', '#f97316'),
  ('vip', '#a855f7'),
  ('novo-cliente', '#06b6d4')
ON CONFLICT (nome) DO NOTHING;
