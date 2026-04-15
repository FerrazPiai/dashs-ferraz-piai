-- Migration 002: Tabela de perfis com permissoes por dashboard
-- Executar contra o banco 'ferrazpiai' no Easypanel

-- Perfis de acesso (substitui allowedRoles hardcoded no dashboards.json)
CREATE TABLE IF NOT EXISTS dashboards_hub.profiles (
  name              VARCHAR(50) PRIMARY KEY,
  label             VARCHAR(100) NOT NULL,
  allowed_dashboards TEXT[] DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Seed: perfis padrao
INSERT INTO dashboards_hub.profiles (name, label, allowed_dashboards) VALUES
  ('admin', 'Administrador', '{}'),
  ('board', 'Board', '{tx-conv-saber-monetizacao,gtm-motion,marketing-vendas,raio-x-financeiro,nps-satisfacao,comparativo-squads}'),
  ('operacao', 'Operação', '{tx-conv-saber-monetizacao,gtm-motion,marketing-vendas,nps-satisfacao,comparativo-squads}')
ON CONFLICT (name) DO NOTHING;
