# Phase 4: Internalizacao do Extrator Torre de Controle - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Esta fase entrega a **substituicao completa do workflow n8n `uiUUXegcBHe3z2fg`
(Auditoria Saber Extrator De Dados) por implementacao 100% no backend do hub**,
usando **OAuth 2.0 per-user Google** para acesso aos arquivos Docs/Slides dos
gestores e **tokens centralizados no `.env`** para Figma e Miro.

Ao final da fase:
- `extractViaN8n` e `N8N_EXTRACT_WEBHOOK_URL` removidos do codebase
- Gestor conecta sua conta Google uma unica vez no hub; todas as extracoes
  subsequentes acontecem em nome dele sem atrito
- Slides e Docs extraidos via APIs nativas do Google (`slides.presentations.get`,
  `docs.documents.get`), sem passar por Mistral OCR nem download de PDF
- Figma e Miro extraidos via REST APIs com tokens centralizados, preservando
  os prompts do workflow atual (GPT-4o vision + GPT-4.1 narrativa final)
- Mistral OCR desativado do pipeline ativo (variavel fica dormant no `.env`
  caso o seed `upload-pdf-arbitrario-tc.md` seja promovido no futuro)
- Workflow n8n arquivado (nao deletado) como referencia historica

**NAO faz parte desta fase:**
- Upload de PDF arbitrario (seed em `.planning/seeds/upload-pdf-arbitrario-tc.md`)
- Domain-Wide Delegation de Service Account (alternativa descartada durante
  `/gsd-explore`)
- Detecao automatica de mudanca de fase no Kommo (scheduled jobs) \u2014 so aparece
  na estrutura de fallback mas implementacao fica fora de escopo

</domain>

<decisions>
## Implementation Decisions

### Ownership do token OAuth

- **D-01 (Trigger-owner como regra primaria):** O gestor que clica "Analisar"
  no hub e o "dono" do job. O backend deve propagar `user_id` da sessao como
  parametro obrigatorio do `tc-job-worker.js` / `runAnalysis`. O extrator
  carrega o token desse usuario ao chamar as APIs do Google.
  - Schema implicado: novas tabelas `google_oauth_tokens (user_id,
    refresh_token_enc, scopes, connected_at, last_used_at, revoked_at)` e
    `tc_jobs.triggered_by_user_id` (ou equivalente) para rastrear ownership.

- **D-02 (Fallback Kommo-resp para jobs sem user_id):** Quando o job roda sem
  user_id (futuro: scheduled detection de mudanca de fase no Kommo), o
  extrator consulta `dashboards_hub.tc_kommo_users` -> `responsible_user_id`
  do lead -> mapeia para `dashboards_hub.users.kommo_user_id` -> usa o token
  dessa pessoa. Se o mapping nao existir ou o user nao tiver token, job falha
  com erro tipado.
  - O mapping Kommo <-> hub user **ja existe** em
    `dashboards_hub.users.kommo_user_id` (confirmado em
    `server/routes/torre-controle.js:196-200` e `:668-712`).

### Onboarding e reautorizacao OAuth

- **D-03 (Block-on-trigger como UX primaria):** Quando o gestor clica "Analisar
  projeto" no hub e nao tem token valido, o frontend intercepta a acao com
  modal: "Pra analisar precisamos ler o Slides/Doc pela sua conta Google.
  Conectar agora?" \u2192 botao redireciona para OAuth consent flow do Google \u2192
  callback retorna ao hub e **dispara automaticamente a analise** que foi
  interceptada. Sem banners persistentes globais, sem onboarding obrigatorio.

- **D-04 (Fail-mark mid-job para reautorizacao):** Se o `refresh_token` expira
  ou foi revogado durante a execucao do job:
  - Job falha com erro tipado `google_reauth_required`
  - Analise e persistida com `status_avaliacao = "incompleta"` e motivo
    explicito no campo de erro
  - No card daquela analise no dashboard Torre de Controle, aparece banner
    "Conexao Google expirou \u2014 [Reconectar]" + botao "Retentar analise"
  - Ao reconectar, o botao retentar invoca `runAnalysis` com o mesmo
    `projetoFaseId` e o novo token
  - **NAO** implementar auto-retry/fila de jobs aguardando reauth \u2014 mantem
    simples, alinhado com Block-on-trigger.

- **D-05 (Profile-page para gerenciar conexao):** Nova pagina `/perfil` (ou
  aba dentro do painel admin existente, se couber organicamente) com card
  "Conexao Google" mostrando:
  - Email conectado
  - Data de conexao
  - Status (ativo/expirado/revogado)
  - Botao "Desconectar" (revoga o refresh_token remotamente via
    `oauth2.googleapis.com/revoke` + deleta o registro do DB)
  - Botao "Reconectar" (quando expirado/revogado)

