-- Migration 009: Anotacoes do lead — contexto humano que alimenta a IA
-- Schema: dashboards_hub

CREATE TABLE IF NOT EXISTS dashboards_hub.tc_lead_notes (
  id              SERIAL PRIMARY KEY,
  lead_id         BIGINT NOT NULL,                       -- kommo lead id
  author_user_id  INTEGER REFERENCES dashboards_hub.users(id) ON DELETE SET NULL,
  author_name     VARCHAR(255),                          -- snapshot do nome (sobrevive deleted user)
  tipo            VARCHAR(20) NOT NULL DEFAULT 'observacao',
  -- tipos: observacao | insight | decisao | acao | risco | contexto-cliente
  conteudo        TEXT NOT NULL,
  fase_ordem      INTEGER,                               -- opcional: amarra a anotacao a uma fase especifica (1-6)
  importante      BOOLEAN DEFAULT false,                 -- prioriza no RAG
  pinned          BOOLEAN DEFAULT false,                 -- fixa no topo da lista
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tc_lead_notes_lead   ON dashboards_hub.tc_lead_notes (lead_id);
CREATE INDEX IF NOT EXISTS idx_tc_lead_notes_fase   ON dashboards_hub.tc_lead_notes (lead_id, fase_ordem);
CREATE INDEX IF NOT EXISTS idx_tc_lead_notes_author ON dashboards_hub.tc_lead_notes (author_user_id);
