# Torre de Controle — Ajustes visuais, Análise Consolidada e Kommo multi-produto

**Data:** 2026-04-17
**Status:** Draft — aguardando revisão
**Autor:** Pietro (via Claude)
**Dashboard afetado:** `client/dashboards/TorreDeControle/`

---

## 1. Contexto

A Torre de Controle é o dashboard que visualiza leads do pipeline **Saber** (Kommo) em formato de matriz de fases. Cada célula da matriz mostra um dot colorido com o score da análise IA daquela fase, e a fase atual do lead é destacada com um anel. Ao clicar num dot, abre-se o `TcSuperPainel` com o detalhe da análise daquela fase, e o usuário pode disparar análises IA por fase ou em lote.

Três fricções foram identificadas pelo usuário:

1. **Visual do anel vermelho + legenda "bolinha vermelha = fase atual"** colidem semanticamente com o dot vermelho "score ruim" — confunde leitura.
2. **Filtros single-select** (Account, Tier, Fase) limitam comparações entre fatias da carteira — ex: "ver clientes do Account X **e** Y, com Tier Medium **ou** Large".
3. **Fluxo "Analisar todas as fases"** dispara várias análises paralelas sem uma consolidação clara — para clientes em "Projeto Concluído" falta um relatório único que valide o projeto e destaque avanço, qualidade do time e oportunidades de expansão.
4. **Criação de oportunidade no Kommo** pelo atual `TcKommoLeadForm` exige `statusId` manual, aceita 1 produto por vez, e não aproveita o conhecimento da IA (probabilidade de fechamento, justificativa, mapeamento para produto Kommo).

## 2. Objetivos

- Alinhar o destaque visual da fase atual ao design system (preto / branco / vermelho reservado para "ruim").
- Permitir recortes combinados na matriz via filtros multi-select.
- Reforçar o bloqueio `fase auditável = ordem < fase_atual` também dentro do `TcSuperPainel` (timeline).
- Substituir o botão "Analisar todas as fases" por uma **Análise Consolidada** dedicada à fase "Projeto Concluído", com 3 eixos de destaque (Avanço, Qualidade do Time, Oportunidades).
- Transformar a criação de oportunidade Kommo num fluxo único multi-produto (até 4 produtos por lead) apontado sempre para o pipeline Expansão (`12184212`), sem etapa manual, aproveitando sugestões da IA (probabilidade, justificativa, produto/categoria Kommo sugeridos).

## 3. Fora de escopo

- Novos dashboards ou novas fases no pipeline Saber.
- Alterações no fluxo de sync Kommo (`kommo-sync.js`) — continua disparando sob demanda.
- Alterações no `TcPainelGeral` (modo admin) — permanece intocado.
- Lógica de permissões de acesso (RBAC) — permanece igual.
- UI dos outros dashboards — apenas `TorreDeControle/`.
- Backfill/migração de análises históricas para o novo JSON schema — análises antigas continuam renderizando com os campos que existem; apenas novas análises após este deploy terão os campos `avanco` / `qualidade_time` / `probabilidade_fechamento` / `justificativa` / `kommo_produto_id` / `kommo_categoria_id`.

---

## 4. Ajuste 1 — Anel da fase atual: vermelho → branco

### 4.1 Problema

Hoje, em `TcMatrizTable.vue:231-245`, a classe `.dot--atual` aplica um `outline: 2px solid #ff0000` + `box-shadow` vermelho + um `::after` com borda vermelha pulsante para marcar a fase atual do lead. O `ring` vermelho se sobrepõe a dots que também podem ser vermelhos (score < 5), causando dois problemas:

- Leitura ambígua: um anel vermelho ao redor de um dot vermelho confunde "fase atual com score ruim" vs "fase atual sem análise".
- Semântica do design system V4: vermelho está reservado para alertas/ruim. O destaque de "estado atual" deveria ser neutro (branco).

### 4.2 Mudança

- `.dot--atual`: trocar `outline`, `box-shadow` e borda do `::after` de vermelho (`#ff0000` / `rgba(255,0,0,*)`) para **branco** (`#ffffff` / `rgba(255,255,255,*)`).
- A animação `pulse-ring` permanece — apenas a cor muda.
- Intensidade: manter a mesma opacidade base do vermelho atual (0.5 no box-shadow, 0.3 no ::after, 0.6→0 no pulse) — testar visualmente e ajustar se o branco ficar muito "lavado" sobre o fundo escuro (`#141414`). Se precisar, subir para 0.7 / 0.4.

### 4.3 Legenda

- `index.vue:100` — atualizar texto de `"Anel vermelho = fase atual do lead"` para `"Anel branco = fase atual do lead"`.
- `index.vue:410-414` — classe `.dot--atual-mini` usa `outline: 2px solid #ff0000`; trocar para branco.

### 4.4 Critério de aceite

- Abrir a matriz; leads na fase "Fase 3" (por exemplo) têm a coluna "Fase 3" com anel **branco** ao redor do dot, independente da cor do dot.
- Legenda (popover `Info` no topo) mostra "Anel branco = fase atual" com a amostra visual em branco.
- Nenhum outro uso de `#ff0000` no design system é afetado (anel é um uso localizado).

---

## 5. Ajuste 2 — Filtros multi-select (Account, Tier, Fase)

### 5.1 Problema

Em `index.vue:52-72`, os filtros Account, Tier e Fase são `<select>` nativos com valor único mais a opção "Todos/Todas". Não dá para comparar dois Accounts ou três Tiers lado a lado sem alternar manualmente.

### 5.2 Componente `VMultiSelect.vue` (novo, em `client/components/ui/`)

Componente reutilizável para qualquer filtro multi-select da aplicação. Assinatura:

```
props:
  label: String        // "Account", "Tier", "Fase"
  options: Array       // [{ value, label }] ou [String]
  modelValue: Array    // array de values selecionados (v-model compatível)
  placeholder: String  // "Todos" por padrão
emits:
  update:modelValue
```

**Comportamento:**
- Botão trigger com label + contador (ex: "Account", "Account (3)" quando 3 marcados).
- Click abre dropdown (popover absolute, alinhado ao botão, fundo `#141414`, border `rgba(255,255,255,0.1)`).
- Dropdown tem: header "Selecionar tudo / Limpar", lista de checkboxes com labels.
- Clique fora fecha o dropdown.
- Nada marcado = sem filtro (mostra todos) — array vazio `[]`.
- Acessibilidade: setas para navegar, Space/Enter para marcar, Esc para fechar.
- Estilo consistente com `.filter-group` / `.filter-select` existentes (fundo `#1a1a1a`, border `#222`, radius 6px, altura alinhada com input de busca).

### 5.3 Integração em `index.vue`

Substituir os 3 `<select>` por `<VMultiSelect>`:

```
<VMultiSelect label="Account" :options="accountsDisponiveis" v-model="accountsSelecionados" />
<VMultiSelect label="Tier"    :options="tiersDisponiveis"    v-model="tiersSelecionados" />
<VMultiSelect label="Fase"    :options="fasesOpcoes"         v-model="fasesSelecionadas" />
```

**State changes:**
- `accountSelecionado: Ref<String>` → `accountsSelecionados: Ref<String[]>` (default `[]`).
- `tierSelecionado: Ref<String>` → `tiersSelecionados: Ref<String[]>` (default `[]`).
- `faseSelecionada: Ref<String>` → `fasesSelecionadas: Ref<Number[]>` (default `[]`).
- Novo computed `fasesOpcoes` mapeia `fasesMatriz` para `[{ value: id, label: nome }]`.

**Filtro `clientesFiltrados` (`index.vue:240-262`):**

```
if (accountsSelecionados.value.length) {
  lista = lista.filter(c => accountsSelecionados.value.includes(c.account))
}
if (tiersSelecionados.value.length) {
  lista = lista.filter(c => tiersSelecionados.value.includes(c.tier))
}
if (fasesSelecionadas.value.length) {
  lista = lista.filter(c => fasesSelecionadas.value.includes(c.fase_atual_stage_id))
}
```

Semântica: **OR dentro do filtro** (passa se bater qualquer valor marcado), **AND entre filtros** (todos os filtros ativos precisam passar). Alinhado com a expectativa natural de "ver Account X **ou** Y, com Tier Medium **ou** Large".

