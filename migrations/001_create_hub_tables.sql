-- Migration 001: Schema e tabelas do hub de dashboards
-- Executar contra o banco 'ferrazpiai' no Easypanel

-- Schema isolado para nao misturar com tabelas do Check-in Builder
CREATE SCHEMA IF NOT EXISTS dashboards_hub;

-- Tabela de usuarios
CREATE TABLE IF NOT EXISTS dashboards_hub.users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  name          VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255),
  role          VARCHAR(20) NOT NULL DEFAULT 'operacao',
  oauth_provider VARCHAR(20),
  oauth_id      VARCHAR(255),
  active        BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de sessoes (connect-pg-simple)
CREATE TABLE IF NOT EXISTS dashboards_hub.sessions (
  sid     VARCHAR NOT NULL PRIMARY KEY,
  sess    JSON NOT NULL,
  expire  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_expire
  ON dashboards_hub.sessions (expire);

-- Seed: usuario admin
INSERT INTO dashboards_hub.users (email, name, role)
VALUES ('ferramenta.ferraz@v4company.com', 'Pietro Piai', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Seed: usuarios board (whitelist)
INSERT INTO dashboards_hub.users (email, name, role) VALUES
  ('caio_gouveia@v4company.com', 'Caio Gouveia', 'board'),
  ('caio.phelipe@v4company.com', 'Caio Phelipe', 'board'),
  ('joandre@v4company.com', 'Joandre', 'board'),
  ('edison@v4company.com', 'Edison', 'board'),
  ('paulo.henrique@v4company.com', 'Paulo Henrique', 'board'),
  ('edilaine@v4company.com', 'Edilaine', 'board'),
  ('deniz_oliveira@v4company.com', 'Deniz Oliveira', 'board'),
  ('pedro.miguel@v4company.com', 'Pedro Miguel', 'board'),
  ('oliveira.lucas@v4company.com', 'Lucas Oliveira', 'board')
ON CONFLICT (email) DO NOTHING;