### Vision em imagens de Slides

- **D-06 (Vision sempre em todas as imagens):** Toda imagem embutida em Google
  Slides passa por GPT-4o com `detail=high` (mesmo modelo e configuracao ja
  usados no branch `figma` do workflow n8n atual). Sem threshold por tamanho,
  sem flag opt-in, sem diferenciacao por contexto.
  - Justificativa: custo real e baixo (~$0.002-0.005 por imagem a 1500 tokens
    output, totalizando ~$0.10-0.20 por apresentacao tipica de 40 imagens).
    A paridade com o branch figma preserva a densidade semantica da auditoria
    que alimenta o RAG.
  - Reusa infra existente: mesmo prompt base do node `Analyze image` do
    workflow atual (ver `.planning/research/n8n-workflow-auditoria-saber-interno.md`
    secao 6.1).

### Claude's Discretion

Areas que nao foram discutidas explicitamente. Planner/researcher tem
flexibilidade, mas devem documentar a escolha no PLAN.md/RESEARCH.md:

- **Estrategia de cutover:** Como migrar de n8n para interno sem quebrar
  producao. Recomendacao default: feature-flag por plataforma
  (`INTERNAL_EXTRACTORS=transcricao,google,figma,miro` em `.env`), com
  `tc-analyzer.js` escolhendo a rota por plataforma. Validar paridade com
  amostras reais antes de ativar cada plataforma. Ultimo passo do cutover e
  remover `extractViaN8n`.

- **Criptografia do `refresh_token`:** Recomendacao default: AES-256-GCM em
  Node com chave em env var `TOKEN_ENC_KEY` (32 bytes base64). Alternativa:
  pgcrypto nativo do Postgres (mais simples, chave fica no DB \u2014 menos seguro).
  Sem KMS externo (Easypanel nao oferece).

- **Paginacao Miro:** Research doc ja identificou que o workflow atual so le
  pagina 1 de `/items` (truncando boards grandes). Implementacao interna deve
  paginar via cursor. Apenas execucao, nao decisao.

- **Sequencia Vision + narrativa nos Slides:** Se deve emitir uma "narrativa
  auditorial final" estilo `auditoria_narrativa_integral` do branch figma
  (GPT-4.1 JSON schema) ou retornar apenas texto estruturado + descricoes de
  imagens inline deixando `analyzeText` fazer a auditoria. Planner decide
  com base em paridade com o output atual.

- **Schema exato das tabelas novas:** `google_oauth_tokens` (user_id,
  refresh_token_enc, access_token, expires_at, scopes, connected_at,
  last_used_at, revoked_at, error_message). Planner refina.

- **Estrategia de rate-limit para GPT-4o vision em lote:** `p-limit` ou
  `bottleneck` ou reutilizar o `createRateLimiter` ja existente em
  `server/lib/rate-limiter.js`. Planner decide.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Decisao e direcionamento
- `.planning/notes/decisao-internalizacao-extracao-tc.md` \u2014 Decisao arquitetural
  consolidada (OAuth per-user, APIs nativas, Figma/Miro centralizado, cutover total)
- `.planning/seeds/upload-pdf-arbitrario-tc.md` \u2014 Seed relacionado (upload PDF
  com `pdf-parse`/`tesseract.js` + Mistral retry) para contextualizar o que
  **nao** entra nesta fase

### Research tecnico do workflow atual
- `.planning/research/n8n-workflow-auditoria-saber-interno.md` \u2014 Documentacao
  completa do workflow `uiUUXegcBHe3z2fg`: fluxo por branch, APIs externas,
  prompts OpenAI (secao 6), dependencias, plano de implementacao interno
  (secao 8), checklist de desacoplamento (secao 9)
- `.planning/research/n8n-extraction-webhook-shapes.md` \u2014 Shapes de input/output
  esperados por cada branch

### Pergunta resolvida durante discuss
- `.planning/research/questions.md` \u2014 Q1 (ownership do token OAuth) resolvida
  aqui por D-01/D-02. Apos planning, esta pergunta pode ser marcada como
  respondida ou migrada para um ADR se fizer sentido para o projeto.

### Codebase atual
- `server/services/tc-analyzer.js` \u2014 Contem `extractViaN8n` (a funcao a ser
  substituida), `runAnalysis`, `runFinalReport`, `getOrExtract`,
  `PLATFORM_TO_N8N` (mapping slides/reuniao/transcricao/figma/miro)