### 5.4 Critério de aceite

- Abrir o dropdown de Account, marcar 2 accounts → matriz mostra apenas clientes desses 2 accounts.
- Adicionar filtro Tier com Medium + Large → matriz mostra clientes (Account 1 OU 2) **E** (Tier Medium OU Large).
- Desmarcar tudo de um filtro → filtro desaparece do set ativo (mostra todos naquela dimensão).
- Contador do filtro reflete quantos estão marcados.
- `busca` (input texto) continua funcionando em combinação com os filtros.

---

## 6. Ajuste 3 — Bloqueio de fase no `TcTimelineFases` (dentro do SuperPainel)

### 6.1 Problema

Em `TcMatrizTable.vue:78-83`, a função `isAuditavel(cliente, fase)` bloqueia o clique em fases atuais/futuras (`ordem < fase_atual_ordem`). Mas ao abrir o `TcSuperPainel`, o `TcTimelineFases.vue` renderiza **todas** as fases como clicáveis (sem nenhum gate). Isso permite o usuário navegar até uma fase que ainda não ocorreu e tentar disparar análise — resultando em erros ou análises vazias.

### 6.2 Mudança em `TcTimelineFases.vue`

**Props:** adicionar `faseAtualOrdem: Number` (ordem da fase atual do lead, vinda de `props.cliente.fase_atual_ordem`).

**Computed por step:**
```
auditavel: f.ordem < props.faseAtualOrdem
```

**Template:**
- Aplicar classe `step--bloqueada` quando `!auditavel`.
- `@click` dispara `emit('select', item.id)` apenas se `auditavel`.
- Atributo `title` no `<div class="step">`: "Fase auditável — clique para ver análise" | "Fase atual do lead — aguardando avanço" | "Fase futura — ainda não ocorreu".

**Estilo:**
- `.step--bloqueada { opacity: 0.35; cursor: not-allowed; }`
- `.step--bloqueada:hover { background: transparent; }` (sobrescreve hover).

### 6.3 Integração em `TcSuperPainel.vue`

- Passar nova prop: `:fase-atual-ordem="cliente.fase_atual_ordem"` ao `<TcTimelineFases>` (linha ~257).
- `faseAtiva` inicial: se `props.faseInicial` não está entre as fases auditáveis, cair para a última auditável (ordem mais alta < fase_atual_ordem) ou `null`.

### 6.4 Comportamento especial — fase "Projeto Concluído"

A fase "Projeto Concluído" (ordem 6) só entra na matriz quando o lead realmente está nela (`status_id = 100273444`). Nesse caso:
- `fase_atual_ordem = 6` → todas as fases anteriores (1-5) são auditáveis.
- A própria fase "Projeto Concluído" é a **fase atual** → fica bloqueada pela regra geral (`ordem < 6`).

**Exceção:** a fase atual do lead **nunca é clicável pela timeline**, mas o rodapé do SuperPainel continua mostrando o CTA "Gerar/Regenerar Análise Consolidada" quando o slug é `projeto-concluido` (ver Seção 7). A timeline é só navegação histórica.

### 6.5 Critério de aceite

- Cliente em Fase 3: no `TcSuperPainel`, timeline exibe Fase 1 e Fase 2 clicáveis (opacidade normal); Fase 3, 4, 5 e Projeto Concluído bloqueadas (opacidade 0.35, cursor not-allowed, tooltip apropriado).
- Clicar numa fase bloqueada não altera `faseAtiva` e não faz requisição.
- Cliente em Projeto Concluído: timeline exibe Fases 1-5 clicáveis; "Projeto Concluído" fica bloqueada na timeline mas o CTA da Seção 7 aparece no rodapé.

---

## 7. Análise Consolidada — remoções e substituição do CTA

### 7.1 Remoções em `TcSuperPainel.vue`

Remover integralmente:

- Botão "Analisar todas as fases" do rodapé (linhas ~383-391).
- Hint do vazio-state ("ou use 'Analisar todas as fases' no rodapé") (linha ~283).
- Função `analisarTodasFases` (linhas ~82-112).
- Constantes `FASES_ORDEM_SLUG` (linhas 66-72), `STAGE_BY_ORDEM` (linha 114).
- Computed `fasesAuditaveis` (linhas 75-78) e ref `analisandoTudo` (linha 80).

Justificativa: esse fluxo disparava N análises paralelas sem consolidar. A Análise Consolidada substitui essa necessidade com um relatório único e rico.

### 7.2 Substituição do CTA na fase "Projeto Concluído"

Na fase com slug `projeto-concluido`:

**Sem análise ainda (vazio state em `sp-vazio`, linhas ~271-286):**
- Trocar o botão "Analisar agora" (linhas 278-281) por "Gerar Análise Consolidada" (ícone `sparkles` ou `file-check`).
- Ajustar copy do `VEmptyState` para contexto consolidado: título "Projeto pronto para validação" + descrição "Gere o relatório final que consolida todas as fases auditadas, avalia o avanço do cliente, a qualidade do time e mapeia oportunidades de expansão."

**Com análise já gerada (sp-body normal, linhas ~292+):**
- Rodapé `sp-actions` em vez de "Re-analisar fase atual" mostra **"Regenerar Análise Consolidada"** com um tooltip "Cria nova versão do relatório final". Mantém o `<span class="sp-versao">` com o número da versão.

**Nas outras fases (1-5):**
- Rodapé continua só com "Re-analisar fase atual" (fluxo atual).
- Sem referência a "todas as fases".

### 7.3 Lógica de handler

- `analisarFase()` (linha 116) já detecta `slug === 'projeto-concluido'` e chama `tc.analisarFinal(...)`. Mantém essa função — só o **texto do botão** muda e a UI passa a exibi-la de forma destacada.
- Novo computed `isFaseProjetoConcluido = detalhe.value?.fase?.fase_slug === 'projeto-concluido'` para simplificar templates.
- Botão "Regenerar Análise Consolidada" quando `isFaseProjetoConcluido && analiseAtual` deve confirmar antes de rodar: `confirm("Gerar nova versão? A versão anterior fica preservada no histórico.")` — evita custo acidental de IA em projetos grandes.

### 7.4 Critério de aceite

- Navegar até um cliente em Fase 3 no `TcSuperPainel`: rodapé mostra só "Re-analisar fase atual" (sem "Analisar todas"). Nenhum erro de console por símbolos removidos.
- Navegar até um cliente em Projeto Concluído sem análise: vazio state exibe "Projeto pronto para validação" + botão "Gerar Análise Consolidada" (estilo primary, vermelho V4).
- Clicar → dispara job `analyze_final` → progress renderizado pelo `TcJobProgress` (já existente).
- Após job completar: sp-body renderiza com todos os novos campos (Seções 8-9); rodapé mostra "Regenerar Análise Consolidada" + versão.
- Clicar "Regenerar" exibe confirm; aceitar dispara nova versão.

---

## 8. Análise Consolidada — prompt da IA + JSON schema

### 8.1 Ajuste em `tc-analyzer.js::runFinalReport` (linhas 149-244)

**Novos inputs passados ao IA:**

Hoje o prompt envia `ragContext` + `historicoFases` (resumo textual de cada análise anterior). Adicionar:

1. **Catálogo de produtos Kommo** — array `[{ id, nome }]` dos enums do custom field `Produto 1` (1989765), lidos de `fields.json` e expostos em `kommo-client.js` como `KOMMO_PRODUTOS`. Passar no prompt para que o IA escolha `kommo_produto_id` da lista real.
2. **Catálogo de categorias Kommo** — 4 valores do custom field `Categoria do Produto 1` (1989793): Saber, Ter, Executar, Potencializar. Expostos como `KOMMO_CATEGORIAS`.
3. **Catálogo de soluções Kommo** — enums do custom field `Solução` (1989934). Expostos como `KOMMO_SOLUCOES`.
4. **Dados brutos de cada fase** (não só resumo): score, dores, oportunidades, veredicto, nome da fase — para o IA calcular tendência e deltas.

