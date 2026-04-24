-- 019: allowed_features em profiles.
-- Permite ao admin conceder acesso a funcionalidades especiais por perfil,
-- sem precisar tratar cada feature como um dashboard separado.
-- Exemplo atual: 'tc_painel_geral' libera o botao "Painel Geral" na Torre de Controle.

ALTER TABLE dashboards_hub.profiles
  ADD COLUMN IF NOT EXISTS allowed_features JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN dashboards_hub.profiles.allowed_features IS
  'Lista de feature flags liberadas para o perfil (ex: ["tc_painel_geral"]).';