- `server/services/tc-job-worker.js` \u2014 Background worker que consome jobs e
  chama `runAnalysis`. Precisa passar a receber `user_id` do trigger-owner
- `server/routes/auth.js` \u2014 Ja implementa OAuth Google (login apenas, sem
  `drive/docs/presentations.readonly`). Base para expandir escopos e
  armazenar refresh_token
- `server/routes/torre-controle.js:196-200, 668-712` \u2014 Confirma mapping
  `dashboards_hub.users.kommo_user_id` <-> `tc_kommo_users.id`
- `server/lib/rate-limiter.js` \u2014 Rate limiter reutilizavel; `n8nLimiter` em
  tc-analyzer.js deve virar `extractorLimiter` na versao interna
- `server/lib/db.js` \u2014 Pool Postgres com `SET search_path TO dashboards_hub`

### APIs externas (docs oficiais)
- Google Slides API: https://developers.google.com/slides/api/reference/rest
  (metodo `presentations.get` retorna estrutura completa com slides ordenados,
  text boxes, tabelas, speaker notes, IDs de imagens)
- Google Docs API: https://developers.google.com/docs/api/reference/rest
  (metodo `documents.get` retorna `body.content[]` com paragraphs, textRuns,
  tables, headings)
- Google Drive API: https://developers.google.com/drive/api/reference/rest/v3
  (`files.get?alt=media` para baixar binarios de imagens referenciadas em
  slides)
- OAuth 2.0 Google: https://developers.google.com/identity/protocols/oauth2/web-server
  (escopos `drive.readonly` + `documents.readonly` + `presentations.readonly`)
- Figma REST API: https://www.figma.com/developers/api (files, images)
- Miro REST API v2: https://developers.miro.com/reference/api-reference
  (boards, items, resources/images \u2014 **paginacao via cursor** deve ser
  implementada aqui)
- Mistral OCR: https://docs.mistral.ai/capabilities/OCR/ (ficara dormant
  nesta fase)

### Ecossistema/design
- `.planning/codebase/INTEGRATIONS.md` \u2014 Mapa de todas as integracoes externas
  (atualizar apos cutover removendo n8n extract webhook)
- `.planning/codebase/STACK.md`, `ARCHITECTURE.md`, `CONVENTIONS.md` \u2014
  Padroes gerais do projeto que o planner deve respeitar

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **OAuth Google flow (login)**: `server/routes/auth.js:55-157` ja implementa
  troca de code por tokens via fetch manual (sem Passport, sem googleapis).
  **Ja usa `access_type: offline`**, o que significa que o Google ja devolve
  `refresh_token` hoje \u2014 so nao estamos armazenando. Serve de base direta
  para adicionar `/api/auth/google/connect-drive` (flow secundario com
  escopos de leitura de Docs/Slides).
- **Rate limiter reutilizavel**: `server/lib/rate-limiter.js` expoe
  `createRateLimiter({ type, maxConcurrent, maxRpm })` e `withRetry`. Ja usado
  para n8n (`n8nLimiter` em tc-analyzer.js); versao interna pode criar um
  `extractorLimiter` compativel.
- **Cache de extracao**: tabela `dashboards_hub.tc_extracoes` com chave
  `(lead_id, url_origem)` \u2014 mantem o cache-by-URL atual, que nao precisa
  mudar com OAuth per-user (o conteudo do arquivo nao muda com o usuario).
  Hash SHA-256 do conteudo ja persistido em `hash_conteudo`.
- **Background job system**: `server/services/tc-job-worker.js` ja consome
  uma fila de jobs persistidos e chama `runAnalysis` com progress callbacks
  \u2014 adicionar `user_id` no job payload mantem retrocompatibilidade.
- **Kommo user mapping**: `dashboards_hub.tc_kommo_users` + coluna
  `kommo_user_id` em `users` ja existem, usadas em torre-controle.js para
  filtrar leads por responsavel. Fallback D-02 reutiliza esse mapping
  diretamente.
- **DB layer**: `server/lib/db.js` com pool Postgres e `SET search_path` ja
  configurado. Migracoes SQL seguem padrao `NNN_description.sql` \u2014 adicionar
  `002_google_oauth_tokens.sql` (ou o proximo numero disponivel).
- **Auto-post Kommo nota**: logica de `autoPostEnabled` via env var em
  tc-analyzer.js e padrao a seguir para flags operacionais (ex:
  `INTERNAL_EXTRACTORS`).

### Established Patterns