**Lista de catálogos exposta:** criar helper em `kommo-client.js`:
```
export function getKommoCatalogos() {
  return {
    produtos: KOMMO_PRODUTOS,      // [{ id, nome }]
    categorias: KOMMO_CATEGORIAS,  // [{ id, nome }]
    solucoes: KOMMO_SOLUCOES       // [{ id, nome }]
  }
}
```
Os enums são lidos do arquivo `fields.json` em tempo de build (hardcoded como constantes, já que mudam raramente). Caso contrário, adicionar fetch único na inicialização do worker com cache em memória.

### 8.2 Novo system prompt

Substituir o system prompt em `tc-analyzer.js:189-201`:

```
Voce e um auditor senior da V4 Company encerrando um projeto do pipeline Saber.
Gere o RELATORIO FINAL CONSOLIDADO avaliando a jornada completa do cliente em 3 eixos:
AVANCO DO CLIENTE, QUALIDADE DO TIME, OPORTUNIDADES DE EXPANSAO.

Retorne JSON valido com os seguintes campos:

// Campos existentes (mantidos)
- score: number 0-10  (media ponderada final do projeto)
- veredicto: string  (curto, ex: "Projeto de sucesso com upsell claro")
- resumo: string  (texto executivo da jornada completa)
- analise_materiais: string  (o que foi entregue em cada fase)
- percepcao_cliente: { tom, engajamento, confianca } cada 0-10
- dores: [{ descricao, gravidade }]  (dores RESIDUAIS pos-projeto)
- riscos: [{ descricao, tipo, probabilidade, impacto }]  (risco de churn)
- recomendacoes: [{ descricao, tipo, prioridade }]  (proximos passos)

// Campos NOVOS — eixos destacados
- avanco: {
    evolucao: string,             // texto narrativo da evolucao fase a fase
    fases: [{
      fase: string,               // nome da fase (ex: "Fase 1")
      score: number,              // 0-10 da analise daquela fase
      delta: number,              // vs fase anterior (+1.2, -0.5, 0)
      veredicto_curto: string     // max 80 chars
    }],
    tendencia: "ascendente" | "estavel" | "descendente",
    score_inicial: number,        // score da Fase 1
    score_final: number           // score medio das fases auditadas
  }

- qualidade_time: {
    score: number 0-10,
    squad_nome: string,           // nome do squad (do contexto Kommo)
    pontos_fortes: [string],      // 2-5 bullets
    pontos_atencao: [string],     // 2-5 bullets
    observacao: string            // 1-3 frases sobre desempenho geral
  }

- oportunidades: [{
    titulo: string,
    descricao: string,
    valor_estimado: number,       // R$
    probabilidade_fechamento: number 0-100,  // % de aderencia
    justificativa: string,        // por que esse produto faz sentido — 2-4 frases claras
    kommo_produto_id: number,     // id do enum do catalogo.produtos fornecido
    kommo_categoria_id: number,   // id do enum do catalogo.categorias fornecido
    kommo_solucao_id: number      // id do enum do catalogo.solucoes fornecido (opcional, null se nao encaixa)
  }]

REGRAS:
- probabilidade_fechamento: base na historia do cliente (dores alinhadas, score crescente, perfil DISC, budget aparente).
- kommo_produto_id: escolha SEMPRE um id que esta na lista catalogo.produtos. Se nenhum produto do catalogo encaixa, omita o produto.
- Se nao houver fases analisadas (historicoFases vazio), retorne avanco.fases = [] e qualidade_time com observacao "Sem fases auditadas previamente".

Responda APENAS JSON valido, sem markdown.
```

**User prompt (linha 203):**

```
## Contexto do Cliente
{ragContext JSON}

## Historico de Fases Auditadas (dados brutos)
{analisesAnteriores JSON completo — fase, score, dores, oportunidades, veredicto, resumo}

## Catalogos Kommo para mapeamento de oportunidades
Produtos: {KOMMO_PRODUTOS JSON}
Categorias: {KOMMO_CATEGORIAS JSON}
Solucoes: {KOMMO_SOLUCOES JSON}
```

### 8.3 Persistência

A tabela `tc_analises_ia` já tem coluna `oportunidades JSONB`. Os novos campos (`avanco`, `qualidade_time`) ainda não existem — 3 opções:

- **A) JSON único em nova coluna `consolidado JSONB`** — adicionar migration `011_tc_analise_consolidada.sql` com `ALTER TABLE ... ADD COLUMN consolidado JSONB`. Mantém oportunidades onde já está.
- **B) Expandir coluna `contexto_rag`** para guardar `avanco` e `qualidade_time` como parte do metadata.
- **C) Duas novas colunas tipadas** (`avanco JSONB`, `qualidade_time JSONB`).

**Recomendado: A** (uma coluna `consolidado` JSONB guardando `{ avanco, qualidade_time }`). Mantém `oportunidades` na coluna existente (já usada pelos outros fluxos). Migration simples, sem impacto em análises antigas (a coluna nasce nullable).

### 8.4 Output do `runFinalReport`

Hoje retorna `{ analiseId, versao, score, tipo: 'final_report' }`. Não precisa mudar — o frontend busca o registro completo via `tc.carregarDetalheFase()`, que já traz toda linha de `tc_analises_ia`. A rota `/cliente/:id/fase/:faseId` (torre-controle.js:208) retorna `analises` do DB, e uma vez que incluir a coluna `consolidado`, fica disponível no frontend sem mudança na API.

### 8.5 Critério de aceite

- Rodar Análise Consolidada num cliente com 5 fases auditadas — JSON persistido tem `consolidado.avanco.fases` com 5 entries, cada uma com fase/score/delta/veredicto_curto.
- `consolidado.qualidade_time.squad_nome` bate com o squad do lead no Kommo.
- Cada oportunidade gerada tem `probabilidade_fechamento` entre 0-100, `justificativa` preenchida, e `kommo_produto_id` pertence ao catálogo real (verificar contra `KOMMO_PRODUTOS`).
- Rodar num cliente sem análises anteriores (rarissimo, mas possível) — `consolidado.avanco.fases = []` e `qualidade_time.observacao` explica a ausência.

---

## 9. Análise Consolidada — renderização na UI

Quando `isFaseProjetoConcluido && analiseAtual`, o `TcSuperPainel.vue` renderiza um layout especial (fica visível abaixo do `sp-header` / `sp-contexto` e antes do `sp-body` existente).

### 9.1 Scorecards topo (novo componente `TcConsolidadoScorecards.vue`)

3 cards lado-a-lado em grid `repeat(3, 1fr)` (em mobile empilha).

**Card Avanço:**
- Ícone: `trending-up` (se tendência ascendente), `minus` (estável), `trending-down` (descendente).
- Valor grande: `score_final / 10` (ex: "7.2").
- Sub-label: "Avanço do cliente".
- Delta chip: `score_final - score_inicial` — verde se positivo, vermelho se negativo (ex: "+2.1 desde Fase 1").
- Fundo do card tinge levemente com a cor da tendência (verde 4% / cinza / vermelho 4%).

**Card Qualidade do Time:**
- Ícone: `users`.
- Valor grande: `qualidade_time.score / 10`.
- Sub-label: squad_nome (ex: "Squad Marco Claro").
- Mini chip com contagem de pontos fortes: "+{N} pontos fortes".

**Card Oportunidades:**
- Ícone: `target`.
- Valor grande: contagem de oportunidades (ex: "4").
- Sub-label: "R$ {soma valor_estimado}" formatado pt-BR.
- Chip destacado se alguma `probabilidade_fechamento >= 70`: "Alta aderência 🔥" (ou sem emoji — só texto "Alta aderência").

### 9.2 Seção "Evolução do Projeto" (novo componente `TcConsolidadoAvanco.vue`)

Um card `.sp-card` com:
- Título "Evolução do Projeto".
- Um stepper horizontal (igual ao `TcTimelineFases`, mas sem cliques) mostrando cada fase com seu score colorido (verde/amarelo/vermelho).
- Barras de delta entre fases (pequenos chips `+0.8` / `-1.2` entre os steps).
- Abaixo do stepper, texto `evolucao` (markdown simples — quebras de linha preservadas).

Fallback: se `avanco.fases.length === 0`, esconder o stepper e mostrar só o texto.

### 9.3 Seção "Qualidade do Time" (novo componente `TcConsolidadoQualidadeTime.vue`)

