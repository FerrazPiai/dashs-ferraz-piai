# Kommo — Custom Fields Analysis

**Pipeline:** Saber (12925780)
**Amostra:** 50 leads
**Total de custom fields:** 157
**Data:** 2026-04-16

---

## Tipos de campos disponiveis

| Tipo | Qtd | Uso tipico |
|------|-----|-----------|
| select | 39 | Graficos categoricos, filtros |
| text | 26 | Contexto curto, links |
| url | 22 | Links para materiais externos |
| date | 17 | Timelines, marcos do projeto |
| textarea | 13 | Contexto longo (RAG IA) |
| monetary | 13 | Scorecards financeiros |
| tracking_data | 10 | Metadados do Kommo |
| numeric | 6 | KPIs |
| multiselect | 5 | Tags/categorizacoes multiplas |
| date_time | 3 | Timestamps precisos |
| checkbox | 2 | Flags booleanas |
| file | 1 | Documentos |

---

## Campos valiosos para **contexto IA** (RAG adicional)

Campos de texto longo com alta cobertura — enriquecem o prompt de analise com dados do cliente que vao alem dos slides/reunioes.

| Cobertura | Field ID | Nome | Tipo | Uso sugerido |
|-----------|----------|------|------|-------------|
| 62% | 1989878 | Descricao da Empresa | textarea | Contexto principal — quem e o cliente |
| 62% | 1989880 | Objetivo da Empresa | textarea | O que o cliente espera alcancar |
| 62% | 1989898 | Dores do Negocio | textarea | **Core** — desafios declarados pelo cliente |
| 60% | 1989922 | Detalhes do DISC | textarea | Perfil comportamental do decisor |
| 60% | 1989904 | Stack de Ferramentas | textarea | Tech stack atual do cliente |
| 62% | 1989914 | Participantes (Nome/Cargo) | textarea | Stakeholders da conta |

**Implementacao sugerida:** Adicionar um 4º layer ao RAG engine (`rag-engine.js`) chamado `camada_kommo_context` com budget de ~1500 tokens, agregando esses 6 campos + dados estruturados como Tier, Ticket Medio, Canais de Vendas, Urgencia.

---

## Campos para **graficos / visualizacoes**

### Pie/Donut (distribuicao categorica)

| Field ID | Nome | Cobertura | Cardinalidade esperada |
|----------|------|-----------|-------------------------|
| 1989461 | Tier | 92% | 4-6 (Enterprise/Large/Medium/Small/Tiny) |
| 1989435 | Canal de Origem | 82% | ~8 |
| 1989972 | Flag | 50% | 3 (Safe/Care/Risk ou similar) |
| 1989954 | Oportunidade Mapeada | 44% | 2 (Sim/Nao) |
| 1989902 | Utiliza CRM | 62% | 2 (Sim/Nao) |
| 1989894 | Investe em Trafego | 62% | 2-3 |
| 1989918 | Urgencia | 62% | 3-5 |

### Barras (ranking)

| Field ID | Nome | Cobertura | Uso |
|----------|------|-----------|-----|
| 1989938 | Squad | 76% | Volume por squad — operacional |
| 1990229 | Account | 46% | Volume por account — **ja usado como filtro** |
| 1988407 | Closer | 78% | Conversao por closer |
| 1988389 | Pre-vendas | 74% | Conversao por SDR |
| 1989765 | Produto 1 | 90% | Mix de produtos |

### Scorecards financeiros (monetary)

| Field ID | Nome | Cobertura | Agregacao |
|----------|------|-----------|-----------|
| 1989767 | Valor Produto 1 | 86% | Soma = receita total contratada |
| 1989908 | Ticket Medio | 60% | Media ponderada |
| 1989910 | Lucro Liquido | 60% | Soma = LTV estimado |
| 1989896 | Verba em Trafego | 60% | Soma = investimento total em ads |
| 1989966 | Valor primeiro pagamento | 44% | Soma = caixa imediato |

### Timeline (date)

| Field ID | Nome | Cobertura | Uso |
|----------|------|-----------|-----|
| 1989757 | Inicio do Projeto | 92% | Timeline de cohort |
| 1990353 | Data da Assinatura | 88% | Volume de assinaturas/mes |
| 1988399 | Data da Reuniao | 68% | Atividade de reunioes |

### Multiselect (distribuicao sobreposta)

| Field ID | Nome | Cobertura | Visualizacao |
|----------|------|-----------|--------------|
| 1988415 | Produtos Vendidos | 82% | Stacked bar por cliente |
| 1989789 | Parcelamento | 74% | Distribuicao de condicoes |
| 1989900 | Canais de Vendas | 62% | Mix de canais |
| 1989920 | Perfil do lead | 62% | Segmentacao comportamental |

---

## Campos chave para **filtros** da matriz

Ja implementados ou a adicionar:

- **Account** (1990229) — ja implementado como filtro unico ✅
- **Tier** (1989461, 92% cobertura) — filtro altamente seletivo, sugerido
- **Squad** (1989938) — removido da tabela mas pode voltar como filtro
- **Flag** (1989972) — "Safe/Care/Risk" permite identificar rapido riscos
- **Urgencia** (1989918) — priorizacao

---

## Novas visualizacoes propostas (Painel Geral)

### 1. Scorecards financeiros (topo do painel)

Calculados via agregacao dos custom fields monetary:

- **Receita contratada** = SUM(Valor Produto 1)
- **Ticket medio** = AVG(Ticket Medio)
- **Verba em trafego total** = SUM(Verba em Trafego)
- **LTV estimado** = SUM(Lucro Liquido)

### 2. Tab "Distribuicao" (nova)

Donut charts em grid 2x2:
- Distribuicao por **Tier** (92% cobertura)
- Distribuicao por **Canal de Origem** (82%)
- Distribuicao por **Flag** (50% — risco)
- Distribuicao por **Urgencia** (62%)

### 3. Tab "Perfil do Cliente" (nova — requer clique em um cliente)

Radar/barras mostrando campos comportamentais do lead:
- Investe em Trafego
- Utiliza CRM
- Cenario do Marketing
- Consciencia das Metricas
- Decisor na call (Sim/Nao)

### 4. Tab "Timeline" (nova)

Line chart:
- Leads por mes (Inicio do Projeto)
- Assinaturas por mes (Data da Assinatura)
- Reunioes por semana (Data da Reuniao)

### 5. Enriquecimento do Super Painel (por cliente)

Nova secao "Contexto Kommo" no super painel mostrando:
- Tier + Valor Produto 1 + Ticket Medio (header rico)
- Descricao da Empresa
- Objetivo da Empresa
- Dores do Negocio (destaque vermelho)
- Stack de Ferramentas
- Participantes (lista estruturada)

---

## Recomendacao de implementacao (ordem de prioridade)

1. **Enriquecer super painel com contexto Kommo** — alto impacto, baixo custo (ja temos os dados no `cliente.custom_fields`)
2. **Adicionar camada 4 do RAG** para analyzer IA — textarea fields como contexto extra
3. **Scorecards financeiros no Painel Geral** — agregacao SQL ja existe parcial
4. **Tab "Distribuicao" com 4 donuts** — usa campos com alta cobertura
5. **Filtro Tier na matriz** — 92% de cobertura, alta utilidade

---

## Dados brutos

Arquivo completo com todos os 157 fields: `docs/superpowers/kommo-fields-raw.json`