- **Servicos backend**: `server/services/*.js` como ESM modules com
  exports nomeados (`runAnalysis`, `extractViaN8n`, etc.). Extratores novos
  seguem `server/services/extractors/*.js` conforme proposto no research doc
  secao 8.
- **Error handling**: `try/catch` com `console.error(\`[${new Date().toISOString()}]\`, ...)` padrao. Erros de extracao
  sao capturados por-plataforma em `runAnalysis` sem abortar o pipeline \u2014
  novos erros tipados (`google_reauth_required`) devem seguir mesmo padrao.
- **API externa**: `globalThis.fetch` direto com `AbortSignal.timeout(N)`
  ao inves de axios. `node-fetch v3` so quando precisa \u2014 `globalThis.fetch`
  e preferencial no Node 20+ nativo.
- **Config de servicos**: env vars no `.env`, lidas com `process.env.X`
  direto (sem wrapper dotenv por servico). Padrao de nomeacao:
  `SCREAMING_SNAKE_CASE`.
- **Encriptacao**: nao ha padrao estabelecido no projeto hoje (nenhum
  segredo em DB). Planner precisa introduzir \u2014 recomendacao: biblioteca
  `node:crypto` nativa com AES-256-GCM.

### Integration Points

- **Tc-analyzer dispatch**: `PLATFORM_TO_N8N` em tc-analyzer.js:27 e o ponto
  unico de roteamento. Substituir por `dispatchExtractor(platform, url, userId)`
  que chama o extrator correto interno.
- **Frontend trigger**: `client/dashboards/TorreDeControle/` chama API que
  dispara job. Ponto de intercepcao Block-on-trigger: o handler Vue antes de
  POSTar o trigger precisa verificar `GET /api/google/status` e abrir modal
  se nao conectado.
- **Admin/Profile UI**: `client/dashboards/AdminPanel/` (ou equivalente)
  tem o padrao de card + modal reaproveitavel para o card "Conexao Google".
- **Sessao do user**: `req.session.user.id` disponivel nas rotas autenticadas
  \u2014 ja flui naturalmente para `user_id` do job.

</code_context>

<specifics>
## Specific Ideas

- **"4o normal" \u2014 user explicitou que quer o mesmo GPT-4o ja usado no
  workflow n8n atual, nao um modelo mais caro.** Paridade total com o branch
  figma para imagens de Slides.
- **Workflow n8n arquivado, nao deletado**: manter como referencia historica
  no n8n (padrao ja usado em outros workflows descontinuados do ecossistema
  STACKS).
- **Reuso de prompts**: os prompts OpenAI do workflow atual (secao 6 do
  research doc) devem ser portados **literalmente** para a implementacao
  interna \u2014 mudanca de prompt muda qualidade da auditoria e afeta paridade.
  Planner deve copia-los em comentarios dos extratores internos, nao
  reescreve-los.
- **Scope minimo de OAuth Google**: `drive.readonly` + `documents.readonly`
  + `presentations.readonly`. Escopos adicionais (ex: `drive.metadata.readonly`)
  so se research identificar necessidade concreta.

</specifics>

<deferred>
## Deferred Ideas

- **Upload de PDF arbitrario** \u2014 seed em
  `.planning/seeds/upload-pdf-arbitrario-tc.md`. Trigger: quando aparecer
  demanda de analisar PDFs fora do Google. Nao entra nesta fase.
- **Domain-Wide Delegation (DWD) do Google Workspace** \u2014 avaliado em
  `/gsd-explore` e descartado em favor de OAuth per-user (user escolheu
  este caminho explicitamente). Nao entra nesta fase e nao virou seed.
- **Scheduled auto-extraction ao detectar mudanca de fase no Kommo** \u2014
  D-02 prepara o schema para suportar (campo `triggered_by_user_id`
  nullable, fallback Kommo-resp), mas a deteccao automatica e a scheduled
  job loop ficam fora do escopo desta fase.
- **Auto-retry quando usuario reconecta Google** \u2014 D-04 escolhe
  "fail-mark" em vez de "auto-retry com fila de waiting_reauth". Pode
  virar follow-up se a UX de botao "retentar" se mostrar fraca na pratica.
- **Google Picker API** como alternativa de consent por arquivo \u2014
  avaliado em `/gsd-explore` e descartado em favor de OAuth 1x. Registrado
  aqui caso o comportamento atual precise ser revisado.

### Reviewed Todos (not folded)

Nenhum todo pendente foi encontrado via `gsd-tools todo match-phase 4`.

</deferred>

---

*Phase: 04-internalizacao-do-extrator-torre-de-controle*
*Context gathered: 2026-04-18*