Card `.sp-card` com:
- Título "Qualidade do Time".
- Nome do squad + score em destaque (ex: "Squad Marco Claro — 8.5/10").
- Duas colunas:
  - **Pontos fortes** (ícone `thumbs-up`, cor `--color-safe`): lista de bullets.
  - **Pontos de atenção** (ícone `alert-triangle`, cor `--color-care`): lista de bullets.
- Parágrafo final com `observacao`.

### 9.4 Reformulação do card Oportunidades (reutilizando `sp-coluna--acoes`)

O card existente `.sp-oportunidades` vira mais rico. Cada `<li>` contém:

```
<article class="oportunidade-card">
  <header>
    <strong>{{ op.titulo }}</strong>
    <span class="badge-prob" :class="probClass(op.probabilidade_fechamento)">
      {{ op.probabilidade_fechamento }}% aderência
    </span>
  </header>
  <p class="descricao">{{ op.descricao }}</p>
  <div class="linha">
    <span class="valor">R$ {{ formato(op.valor_estimado) }}</span>
    <button class="btn-ghost" @click="expanded = !expanded">
      {{ expanded ? 'Ocultar análise' : 'Ver análise' }}
    </button>
  </div>
  <section v-if="expanded" class="justificativa">
    <h4>Por que esse produto</h4>
    <p>{{ op.justificativa }}</p>
    <div class="meta">
      <span>Categoria: {{ categoriaNome(op.kommo_categoria_id) }}</span>
      <span v-if="op.kommo_solucao_id">Solução: {{ solucaoNome(op.kommo_solucao_id) }}</span>
    </div>
  </section>
</article>
```

**Classe da badge de probabilidade:**
- `>= 70%`: `.badge-prob--alta` (verde)
- `40-69%`: `.badge-prob--media` (amarelo)
- `< 40%`: `.badge-prob--baixa` (cinza)

A barra visual é a própria badge (compacta); não é necessário progress-bar separada — isso polui o card.

**Rodapé do card de Oportunidades:**
- Botão único `+ Criar oportunidade no Kommo` (primary, vermelho V4) — abre o `TcKommoOportunidadeModal` (Seção 10). O botão `+ Kommo` individual some.
- Texto pequeno: "Selecione até 4 produtos na próxima etapa".

### 9.5 Ordenação visual das oportunidades

Dentro do card, sort por `probabilidade_fechamento DESC` → usuário vê primeiro as mais quentes.

### 9.6 Layout no `sp-body`

No caso `isFaseProjetoConcluido && analiseAtual`, o grid do `sp-body` (hoje `1.2fr 1fr`) ganha **uma linha adicional no topo** que ocupa toda a largura:

```
grid-template-columns: 1.2fr 1fr;
grid-template-rows: auto auto;

row 1 (col 1/-1): TcConsolidadoScorecards
row 2 col 1: TcConsolidadoAvanco + sp-coluna--relatorio (resumo/materiais/percepcao/dores)
row 2 col 2: TcConsolidadoQualidadeTime + Oportunidades (reformulado) + Riscos + Recomendacoes
```

Nas outras fases (1-5), o `sp-body` continua com a estrutura atual sem mudanças.

### 9.7 Critério de aceite

- Abrir cliente em Projeto Concluído com análise → header normal + contexto + timeline (com bloqueios) + **scorecards (3 cards no topo)** + seção Evolução + Qualidade do Time + grid original (resumo/dores/etc) + Oportunidades reformulado.
- Clicar "Ver análise" num card de oportunidade → expande mostrando justificativa + categoria + solução.
- Badge de probabilidade colorida conforme regra.
- Ordenação: oportunidade com probabilidade mais alta aparece primeiro.
- Rodapé: "Regenerar Análise Consolidada" + versão.

---

## 10. Kommo — novo modal multi-produto + backend

### 10.1 Novo componente `TcKommoOportunidadeModal.vue`

Substitui o fluxo do `TcKommoLeadForm.vue` no contexto da Análise Consolidada (o form antigo fica só no repositório até confirmarmos que nenhum outro fluxo usa — na prática, pode ser deletado junto com o botão `+ Kommo` individual).

**Props:**
```
oportunidades: Array       // todas oportunidades da analise (para seleção multi)
cliente: Object            // dados do lead origem (custom_fields, squad, etc)
catalogoProdutos: Array    // [{ id, nome }] (vem do endpoint /catalogo-kommo)
catalogoCategorias: Array  // [{ id, nome }]
catalogoSolucoes: Array    // [{ id, nome }]
```

**Emits:** `submit(payload)`, `cancel`.

**Layout (modal padrão da aplicação):**

**1) Header fixo**
- Título: "Criar oportunidade no Kommo"
- Badge read-only: "Pipeline: Expansão" + pequeno texto "ID 12184212, sem etapa manual"

**2) Seção "Selecionar produtos (até 4)"**

Lista das `oportunidades` ordenadas por `probabilidade_fechamento DESC`. Cada item é um card clicável:

```
[□] Diagnóstico de Mídia Paga (Meta e Google Ads)
    R$ 20.280,00  ·  85% aderência
    [Ver análise ▼]
```

- Checkbox no início; clique no corpo inteiro alterna o check.
- Quando marcado, o card ganha borda primary (`--color-primary`) e fundo levemente tingido.
- **Limite 4**: se já tem 4 marcados, os não-marcados ficam com opacidade 0.4 + `cursor: not-allowed` + tooltip "Máximo 4 produtos por lead Kommo".
- Expandir "Ver análise" revela a justificativa da IA.

Para cada produto selecionado, abaixo do card expande um mini-form:
- **Produto Kommo**: select pré-selecionado com `kommo_produto_id` sugerido → dropdown com ~30 opções do `catalogoProdutos`.
- **Valor (R$)**: input number, pré-preenchido com `valor_estimado`.
- **Categoria**: select com 4 opções (Saber/Ter/Executar/Potencializar), pré-selecionado com `kommo_categoria_id`.

**3) Seção "Dados do lead" (colapsável, aberta por padrão)**

Campos pré-preenchidos do lead origem, todos editáveis exceto Tier:

- **Nome do lead** — text input, default `{cliente.nome} — Expansão {MM/YYYY}`.
- **Tier** — read-only, herda do lead origem. Mostra valor textual + nota "herdado do lead origem".
- **Oportunidade Mapeada** — select, default "Sim".
- **Solução** — select com opções do `catalogoSolucoes`, pré-selecionada com `kommo_solucao_id` da primeira oportunidade marcada (ou vazio).
- **Flag** — select, herda do lead origem.
- **Squad** — select, herda.
- **Dores** — textarea, pré-preenchida com agregação das `analiseAtual.dores` (`d => '- {d.descricao}'` join).
- **E-mail do Coordenador** — text, herda.
- **Account** — text, herda.

**4) Rodapé**
- Soma total em destaque: "Valor total: R$ {soma dos valores dos produtos marcados}".
- Botões: Cancelar (secondary) / Criar no Kommo (primary, desabilitado se nenhum produto marcado).

**5) Estados**
- `submitting` → botão "Criando..." desabilitado.
- Erro da API → mostra banner vermelho no topo do modal com a mensagem.
- Sucesso → emite `submit` com payload; pai fecha modal e mostra toast "Lead criado no Kommo — #{lead_id}".

### 10.2 Payload do form (emit `submit`)

```json
{
  "pipeline_id": 12184212,
  "name": "Acme Corp — Expansão 04/2026",
  "produtos": [
    {
      "produto_id": 1459131,
      "valor": 20280,
      "categoria_id": 1459099
    }
  ],
  "campos": {
    "tier": "Medium - 2.4 a 50 Mi (Ano)",
    "oportunidade_mapeada": "Sim",
    "solucao_id": 1459234,
    "flag": "Safe",
    "squad": "Marco Claro",
    "dores": "- Visibilidade e alcance\n- ...",
    "coordenador_email": "marco.claro@v4company.com",
    "account": "Viviane"
  },
  "fonte": {
    "lead_origem_id": "123456",
    "analise_id": 789
  }
}
```

### 10.3 Backend — `kommo-client.js`

**Nova função `createLeadMultiProduto(payload)`:**

