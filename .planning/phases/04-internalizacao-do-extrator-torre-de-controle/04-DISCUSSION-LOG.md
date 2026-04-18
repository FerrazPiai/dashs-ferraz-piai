# Phase 4: Internalizacao do Extrator Torre de Controle - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-18
**Phase:** 04-internalizacao-do-extrator-torre-de-controle
**Areas discussed:** Ownership token, Onboard OAuth, Vision imagens

---

## Ownership token

### Q1: Como o extrator decide qual token OAuth usar quando o job roda em background?

| Option | Description | Selected |
|--------|-------------|----------|
| Trigger-owner | Quem clicou "Analisar" no hub e dono do job — user_id vai como parametro pro tc-job-worker. Fallback admin/service user para jobs agendados. Recomendado: claro, rastreavel, casa com LGPD | ✓ |
| Project-creator | Adiciona created_by_user_id na tabela tc_projetos. Sempre usa token do criador. Risco: criador pode ter saido/revogado o token | |
| Cascata | Tenta trigger-owner primeiro; fallback project-creator; fallback qualquer admin/board com token valido. Mascara problemas de permissao | |
| Kommo-responsavel | Mapeia responsavel_id do lead no Kommo -> user_id do hub via email matching. Alinha com dono comercial mas depende de email bater | |

**User's choice:** Trigger-owner
**Notes:** Propagar user_id como parametro obrigatorio do tc-job-worker. Permite rastreabilidade LGPD.

### Q2: Fallback quando job roda sem user_id (scheduled jobs futuros)?

| Option | Description | Selected |
|--------|-------------|----------|
| Kommo-resp | Usa token do responsavel_user_id do lead mapeado via tc_kommo_users.kommo_user_id -> dashboards_hub.users.id. Natural. Recomendado — o mapping ja existe no DB | ✓ |
| Falha-job | Job e marcado failed com motivo "sem user_id", so executa se vier disparo manual. Bloqueia automacao futura | |
| Fora-de-escopo | Scheduled jobs nao existem hoje, so resolver quando aparecer. Adiar decisao | |

**User's choice:** Kommo-resp
**Notes:** O mapping kommo_user_id <-> user_id ja existe em dashboards_hub.users (confirmado em server/routes/torre-controle.js:196-200, 668-712). Reuso direto.

---

## Onboard OAuth

### Q3: Quando/como o hub pede pro gestor conectar a conta Google?

| Option | Description | Selected |
|--------|-------------|----------|
| Block-on-trigger | Modal intercepta clique em "Analisar projeto": "Pra analisar precisamos ler o Slides/Doc pela sua conta. Conectar agora?" -> OAuth consent -> dispara analise ao voltar. Recomendado: contextual, ninguem conecta sem precisar | ✓ |
| Persist-banner | Banner permanente no topo do hub ate conectar. Menos intrusivo mas disperso — gestor ignora ate falha | |
| Onboarding | Primeiro login redireciona pra /setup-google obrigatoriamente. Garante 100% conectados mas cria atrito no primeiro login | |
| Reactive-banner | Nada upfront. Job falha 403 na primeira analise -> banner "reconectar". Zero atrito inicial mas primeira analise sempre falha | |

**User's choice:** Block-on-trigger
**Notes:** Modal intercepta o POST de trigger do job; ao voltar do OAuth consent, dispara a analise automaticamente.

### Q4: Mid-job, quando refresh_token expira/e revogado durante extracao?

| Option | Description | Selected |
|--------|-------------|----------|
| Fail-mark | Job falha com erro tipado "google_reauth_required", status_avaliacao="incompleta" com motivo, banner "reconectar" + botao "retentar" no card. Recomendado: simples, alinha com Block-on-trigger | ✓ |
| Auto-retry | Job entra em estado "waiting_reauth" com TTL (ex: 24h). Se gestor reconecta, retenta automaticamente. Requer estado novo na fila | |
| Fallback-next | Tenta fallback Kommo-resp na mesma execucao. Mistura regras de ownership | |

**User's choice:** Fail-mark
**Notes:** NAO implementar auto-retry/fila de waiting_reauth — mantem o modelo simples e alinhado com Block-on-trigger.

### Q5: Onde o gestor ve/gerencia a conexao Google no hub?

| Option | Description | Selected |
|--------|-------------|----------|
| Profile-page | Nova pagina /perfil (ou aba admin para qualquer user) com card "Conexao Google": email, data, botao Desconectar. Recomendado | ✓ |
| Settings-modal | Icone de engrenagem na sidebar abre modal de settings. Cria padrao novo | |
| Admin-only | So admin gerencia. Admin teria acesso aos tokens dos outros — nao recomendado | |
| Claude-decides | Claude escolhe o melhor encaixe no hub | |

**User's choice:** Profile-page
**Notes:** Card "Conexao Google" com email conectado, data, status, botao Desconectar (revoga remotamente via oauth2.googleapis.com/revoke + deleta do DB) e botao Reconectar quando expirado.

---

## Vision imagens

### Q6: Como tratar imagens embutidas nos Google Slides extraidos?

| Option | Description | Selected |
|--------|-------------|----------|
| Sempre | Toda imagem passa por GPT-4o vision (mesmo fluxo do branch figma). Paridade total | ✓ |
| Threshold | Vision so em imagens "relevantes" (tamanho/posicao). Reduz ~60% do custo. Risco de skipar importantes | |
| Somente-texto | Ignora imagens. Custo zero mas perde contexto visual | |
| Opt-in-flag | Default texto-only, flag por projeto ativa vision completo | |

**User's choice:** Sempre (apos esclarecimento de custo)
**Notes:** User inicialmente questionou o custo ("nao podemos usar o 4o normal? utilizo este no n8n"). Custo foi recalculado corretamente: ~$0.002-0.005/imagem com GPT-4o detail=high = ~$0.10-0.20 por apresentacao tipica. Confirmacao final: paridade total com branch figma.

---

## Claude's Discretion

Areas nao discutidas explicitamente, com recomendacao default registrada em CONTEXT.md:

- Estrategia de cutover n8n (recomendacao: feature-flag INTERNAL_EXTRACTORS por plataforma)
- Criptografia do refresh_token (recomendacao: AES-256-GCM com TOKEN_ENC_KEY)
- Paginacao Miro (apenas execucao — research doc ja identificou que workflow atual trunca pagina 1)
- Sequencia vision + narrativa final nos Slides (planner decide paridade com output figma)
- Schema exato de google_oauth_tokens (planner refina)
- Rate-limit para GPT-4o vision em lote (p-limit / bottleneck / reuso do rate-limiter.js)

## Deferred Ideas

- Upload de PDF arbitrario (seed em .planning/seeds/upload-pdf-arbitrario-tc.md)
- Domain-Wide Delegation (descartado em /gsd-explore)
- Scheduled auto-extraction ao detectar mudanca de fase no Kommo
- Auto-retry com fila waiting_reauth (follow-up se UX de retentar se mostrar fraca)
- Google Picker API (descartado em /gsd-explore)
