# Verificacao de Dados dos Dashboards — 2026-04-24

Auditoria completa dos 7 dashboards do hub. Todos os webhooks GET respondem HTTP 200. O codigo Vue consome a estrutura correta em todos os casos. As pendencias abaixo estao **na fonte** (planilha Google / workflow n8n), nao no codigo do dashboard.

## Itens corrigidos no codigo

- [x] `CLAUDE.md`: atualizada a secao "Comparativo Entre Squads — Estrutura de Dados" para refletir o formato real retornado (`Mês` em `dd/mm/yyyy`, campos com espacos/acentos, valores numericos)
- [x] `config/dashboards.json`: removido `apiEndpoint: API_ENDPOINT_TORRE_DE_CONTROLE` (dead config — Torre de Controle usa `/api/tc/*` direto)
- [x] `server/routes/api.js`: `/api/data/:id` agora retorna 404 com mensagem clara quando o dashboard nao usa rota generica (antes: 500 com `undefined`)
- [x] `.env.example`: `API_ENDPOINT_MARKETING_VENDAS` e `WEBHOOK_POST_MARKETING_VENDAS` comentados (dashboard esta `hidden:true`)
- [x] `client/dashboards/GtmMotion/index.vue`: banner amarelo de staleness aparece quando `last_updated` do payload n8n > 3 dias

## Itens que precisam de acao manual do Pietro

### 🔴 Bloqueador operacional

**1. Workflow GTM Motion parado ha 7 dias**

- Ultimo `last_updated` no payload: `2026-04-17T10:09:42Z`
- Hoje: `2026-04-24`
- Workflow n8n: `2sVzeUPxpwI6lsK2` (GTM Motion Dev) — **nao configurado** no `.env` como `WEBHOOK_POST_GTM_MOTION`
- O `WEBHOOK_POST_GTM_MOTION` aponta para outro ID: `3e382909-9108-4613-b2c5-971c349b9348`
- `config/dashboards.json` tem `workflowId: "TIeM6pFS2XKAoXS6dRIRu"` para prod e `2sVzeUPxpwI6lsK2` para dev — inconsistencia entre qual e o workflow "oficial"

**Acao sugerida:** logar no n8n Easypanel (`ferrazpiai-n8n-editor.uyk8ty.easypanel.host`), localizar o workflow GTM Motion ativo, verificar se esta ativado (toggle), verificar execucoes recentes e erros. Confirmar qual ID de workflow e o canonico e alinhar `dashboards.json` + `.env`.

### 🔴 Dado incorreto na fonte

**2. GTM Motion: `leads_value == mql_value` em todos os meses**

| Mes | Leads | MQL | CR1 (MQL/Leads) |
|---|---|---|---|
| 2025-11 | 1 | 1 | 100% |
| 2026-01 | 186 | 186 | 100% |
| 2026-02 | 802 | 802 | 100% |
| 2026-03 | 632 | 632 | 100% |
| 2026-04 | 920 | 920 | 100% |

A taxa de qualificacao (CR1) esta sempre em 100%, o que invalida o scorecard. Provavelmente o workflow n8n (ou a query na planilha) esta igualando `mql_value` a `leads_value` em vez de usar uma regra real de MQL (ex: "etapa >= Apresentacao" ou "qualificado = true").

**Acao sugerida:** abrir o workflow GTM Motion no n8n e inspecionar o node que calcula `mql_value`. Se for pull da planilha, corrigir a formula na coluna MQL.

**3. GTM Motion: `investimento = R$ 0` em abril/2026**

Todos os canais de abril retornam `investimento: 0`. Em meses anteriores havia valor:

- Jan: R$ 194.020
- Fev: R$ 235.708
- Mar: R$ 224.142
- **Abr: R$ 0**

Isso quebra o calculo de ROAS/CAC do mes atual.

**Acao sugerida:** verificar se as despesas de midia de abril foram lancadas na planilha fonte. Se sim, verificar se o node do n8n que busca `investimento` tem filtro de mes errado.

### 🟡 Gaps de dado (verificar se e intencional)

**4. GTM Motion: dezembro/2025 ausente**

KPIs e listagem pulam de 2025-11 (1 lead unico) direto para 2026-01 (186 leads). Se o time nao comecou a medir GTM Motion no comeco de janeiro/2026, e intencional. Se a expectativa era ter dezembro/2025, e gap de dado.

**5. Tx Conv Saber → Monetizacao: volume muito baixo**

- Leads Saber: 38
- Leads Monetizados: 15
- Taxa: 39.5%

Esses numeros parecem baixos para uma operacao ativa. Pode ser:
- Filtro de safra muito restritivo (so considera safras recentes)
- Problema no join entre os dois pipelines Kommo
- Operacao realmente tem esse volume

**Acao sugerida:** logar no Kommo, conferir quantos leads existem no pipeline Saber (ID `12925780`) e quantos passaram para o de Monetizacao. Se bater com 38/15, e realidade. Se nao bater, revisar o workflow Tx Conv.

### 🟡 Validacao com financeiro

**6. Raio-X Financeiro: EBITDA negativo em todos os meses de 2026 (DRE)**

DRE mostra prejuizo operacional em Jan-Set/2026 (-R$ 222k a -R$ 325k por mes). Caixa realizado mostra mix (+R$ 151k em Jan, -R$ 278k em Abr).

**Acao sugerida:** validar com area financeira se esses numeros batem com a realidade. Se sim, tudo certo. Se nao, investigar planilha fonte do DRE.

### 🟡 Qualidade de dado

**7. Comparativo Squads: `V4X` vs `V4x` duplicados**

A API retorna ambas as grafias em linhas diferentes (32 rows "V4X", 2 rows "V4x"). O dashboard normaliza via `SQUAD_ALIASES` entao a UI agrega corretamente. Mas a fonte (planilha) tem o dado sujo.

**Acao sugerida:** padronizar o nome do squad na planilha fonte para uma grafia so.

**8. Comparativo Squads: 1 linha com Squad vazio**

Cliente `FUNDICAO SOBRALENSE LTDA` em `01/04/2026` vem com `Squad: ""`. O dashboard descarta, mas o cliente some do relatorio.

**Acao sugerida:** atribuir esse cliente a um squad na planilha fonte.

## Resumo

| Dashboard | Status |
|---|---|
| Tx Conv Saber → Monetizacao | 🟢 OK, volume baixo — confirmar |
| GTM Motion | 🔴 3 problemas criticos na fonte |
| Raio-X Financeiro | 🟡 Validar DRE com financeiro |
| NPS Satisfacao | 🟢 OK |
| Comparativo Squads | 🟡 V4X/V4x e squad vazio na fonte |
| Fechamento Financeiro Squads | 🟢 OK (ainda em dev, aguardando ERP) |
| Torre de Controle | 🟢 OK — sync Kommo rodou hoje |