```js
export async function createLeadMultiProduto({ name, produtos, campos }) {
  const custom_fields_values = []

  // Produtos 1-4 (slots dinamicos)
  const slotIds = [
    { produto: 1989765, valor: 1989767, categoria: 1989793 }, // Slot 1
    { produto: 1989769, valor: 1989771, categoria: 1989795 }, // Slot 2
    { produto: 1989773, valor: 1989775, categoria: 1989797 }, // Slot 3
    { produto: 1989777, valor: 1989779, categoria: 1989799 }  // Slot 4
  ]

  produtos.slice(0, 4).forEach((p, i) => {
    const slot = slotIds[i]
    custom_fields_values.push(
      { field_id: slot.produto,   values: [{ enum_id: p.produto_id }] },
      { field_id: slot.valor,     values: [{ value: p.valor }] },
      { field_id: slot.categoria, values: [{ enum_id: p.categoria_id }] }
    )
  })

  // Demais campos (usa CUSTOM_FIELD_IDS)
  if (campos.tier)               custom_fields_values.push({ field_id: 1989461, values: [{ value: campos.tier }] })
  if (campos.oportunidade_mapeada) custom_fields_values.push({ field_id: CUSTOM_FIELD_IDS.OPORTUNIDADE_MAPEADA, values: [{ value: campos.oportunidade_mapeada }] })
  if (campos.solucao_id)         custom_fields_values.push({ field_id: CUSTOM_FIELD_IDS.SOLUCAO, values: [{ enum_id: campos.solucao_id }] })
  if (campos.flag)               custom_fields_values.push({ field_id: CUSTOM_FIELD_IDS.FLAG, values: [{ value: campos.flag }] })
  if (campos.squad)              custom_fields_values.push({ field_id: CUSTOM_FIELD_IDS.SQUAD, values: [{ value: campos.squad }] })
  if (campos.dores)              custom_fields_values.push({ field_id: CUSTOM_FIELD_IDS.DORES, values: [{ value: campos.dores }] })
  if (campos.coordenador_email)  custom_fields_values.push({ field_id: CUSTOM_FIELD_IDS.COORDENADOR_EMAIL, values: [{ value: campos.coordenador_email }] })
  if (campos.account)            custom_fields_values.push({ field_id: CUSTOM_FIELD_IDS.ACCOUNT, values: [{ value: campos.account }] })

  const body = [{
    name,
    pipeline_id: 12184212,           // Expansão fixo
    price: produtos.reduce((a, p) => a + (p.valor || 0), 0),
    custom_fields_values
    // status_id intencionalmente OMITIDO — Kommo joga na primeira etapa do pipeline
  }]

  const data = await kommoFetch('/leads', { method: 'POST', body: JSON.stringify(body) })
  return data?._embedded?.leads?.[0]
}
```

### 10.4 Rota `POST /api/tc/kommo/oportunidade` (nova, em `torre-controle.js`)

