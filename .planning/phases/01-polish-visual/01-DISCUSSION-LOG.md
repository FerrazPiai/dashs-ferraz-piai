# Phase 1: Polish Visual - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-16
**Phase:** 01-polish-visual
**Areas discussed:** Loading & empty states, Responsividade, Paleta de graficos, Feedback visual

---

## Loading States

| Option | Description | Selected |
|--------|-------------|----------|
| Componente VLoadingState (Recomendado) | Criar componente compartilhado com spinner padrao, tamanho configuravel via prop (sm/md/lg), e padding consistente usando design tokens. | ✓ |
| Apenas CSS padrao | Nao criar componente novo — padronizar apenas as classes CSS no components.css. | |
| Voce decide | Claude escolhe a melhor abordagem. | |

**User's choice:** Componente VLoadingState (Recomendado)
**Notes:** —

### Loading State - Spinner vs Skeleton

| Option | Description | Selected |
|--------|-------------|----------|
| Apenas spinner (Recomendado) | Spinner animado centralizado com tamanho configuravel. Cobre 90% dos casos. | ✓ |
| Spinner + skeleton | Spinner como default, mas aceitar slot para skeleton customizado. | |
| Voce decide | Claude escolhe. | |

**User's choice:** Apenas spinner (Recomendado)
**Notes:** —

---

## Empty States

| Option | Description | Selected |
|--------|-------------|----------|
| Componente VEmptyState (Recomendado) | Criar componente com icone + titulo + descricao opcional. Props: icon, title, description. | ✓ |
| Mensagem inline padronizada | Classe CSS padrao (.empty-state) sem componente. | |
| Voce decide | Claude escolhe. | |

**User's choice:** Componente VEmptyState (Recomendado)
**Notes:** —

### Empty State - Nivel de Detalhe

| Option | Description | Selected |
|--------|-------------|----------|
| Icone + mensagem (Recomendado) | Componente leve: icone Lucide + titulo + descricao opcional. Sem botao de acao. | ✓ |
| Icone + mensagem + acao | Mesmo acima mas com slot para botao de acao. | |
| Voce decide | Claude escolhe. | |

**User's choice:** Icone + mensagem (Recomendado)
**Notes:** —

---

## Responsividade

| Option | Description | Selected |
|--------|-------------|----------|
| Desktop-first, adaptar ate 768px (Recomendado) | Manter design desktop como base. Breakpoints 1024px e 768px. Alinhado com publico interno. | ✓ |
| Mobile-first | Redesenhar partindo de mobile. Mais trabalhoso, muda CSS inteira. | |
| Voce decide | Claude escolhe. | |

**User's choice:** Desktop-first, adaptar ate 768px (Recomendado)
**Notes:** —

### Tabelas Grandes

| Option | Description | Selected |
|--------|-------------|----------|
| Scroll horizontal (Recomendado) | Container com overflow-x: auto. Tabela mantem todas as colunas, usuario arrasta. | ✓ |
| Colunas prioritarias | Esconder colunas menos importantes em telas menores via media query. | |
| Voce decide | Claude escolhe. | |

**User's choice:** Scroll horizontal (Recomendado)
**Notes:** —

---

## Paleta de Graficos

| Option | Description | Selected |
|--------|-------------|----------|
| Centralizar tudo no composable (Recomendado) | useChartDefaults.js vira unica fonte de verdade. VBarChart/VLineChart param de redefinir inline. | ✓ |
| CSS variables para charts | Mover cores para design-system.css. Composable le do CSS. | |
| Voce decide | Claude escolhe. | |

**User's choice:** Centralizar tudo no composable (Recomendado)
**Notes:** —

### Font Sizes em Graficos

| Option | Description | Selected |
|--------|-------------|----------|
| Sim, usar tokens do design system (Recomendado) | Mapear para --font-size-xs, --font-size-sm, --font-size-base. | ✓ |
| Manter hardcoded em charts | Charts tem necessidades diferentes. Manter 11-13px fixos. | |
| Voce decide | Claude escolhe. | |

**User's choice:** Sim, usar tokens do design system (Recomendado)
**Notes:** —

---

## Feedback Visual

| Option | Description | Selected |
|--------|-------------|----------|
| Sutil e consistente (Recomendado) | Hover: rgba branco 5-8%. Click: escurecimento breve. Focus: outline vermelho fino. 150ms. | ✓ |
| Expressivo | Hover com scale (1.02) + shadow. Click com press (0.98). Focus com glow. | |
| Voce decide | Claude escolhe. | |

**User's choice:** Sutil e consistente (Recomendado)
**Notes:** —

### Transicoes de Rota

| Option | Description | Selected |
|--------|-------------|----------|
| Nao, transicao instantanea (Recomendado) | Navegacao instantanea. Loading state do dashboard novo ja fornece feedback. | ✓ |
| Fade sutil | Fade-out 150ms, fade-in. Vue Router transition component. | |
| Voce decide | Claude escolhe. | |

**User's choice:** Nao, transicao instantanea (Recomendado)
**Notes:** —

---

## Claude's Discretion

- CSS variables adicionais (opacity tokens, focus ring colors, error/warning backgrounds)
- Ordem de refatoracao dos dashboards
- Granularidade dos breakpoints responsivos por dashboard

## Deferred Ideas

None — discussion stayed within phase scope