```js
router.post('/kommo/oportunidade', async (req, res, next) => {
  try {
    const { name, produtos, campos, fonte } = req.body || {}
    if (!name || !Array.isArray(produtos) || produtos.length === 0) {
      return res.status(400).json({ error: 'name e produtos[] obrigatórios' })
    }
    if (produtos.length > 4) {
      return res.status(400).json({ error: 'Máximo 4 produtos por lead' })
    }
    const lead = await createLeadMultiProduto({ name, produtos, campos: campos || {} })

    // Persistência para rastreabilidade
    if (fonte?.analise_id) {
      await pool.query(`
        INSERT INTO dashboards_hub.tc_oportunidades_kommo
          (analise_id, lead_origem_id, kommo_lead_id, produtos, valor_total, criado_em)
        VALUES ($1, $2, $3, $4, $5, NOW())
      `, [fonte.analise_id, fonte.lead_origem_id, lead?.id, JSON.stringify(produtos),
          produtos.reduce((a, p) => a + (p.valor || 0), 0)])
    }

    res.json({ lead, kommo_url: `https://edisonv4companycom.kommo.com/leads/detail/${lead?.id}` })
  } catch (err) { next(err) }
})
```

A rota antiga `POST /kommo/lead` fica no código por 1 release para não quebrar nada que eventualmente chame, marcada como deprecated. Depois é removida.

### 10.5 Rota `GET /api/tc/catalogo-kommo` (nova)

Expõe para o frontend os 3 catálogos (produtos/categorias/solucoes) sem depender de hardcode no cliente. Lê de `kommo-client.js::getKommoCatalogos()` e retorna em cache (5 min).

```js
router.get('/catalogo-kommo', async (req, res, next) => {
  try {
    const { produtos, categorias, solucoes } = getKommoCatalogos()
    res.json({ produtos, categorias, solucoes })
  } catch (err) { next(err) }
})
```

Frontend busca uma vez ao abrir o modal e cacheia em `useTorreControle` (shallowRef).

### 10.6 Nova tabela `tc_oportunidades_kommo` (migration 012)

Rastreia o envio de leads derivados de análise consolidada:

```sql
CREATE TABLE dashboards_hub.tc_oportunidades_kommo (
  id SERIAL PRIMARY KEY,
  analise_id INTEGER REFERENCES dashboards_hub.tc_analises_ia(id) ON DELETE SET NULL,
  lead_origem_id BIGINT,           -- lead Kommo que deu origem
  kommo_lead_id BIGINT NOT NULL,   -- lead Kommo criado
  produtos JSONB NOT NULL,         -- array como enviado
  valor_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  criado_por INTEGER REFERENCES dashboards_hub.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_tc_opk_analise ON dashboards_hub.tc_oportunidades_kommo(analise_id);
CREATE INDEX idx_tc_opk_lead_origem ON dashboards_hub.tc_oportunidades_kommo(lead_origem_id);
```

### 10.7 Critério de aceite

- Abrir modal a partir do card Oportunidades → modal aparece com lista das oportunidades ordenadas por probabilidade.
- Marcar 2 produtos → mini-forms aparecem com produto/valor/categoria pré-preenchidos; usuário pode trocar cada select.
- Tentar marcar o 5º produto → bloqueado com tooltip.
- Tier mostra value read-only.
- Alterar Dores / Solução / Flag → valores salvos no payload.
- Submeter → lead aparece no Kommo (Expansão, primeira etapa), com os produtos preenchidos nos slots corretos + demais custom fields.
- Tabela `tc_oportunidades_kommo` tem um registro novo com `kommo_lead_id`.
- Toast confirmando + opção de abrir o lead na aba do Kommo.

---

## 11. Matriz de pré-preenchimento + arquivos tocados + migrations

### 11.1 Tabela de pré-preenchimento (o que o usuário vê já preenchido ao abrir o modal)

| Campo no Kommo | Preenchimento automático | Fonte dos dados | Editável? |
|---|---|---|---|
| Pipeline (`12184212`) | ✅ fixo | Constante hardcoded | Não |
| Etapa (status_id) | ✅ omitido do payload | — | Não (Kommo coloca na 1ª) |
| Nome do lead | ✅ | `{cliente.nome} — Expansão {MM/YYYY}` | Sim |
| Tier (`1989461`) | ✅ | `getCF(lead, 1989461)` do lead origem | **Não** (read-only) |
| Squad (`1989938`) | ✅ | `getCF(lead, 1989938)` | Sim |
| Account (`1990229`) | ✅ | `getCF(lead, 1990229)` | Sim |
| E-mail Coordenador (`1990181`) | ✅ | `getCF(lead, 1990181)` | Sim |
| Flag (`1989972`) | ✅ | `getCF(lead, 1989972)` | Sim |
| Dores (`1989932`) | ✅ | Agregação de `analiseAtual.dores[].descricao` com bullets | Sim |
| Oportunidade Mapeada (`1989954`) | ✅ | Default `"Sim"` | Sim |
| Solução (`1989934`) | ⚠️ sugerido pela IA | `op.kommo_solucao_id` da 1ª oportunidade marcada | Sim |
| Produto 1-4 (`1989765/69/73/77`) | ⚠️ sugerido pela IA | `op.kommo_produto_id` (match contra catálogo) | Sim |
| Valor Produto 1-4 (`1989767/71/75/79`) | ⚠️ sugerido pela IA | `op.valor_estimado` | Sim |
| Categoria Produto 1-4 (`1989793/95/97/99`) | ⚠️ sugerido pela IA | `op.kommo_categoria_id` | Sim |

**Leitura:** 9 campos pré-preenchidos automaticamente, 8 são sugeridos pela IA (usuário pode trocar qualquer um no dropdown), 1 é read-only (Tier — pra evitar inconsistência entre leads do mesmo cliente).

### 11.2 Arquivos criados (novos)

Frontend:
- `client/components/ui/VMultiSelect.vue`
- `client/dashboards/TorreDeControle/components/TcKommoOportunidadeModal.vue`
- `client/dashboards/TorreDeControle/components/TcConsolidadoScorecards.vue`
- `client/dashboards/TorreDeControle/components/TcConsolidadoAvanco.vue`
- `client/dashboards/TorreDeControle/components/TcConsolidadoQualidadeTime.vue`

Backend/DB:
- `migrations/011_tc_analise_consolidada.sql` — adiciona coluna `consolidado JSONB` em `tc_analises_ia`
- `migrations/012_tc_oportunidades_kommo.sql` — cria tabela `tc_oportunidades_kommo`

### 11.3 Arquivos modificados

Frontend (`client/dashboards/TorreDeControle/`):
- `index.vue` — filtros multi-select, legenda "anel branco", state refatorado para arrays
- `components/TcMatrizTable.vue` — troca `.dot--atual` vermelho → branco
- `components/TcTimelineFases.vue` — nova prop `faseAtualOrdem` + bloqueio de fases futuras
- `components/TcSuperPainel.vue` — remoção de "Analisar todas"; substituição do CTA em Projeto Concluído; novo layout com Scorecards/Avanço/QualidadeTime; card Oportunidades reformulado; novo botão "+ Criar oportunidade Kommo" que abre o `TcKommoOportunidadeModal`
- `composables/useTorreControle.js` — novos métodos `criarOportunidadeKommo(payload)` e `carregarCatalogoKommo()` + cache em shallowRef

Backend:
- `server/services/kommo-client.js` — expor `KOMMO_PRODUTOS`, `KOMMO_CATEGORIAS`, `KOMMO_SOLUCOES`; novo `getKommoCatalogos()`; novo `createLeadMultiProduto(payload)`; `createLead` antiga permanece (marcar como deprecated)
- `server/services/tc-analyzer.js::runFinalReport` — novo system prompt + passa catálogos no user prompt; persiste `consolidado` JSONB (além dos campos atuais)
- `server/routes/torre-controle.js` — nova rota `POST /kommo/oportunidade`, nova rota `GET /catalogo-kommo`; rota `POST /kommo/lead` fica deprecated (ainda responde); `GET /cliente/:id/fase/:faseId` passa a incluir `consolidado` em cada análise (basta `SELECT *` incluir a coluna nova)

### 11.4 Arquivos a remover (ou marcar como dead code)

- `client/dashboards/TorreDeControle/components/TcKommoLeadForm.vue` — substituído pelo novo modal. Remover **depois** que o novo fluxo for validado em staging. No primeiro deploy, comentar import em `TcSuperPainel.vue` e deixar o arquivo em disco por 1 release.

### 11.5 Migrations

**`migrations/011_tc_analise_consolidada.sql`:**
```sql
ALTER TABLE dashboards_hub.tc_analises_ia
  ADD COLUMN consolidado JSONB;

-- Analises antigas ficam NULL; UI trata `consolidado == null` como "análise legacy
-- sem scorecards" (só renderiza blocos existentes). Só novas Análises Consolidadas
-- pós-deploy preenchem essa coluna.
```

**`migrations/012_tc_oportunidades_kommo.sql`:** (DDL completo na Seção 10.6)

### 11.6 Variáveis de ambiente

Nenhuma nova variável necessária. O pipeline Expansão (`12184212`) fica hardcoded em `kommo-client.js` — se virar configurável no futuro, vira env var `KOMMO_PIPELINE_EXPANSAO_ID`.

---

## 12. Rollout, riscos e test plan

### 12.1 Ordem sugerida de implementação (waves)

Cada wave gera commits atômicos e pode ir pra staging isolada:

**Wave A — Ajustes visuais baixos de risco:**
1. Anel vermelho → branco (Seção 4)
2. Bloqueio na timeline (Seção 6)
3. Filtros multi-select com `VMultiSelect` (Seção 5)

**Wave B — Backend da Análise Consolidada:**
4. Migration 011 (coluna `consolidado`)
5. Helpers `KOMMO_PRODUTOS/CATEGORIAS/SOLUCOES` + `getKommoCatalogos()`
6. Ajuste do prompt `runFinalReport` + persistência do JSON novo
7. Rota `GET /api/tc/catalogo-kommo`

**Wave C — UI da Análise Consolidada:**
8. Remoção do "Analisar todas as fases" + símbolos não usados
9. Substituição do CTA "Gerar/Regenerar Análise Consolidada"
10. Componentes `TcConsolidadoScorecards`, `TcConsolidadoAvanco`, `TcConsolidadoQualidadeTime`
11. Reformulação do card Oportunidades (probabilidade + justificativa expansível)

**Wave D — Fluxo Kommo multi-produto:**
12. Migration 012 (tabela `tc_oportunidades_kommo`)
13. `createLeadMultiProduto` em `kommo-client.js`
14. Rota `POST /api/tc/kommo/oportunidade`
15. Componente `TcKommoOportunidadeModal.vue` + integração no `TcSuperPainel`
16. Deprecar botão `+ Kommo` individual e rota `POST /kommo/lead`

### 12.2 Riscos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| IA retorna `kommo_produto_id` fora do catálogo | Média | Alta (payload rejeitado pelo Kommo) | Validação no backend: se id não está na lista, descarta aquele slot e loga warning; frontend mostra dropdown pré-selecionado, usuário corrige. |
| Prompt novo aumenta consumo de tokens do final report | Alta | Baixa (custo IA) | Medir primeiras 3 análises em staging; se necessário, reduzir tamanho do catálogo de produtos (top 15 mais comuns da V4) em vez dos 30. |
| Coluna `consolidado` null em análises antigas quebra UI | Baixa | Média | Template usa `v-if="analiseAtual.consolidado"` para scorecards/avanco/qualidadeTime; sem a coluna renderiza só o layout antigo. |
| `.dot--atual` branco fica "lavado" em alguns dots (ex: dot branco-sem-análise) | Baixa | Baixa | Hoje dot-sem-análise é `#333` com border dashed — contraste OK. Testar visualmente; se necessário, usar outline branco + leve halo preto (`box-shadow: 0 0 0 3px #0d0d0d, 0 0 8px rgba(255,255,255,0.5)`). |
| Kommo rejeita lead sem `status_id` no payload | Baixa | Alta | Testar antes em sandbox; Kommo documentação confirma que `status_id` é opcional (joga na primeira etapa do pipeline). Se falhar, passar `status_id` da primeira etapa do pipeline 12184212 explicitamente. |
| Multi-select com N accounts lenta (performance) | Muito baixa | Baixa | Pipeline Saber hoje tem ~dezenas de leads; filtros locais em array já são O(n*m) com n<100 e m<10. Sem necessidade de otimização. |
| Usuário regenera Análise Consolidada por engano | Média | Baixa (custo) | Confirm dialog antes de disparar regenerate (já no design, Seção 7.3). |

### 12.3 Test plan (manual + automatizado)

**Testes manuais (pré-deploy):**

1. **Matriz + filtros:**
   - Carregar matriz com 10+ leads → anel branco visível em todas as fases atuais.
   - Abrir filtro Account → marcar 2 → contador "Account (2)" + matriz filtrada.
   - Adicionar Tier com 2 opções → AND entre filtros funcionando.
   - Limpar um filtro → volta a mostrar todos.

2. **Timeline bloqueada:**
   - Cliente em Fase 3: timeline mostra Fase 1-2 clicáveis, 3-5 bloqueadas (opacidade, cursor, tooltip).
   - Cliente em Projeto Concluído: timeline tem 1-5 clicáveis, "Projeto Concluído" bloqueada (mas CTA aparece).

3. **Análise Consolidada:**
   - Cliente com 5 fases auditadas em Projeto Concluído (sem análise consolidada): vazio state + botão "Gerar Análise Consolidada".
   - Disparar → TcJobProgress mostra andamento → ao terminar, layout completo aparece.
   - Scorecards: Avanço com tendência/score/delta; Qualidade com nome squad + pontos; Oportunidades com contagem + R$ + flag alta aderência.
   - Seção Evolução mostra stepper com 5 scores + deltas + texto.
   - Seção Qualidade do Time mostra pontos fortes e atenção.
   - Card Oportunidades ordenado por probabilidade DESC; cada item mostra badge colorida; "Ver análise" expande justificativa.

4. **Modal Kommo multi-produto:**
   - Clicar "+ Criar oportunidade Kommo" → modal abre, oportunidades ordenadas.
   - Marcar 1 produto → mini-form aparece com dados pré-preenchidos da IA.
   - Marcar mais 3 → 4 produtos marcados; o 5º fica bloqueado.
   - Trocar o produto do slot 2 (dropdown Kommo).
   - Editar Dores, Solução, Squad, Account.
   - Submeter → lead criado em Expansão, checar no Kommo que Produto 1-4 + Valores + Categorias estão corretos.
   - Verificar `tc_oportunidades_kommo` tem linha com `kommo_lead_id`.

5. **Regressão:**
   - Análises antigas em fases 1-5 abrem normalmente (sem campos novos, sem crash).
   - Painel Geral admin continua funcionando (fora de escopo, mas vale conferir).

**Testes automatizados (stretch, se houver tempo):**
- Unit test `createLeadMultiProduto` — validar que slots são populados em ordem sequencial e valores somam `price`.
- Unit test `VMultiSelect` — modelo v-model, limpar tudo, selecionar tudo.
- Snapshot test do prompt de `runFinalReport` com catálogo mock.

### 12.4 Critério de aceite global

A feature é dada como entregue quando:

- Matriz visual alinhada ao design system (anel branco, legenda atualizada).
- Todos os 3 filtros multi-select funcionam com múltipla seleção e contador.
- Timeline dentro do SuperPainel respeita o bloqueio `ordem < fase_atual_ordem`.
- Botão "Analisar todas as fases" removido; sem código morto deixado.
- Fase "Projeto Concluído" tem CTA "Gerar Análise Consolidada" (ou "Regenerar" com confirm).
- Análise Consolidada renderiza 3 scorecards + seção Evolução + seção Qualidade do Time + Oportunidades reformulado.
- Cada oportunidade exibe probabilidade + justificativa expansível.
- Modal Kommo cria lead em Expansão (`12184212`) sem selecionar etapa, com até 4 produtos + todos os campos pré-preenchidos/editáveis conforme Seção 11.1.
- Lead criado aparece no Kommo com todos os custom fields corretos.
- Rastreabilidade: linha em `tc_oportunidades_kommo` referenciando a análise de origem.

---

## 13. Ajuste 4 — Fix VARCHAR(50) em `veredicto` + `modelo_usado` (bug bloqueante)

### 13.1 Problema

Hoje (print BC98A63D) o step `persisting` falha com `value too long for type character varying(50)`. Afeta TODAS as análises (regulares e consolidada). Origem: `migrations/004_torre_controle_super_painel.sql:63,65`:

```sql
modelo_usado        VARCHAR(50),
veredicto           VARCHAR(50),
```

A IA gera veredictos como "Projeto em risco — cliente desengajado desde fase 3" (>50 chars) e `modelo_usado` pode ter formato `gpt-4.1-2024-08-06 (openai)` (>30 chars, e com o sufixo ` (final)` do `runFinalReport` passa de 50).

### 13.2 Correção

Migration **010** (próxima disponível) → na verdade use próximo slot livre, que será `013`:

```sql
-- migrations/013_tc_veredicto_varchar_expand.sql
ALTER TABLE dashboards_hub.tc_analises_ia
  ALTER COLUMN veredicto     TYPE VARCHAR(200),
  ALTER COLUMN modelo_usado  TYPE VARCHAR(100);
```

200 chars cobre qualquer veredicto razoável sem virar TEXT (evita storage overhead desnecessário em índices). 100 chars cobre `provider:model (variant)`.

### 13.3 Defesa em profundidade no código

Em `tc-analyzer.js::runAnalysis` (linhas 315) e `runFinalReport` (linhas 229), antes do INSERT:

```js
const veredicto = (parsed.veredicto || '').slice(0, 200)
const modeloUsado = `${parsed._provider}:${parsed._model}`.slice(0, 100)
```

Truncar no código evita que um IA resultado gigante quebre o job novamente. Log warn quando trunca para detectar mau prompt.

### 13.4 Critério de aceite

- Rodar a migration → `\d dashboards_hub.tc_analises_ia` mostra `veredicto VARCHAR(200)`, `modelo_usado VARCHAR(100)`.
- Disparar análise de uma fase → step `persisting` completa; job não falha por varchar overflow.
- Veredicto muito longo → é truncado em 200 com log warn; job continua.

---

## 14. Ajuste 5 — Wait entre steps de extração (evita rate-limit + race)

### 14.1 Problema

Hoje, `runAnalysis` (linhas 255-265 em `tc-analyzer.js`) itera sobre os materiais (slides, reuniao, transcricao, figma, miro) em sequência **sem pausa**. Cada `getOrExtract` pode chamar Google Drive, Google Docs, Figma, Miro ou o extrator interno — APIs com rate-limit e que podem falhar silenciosamente quando chamadas muito rápido em burst.

Sintomas:
- Primeira extração OK, segunda retorna 429 ou conteúdo parcial.
- Resposta do Figma/Google vem incompleta ou com auth expirada.

### 14.2 Mudança

Adicionar pausa configurável entre cada iteração de material:

```js
// Em tc-analyzer.js::runAnalysis, bloco linha 256-265
const EXTRACTION_WAIT_MS = parseInt(process.env.TC_EXTRACTION_WAIT_MS || '1500', 10)

progress('extracting_content', { total: Object.keys(links).length })
const materials = {}
const entries = Object.entries(links)
for (let i = 0; i < entries.length; i++) {
  const [plataforma, url] = entries[i]
  try {
    const extracao = await getOrExtract(leadId, fase, plataforma, url)
    materials[plataforma] = extracao.raw || extracao.conteudo_full || ''
  } catch (err) {
    materials[plataforma] = { error: `falha extracao: ${err.message}`, url }
  }
  // Pausa entre extrações (exceto na última)
  if (i < entries.length - 1) {
    progress('extracting_content', { current: i + 1, total: entries.length, waiting: true })
    await new Promise(r => setTimeout(r, EXTRACTION_WAIT_MS))
  }
}
```

Env var `TC_EXTRACTION_WAIT_MS` default `1500` (1.5s) — ajustável sem redeploy.

### 14.3 Critério de aceite

- Analisar uma fase com 5 materiais → tempo total do step `extracting_content` aumenta ~6s (5*1.5s com wait entre as 4 transições, aproximadamente).
- Logs mostram "waiting: true" nos progress events intermediários.
- Taxa de erro de extração cai (observável em staging; qualitativo).

---

## 15. Ajuste 6 — Erros inline no painel (além da barra de progresso)

### 15.1 Problema

Hoje, quando `runAnalysis` ou `runFinalReport` falha (print BC98A63D), o erro só aparece num banner do `TcJobProgress` pequeno no topo. Quando o usuário entra no `TcSuperPainel` de uma fase que tentou analisar e falhou, **não vê nada** indicando que a última tentativa errou — a UI mostra "Fase ainda nao analisada" como se nunca tivesse rodado.

### 15.2 Mudança

**Backend:**
- Tabela `tc_jobs` já tem coluna `erro TEXT` (verificar em migration 004) — se não tiver, migration 014 adiciona.
- Em `tc-job-worker.js`, quando catch'a erro do `runAnalysis`/`runFinalReport`, persistir `erro` na `tc_jobs` + também gravar `ultima_falha` na `tc_projeto_fases`:

```sql
-- migrations/014_tc_projeto_fases_ultima_falha.sql
ALTER TABLE dashboards_hub.tc_projeto_fases
  ADD COLUMN ultima_falha_em  TIMESTAMPTZ,
  ADD COLUMN ultima_falha_msg TEXT;
```

Worker, ao catch:
```js
await pool.query(`
  UPDATE dashboards_hub.tc_projeto_fases
  SET ultima_falha_em = NOW(), ultima_falha_msg = $1
  WHERE id = $2
`, [String(err.message || err).slice(0, 1000), projetoFaseId])
```

E quando roda com sucesso, limpa:
```sql
UPDATE ... SET ultima_falha_em = NULL, ultima_falha_msg = NULL WHERE id = $1
```

**Endpoint `/cliente/:id/fase/:faseId`** (torre-controle.js:208) — incluir `ultima_falha_em` e `ultima_falha_msg` no retorno do `fase`.

**Frontend `TcSuperPainel.vue`:**

Novo banner no topo do `sp-body` / `sp-vazio` quando `detalhe.fase.ultima_falha_msg` existe:

```
┌─────────────────────────────────────────────────────────────┐
│ ⚠  Última análise falhou                                    │
│    value too long for type character varying(50)            │
│    Falha em 17/04 14:32 · [Ver materiais do lead →]         │
└─────────────────────────────────────────────────────────────┘
```

- Cor: `--color-danger` com fundo `rgba(239,68,68,0.08)`.
- Botão "Ver materiais do lead" abre o novo editor (Seção 16).
- Botão secundário "Tentar novamente" faz a mesma ação do "Analisar agora".

### 15.3 Critério de aceite

- Forçar falha numa análise (ex: URL inválida em slides) → após job falhar, `tc_projeto_fases.ultima_falha_msg` tem a mensagem.
- Abrir `TcSuperPainel` dessa fase → banner vermelho aparece com a mensagem + data da falha + 2 botões (Ver materiais / Tentar novamente).
- Rodar nova análise com sucesso → banner some e `ultima_falha_*` volta a null.

---

## 16. Ajuste 7 — Editor de materiais do lead (TcLeadMateriaisEditor)

### 16.1 Problema

Quando o usuário vê que a análise falhou por material errado (link quebrado, PDF errado no slides, transcrição ausente), **não tem como corrigir pelo Hub** — precisa abrir o Kommo, achar o lead, editar o custom field, voltar. Além disso, o painel não mostra os materiais atuais, só roda a análise contra eles.

### 16.2 Mudança — novo componente `TcLeadMateriaisEditor.vue`

Aberto como modal acionável a partir de:
- Botão no header do `TcSuperPainel` ("Editar materiais" ao lado do nome do cliente)
- Botão "Ver materiais do lead" do banner de erro (Seção 15)

**Layout (replica o print 850EDF5D):**

Tabela com duas colunas:

| Campo | Valor atual (link ou "...") |
|---|---|
| Link da Pasta do Cliente (`1990387`) | link editável |
| Reunião de Kick-off (`1990385`) | link editável |
| Fase 1 Link Google Slides (`1990357`) | link editável |
| Fase 1 Link da Reunião (`1990385`) | link editável |
| Fase 1 Transcrição (`1990611`) | link editável |
| Fase 2 Link Google Slides (`1990679`) | link editável |
| Fase 2 Link da Reunião (`1990369`) | link editável |
| Fase 2 Transcrição (`1990613`) | link editável |
| Fase 3 Link Figma (`1990781`) | link editável |
| Fase 3 Link Miro (`1990783`) | link editável |
| Fase 3 Link Google Slides (`1990681`) | link editável |
| Fase 3 Link da Reunião (`1990373`) | link editável |
| Fase 3 Transcrição (`1990615`) | link editável |
| Fase 4 Link Google Slides (`1990683`) | link editável |
| Fase 4 Link da Reunião (`1990377`) | link editável |
| Fase 4 Transcrição (`1990617`) | link editável |
| Fase 5 Link Google Slides (`1990685`) | link editável |
| Fase 5 Link da Reunião (`1990381`) | link editável |
| Fase 5 Transcrição (`1990619`) | link editável |
| Fase 5 Link Figma (`1990789`) | link editável |
| Fase 5 Link Miro (`1990791`) | link editável |

Cada linha:
- Se valor existe → mostra URL clicável (abre em nova aba) + botão "Editar".
- Ao clicar "Editar" → converte em input text editável + botões "Salvar" / "Cancelar".
- Ao "Salvar" → **abre popup de confirmação**: "Confirmar alteração de {nome do campo}? Nova URL: {url}".
- Confirmar → chama `PATCH /api/tc/lead/:leadId/custom-field` com `{ field_id, value }`. Backend atualiza via Kommo API e atualiza cache local (`tc_kommo_leads.custom_fields`). Mostra toast "Atualizado no Kommo".
- Cancelar popup → não salva.

**Estados de linha:**
- `empty` (valor vazio / "…"): texto cinza "Não preenchido" + botão "Adicionar".
- `present`: link + botão "Editar".
- `editing`: input + botões.
- `saving`: spinner + inputs desabilitados.
- `saved`: check verde por 2s, volta a `present`.

**Agrupamento visual:**
- Seção "Documentos gerais" (Pasta + Kick-off).
- Seção "Fase 1" / "Fase 2" / ... / "Fase 5" (accordion colapsável, default expandido para fase atual do lead).

### 16.3 Backend — nova rota `PATCH /api/tc/lead/:leadId/custom-field`

```js
router.patch('/lead/:leadId/custom-field', async (req, res, next) => {
  try {
    const leadId = parseInt(req.params.leadId, 10)
    const { field_id, value } = req.body || {}
    if (!leadId || !field_id) return res.status(400).json({ error: 'leadId e field_id obrigatorios' })
    if (!EDITABLE_FIELD_IDS.has(field_id)) {
      return res.status(403).json({ error: 'campo nao editavel via Hub' })
    }

    // Atualiza no Kommo
    await updateLeadCustomField(leadId, field_id, value)

    // Atualiza cache local (merge do array custom_fields)
    await pool.query(`
      UPDATE dashboards_hub.tc_kommo_leads
      SET custom_fields = (
        SELECT jsonb_agg(
          CASE WHEN (item->>'field_id')::int = $1
          THEN jsonb_set(item, '{values,0,value}', to_jsonb($2::text))
          ELSE item END
        )
        FROM jsonb_array_elements(custom_fields) item
      ),
      updated_at = NOW()
      WHERE id = $3
    `, [field_id, value, leadId])

    res.json({ ok: true })
  } catch (err) { next(err) }
})
```

Whitelist `EDITABLE_FIELD_IDS`: conjunto dos 21 ids da Seção 16.2 + não permite edição de Tier, Squad, etc. (evita abuso).

**Em `kommo-client.js`**, nova função:

```js
export async function updateLeadCustomField(leadId, fieldId, value) {
  const body = {
    custom_fields_values: [
      { field_id: fieldId, values: [{ value: value || '' }] }
    ]
  }
  return kommoFetch(`/leads/${leadId}`, { method: 'PATCH', body: JSON.stringify(body) })
}
```

### 16.4 Permissões

- Somente role `admin` e `board` podem editar materiais (resto leitura). Guard na rota via `requireRole`.
- Cliente que não tem acesso a esse lead → 403.

### 16.5 Critério de aceite

- Abrir `TcSuperPainel` → botão "Editar materiais" no header.
- Clicar → modal abre com todos os 21 campos, valores atuais preenchidos.
- Editar "Fase 1 Transcrição" → "Salvar" → popup "Confirmar alteração". Confirmar → spinner → toast "Atualizado no Kommo".
- Abrir o lead no Kommo → campo reflete novo valor.
- Cache local (`tc_kommo_leads.custom_fields`) atualizado sem precisar de sync completo.
- Usuário `operacao` (não admin/board) não vê o botão "Editar materiais" ou recebe 403 se forjar a rota.

---

## 17. Perguntas em aberto (pós-aprovação do spec)

Nenhuma — todas as decisões de design foram validadas com o usuário durante o brainstorming. Os itens abaixo são refinamentos que podem aparecer durante implementação:

- Nomeação final do endpoint `/kommo/oportunidade` — usar `/kommo/lead-multi`? (semântica ambígua; manter "oportunidade")
- Se o catálogo de produtos virar dinâmico (fetch do Kommo em runtime), adicionar cron de refresh (24h). Por ora, hardcoded.
- Pequenos ajustes visuais de contraste do anel branco podem precisar de iteração visual pós-deploy (Wave A).
- `EXTRACTION_WAIT_MS` padrão 1.5s — observar em staging; se ficar muito lento (>30s total), abaixar para 800ms. Se ainda tiver race, subir para 2s.
