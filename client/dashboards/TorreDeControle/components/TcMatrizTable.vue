<template>
  <div class="matriz-wrap">
    <div class="matriz-scroll">
      <table class="matriz-table">
        <thead>
        <tr>
          <th class="col-cliente">Cliente</th>
          <th class="col-account">Account</th>
          <th
            v-for="fase in fases"
            :key="fase.id ?? fase.nome"
            class="col-fase"
          >
            {{ fase.nome || fase }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="cliente in clientes" :key="cliente.id ?? cliente.lead_id">
          <td class="col-cliente cell-nome">{{ cliente.nome }}</td>
          <td class="col-account cell-meta">{{ cliente.account || '—' }}</td>
          <td
            v-for="fase in fases"
            :key="fase.id ?? fase.nome"
            class="col-fase cell-fase"
          >
            <span
              class="dot"
              :class="[
                dotClass(getFaseDado(cliente, fase)),
                isFaseAtual(cliente, fase) ? 'dot--atual' : '',
                isAuditavel(cliente, fase) ? 'dot--clicavel' : 'dot--bloqueado'
              ]"
              @mouseenter="onDotEnter($event, cliente, fase)"
              @mousemove="onDotMove"
              @mouseleave="onDotLeave"
              @click="isAuditavel(cliente, fase) && $emit('click-dot', { cliente, fase: fase.nome || fase, faseId: fase.id })"
            ></span>
          </td>
        </tr>
        <tr v-if="!clientes.length">
          <td :colspan="2 + fases.length" class="empty-row">
            Nenhum cliente encontrado.
          </td>
        </tr>
      </tbody>
    </table>
    </div>

    <!-- KPI tooltip — Teleport no body pra escapar do overflow do scroll -->
    <Teleport to="body">
      <div
        v-if="tooltip.visible"
        class="matriz-tooltip"
        :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
        role="tooltip"
      >
        <div class="tt-head">
          <span class="tt-dot" :class="tooltip.dotClass"></span>
          <span class="tt-fase">{{ tooltip.faseNome }}</span>
        </div>
        <div v-if="tooltip.score != null" class="tt-kpi">
          <span class="tt-score" :class="tooltip.scoreClass">{{ Number(tooltip.score).toFixed(1) }}</span>
          <span class="tt-score-max">/ 10</span>
          <span class="tt-status" :class="tooltip.scoreClass">{{ tooltip.statusLabel }}</span>
        </div>
        <div v-else class="tt-sem-score">{{ tooltip.semScoreLabel }}</div>
        <div v-if="tooltip.hint" class="tt-hint">{{ tooltip.hint }}</div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { reactive } from 'vue'

defineEmits(['click-dot'])

defineProps({
  fases: {
    type: Array,
    default: () => []
  },
  clientes: {
    type: Array,
    default: () => []
  }
})

// Tooltip KPI — segue o mouse, sai do overflow via Teleport
const tooltip = reactive({
  visible: false, x: 0, y: 0,
  faseNome: '', dotClass: '',
  score: null, scoreClass: '', statusLabel: '',
  semScoreLabel: '', hint: ''
})

function scoreClassFrom(cor) {
  if (cor === 'verde') return 'is-safe'
  if (cor === 'amarelo') return 'is-care'
  if (cor === 'vermelho') return 'is-danger'
  return 'is-muted'
}
function statusLabelFrom(cor) {
  if (cor === 'verde') return 'Bom'
  if (cor === 'amarelo') return 'Mediano'
  if (cor === 'vermelho') return 'Ruim'
  return ''
}

function positionTooltip(ev) {
  const pad = 14
  const maxX = window.innerWidth - 260      // largura aproximada do tooltip
  const maxY = window.innerHeight - 120
  tooltip.x = Math.min(ev.clientX + pad, maxX)
  tooltip.y = Math.min(ev.clientY + pad, maxY)
}

function onDotEnter(ev, cliente, fase) {
  const dado = getFaseDado(cliente, fase)
  const cor = dado?.status_cor
  const isAtual = isFaseAtual(cliente, fase)
  const auditavel = isAuditavel(cliente, fase)
  const slug = typeof fase === 'object' ? fase.slug : null

  tooltip.faseNome = typeof fase === 'object' ? fase.nome : fase
  tooltip.dotClass = dotClass(dado)
  tooltip.score = dado?.score != null ? dado.score : null
  tooltip.scoreClass = scoreClassFrom(cor)
  tooltip.statusLabel = statusLabelFrom(cor)

  // Contexto textual (sem score): atual, bloqueada, incompleta ou sem analise
  if (isAtual && slug === 'projeto-concluido') {
    tooltip.semScoreLabel = 'Projeto concluido'
    tooltip.hint = 'Clique para abrir a Analise Consolidada'
  } else if (isAtual) {
    tooltip.semScoreLabel = 'Fase atual do lead'
    tooltip.hint = 'Aguardando avanco para auditar'
  } else if (!auditavel) {
    tooltip.semScoreLabel = 'Fase futura'
    tooltip.hint = 'Ainda nao ocorreu'
  } else if (cor === 'incompleta') {
    tooltip.semScoreLabel = 'Materiais insuficientes'
    tooltip.hint = 'Colete dados antes de auditar'
    tooltip.score = null
  } else if (!dado || !cor) {
    tooltip.semScoreLabel = 'Sem analise'
    tooltip.hint = 'Clique para auditar esta fase'
  } else {
    tooltip.semScoreLabel = ''
    tooltip.hint = auditavel ? 'Clique para ver a analise' : ''
  }

  positionTooltip(ev)
  tooltip.visible = true
}
function onDotMove(ev) {
  if (tooltip.visible) positionTooltip(ev)
}
function onDotLeave() {
  tooltip.visible = false
}

function getFaseDado(cliente, fase) {
  const faseId = typeof fase === 'object' ? fase.id : null
  const faseNome = typeof fase === 'object' ? fase.nome : fase
  if (faseId != null && cliente.fases?.[faseId]) return cliente.fases[faseId]
  if (cliente.fases?.[faseNome]) return cliente.fases[faseNome]
  return null
}

function isFaseAtual(cliente, fase) {
  const faseId = typeof fase === 'object' ? fase.id : null
  if (faseId == null) return false
  return cliente.fase_atual_stage_id === faseId
}

// Auditavel = fase passada (ordem MENOR que a fase atual do lead).
// Excecao: a fase "Projeto Concluido" (ordem 6) E a fase atual do lead quando ele chega la —
// deve ser clicavel para gerar o Relatorio Consolidado que agrega todas as fases.
function isAuditavel(cliente, fase) {
  const ordem = typeof fase === 'object' ? fase.ordem : null
  const slug  = typeof fase === 'object' ? fase.slug  : null
  if (ordem == null) return false
  const atual = Number(cliente.fase_atual_ordem || 0)
  if (ordem < atual) return true
  // Projeto Concluido clicavel quando o lead JA chegou nessa fase (consolidado)
  if (slug === 'projeto-concluido' && atual >= 6) return true
  return false
}

function dotClass(dado) {
  const cor = dado?.status_cor
  if (cor === 'verde') return 'dot--verde'
  if (cor === 'amarelo') return 'dot--amarelo'
  if (cor === 'vermelho') return 'dot--vermelho'
  if (cor === 'incompleta') return 'dot--incompleta'
  return 'dot--cinza'
}

function dotLabel(cliente, fase, dado) {
  const isAtual = isFaseAtual(cliente, fase)
  const auditavel = isAuditavel(cliente, fase)
  const slug = typeof fase === 'object' ? fase.slug : null
  if (isAtual && slug === 'projeto-concluido') return 'Projeto concluido — clique para abrir a Analise Consolidada'
  if (isAtual) return `Fase atual do lead (aguardando avanco para auditar)`
  if (!auditavel) return `Fase futura — ainda nao ocorreu`
  if (!dado || !dado.status_cor) return 'Sem analise — clique para auditar'
  if (dado.status_cor === 'incompleta') return 'Materiais insuficientes — coletar dados antes de auditar'
  const score = dado.score ? ` (${dado.score})` : ''
  if (dado.status_cor === 'verde') return `Bom${score} — clique para ver`
  if (dado.status_cor === 'amarelo') return `Mediano${score} — clique para ver`
  if (dado.status_cor === 'vermelho') return `Ruim${score} — clique para ver`
  return 'Sem analise'
}
</script>

<style scoped>
/* Wrapper externo — card com bordas arredondadas.
   overflow:hidden garante que o corner radius funcione mesmo com scrollbar interna.
   max-width:100% + min-width:0 previnem que a tabela estoure o viewport (causava scroll lateral na página inteira). */
.matriz-wrap {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-md);
  overflow: hidden;
}

/* Wrapper interno — este é quem rola horizontalmente.
   Mesmo padrão de GtmFunnelTable (CONSOLIDADO — TODOS OS CANAIS). */
.matriz-scroll {
  overflow-x: auto;
  overflow-y: visible;
  max-width: 100%;
  scrollbar-width: thin;
  scrollbar-color: var(--border-input) transparent;
}
.matriz-scroll::-webkit-scrollbar {
  height: 4px;
}
.matriz-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.matriz-scroll::-webkit-scrollbar-thumb {
  background: var(--border-input);
  border-radius: 4px;
}
.matriz-scroll::-webkit-scrollbar-thumb:hover {
  background: var(--text-lowest);
}

.matriz-table {
  width: 100%;
  min-width: max-content;
  border-collapse: collapse;
  font-size: var(--font-size-base);
  white-space: nowrap;
  table-layout: auto;
}

.matriz-table thead tr {
  background: var(--bg-inner);
  position: sticky;
  top: 0;
  z-index: 2;
}

.matriz-table th {
  padding: var(--spacing-sm) var(--spacing-md);
  text-align: left;
  color: var(--text-low);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--border-card);
}

.col-fase {
  text-align: center !important;
  min-width: 90px;
}

.matriz-table tbody tr {
  border-bottom: 1px solid var(--border-row);
  transition: background-color var(--transition-fast);
}

.matriz-table tbody tr:last-child {
  border-bottom: none;
}

.matriz-table tbody tr:hover {
  background-color: var(--bg-hover);
}

.matriz-table td {
  padding: var(--spacing-sm) var(--spacing-md);
  color: var(--text-medium);
}

.cell-nome {
  font-weight: var(--font-weight-semibold);
  color: var(--text-high);
  min-width: 200px;
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: -0.1px;
}

.cell-meta {
  color: var(--text-low);
  min-width: 140px;
  font-size: var(--font-size-base);
}
.cell-meta:empty::before, .cell-meta:has(+ :empty)::before { content: '—'; color: var(--text-lowest); margin-right: 2px; }

.cell-fase {
  text-align: center;
}

.dot {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  transition: transform var(--transition-fast), opacity var(--transition-fast), filter var(--transition-fast);
}

.dot--cinza    { background-color: var(--border-input); border: 1px dashed var(--text-lowest); }
.dot--verde    { background-color: var(--color-safe); box-shadow: 0 0 6px rgba(var(--color-safe-rgb), 0.4); }
.dot--amarelo  { background-color: var(--color-care); box-shadow: 0 0 6px rgba(var(--color-care-rgb), 0.4); }
.dot--vermelho { background-color: var(--color-danger); box-shadow: 0 0 6px rgba(var(--color-danger-rgb), 0.4); }
/* Analise feita mas materiais insuficientes — nao polui KPIs */
.dot--incompleta {
  background-color: var(--bg-inner);
  border: 1px solid var(--chart-color-neutral);
  position: relative;
}
.dot--incompleta::after {
  content: '?';
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  color: var(--text-low); font-size: 9px; font-weight: var(--font-weight-bold);
  line-height: 1;
}

.dot--clicavel {
  cursor: pointer;
}
.dot--clicavel:hover {
  transform: scale(1.5);
  filter: brightness(1.2);
}

.dot--bloqueado {
  cursor: not-allowed;
  opacity: 0.35;
}
.dot--bloqueado:hover {
  transform: none;
  filter: none;
}

/* Destaque da FASE ATUAL do lead (independente de ter analise ou nao) */
.dot--atual {
  position: relative;
  outline: 2px solid var(--text-high);
  outline-offset: 3px;
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.6);
}
.dot--atual::after {
  content: '';
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.4);
  animation: pulse-ring 2s ease-in-out infinite;
  pointer-events: none;
}
@keyframes pulse-ring {
  0%, 100% { transform: scale(1); opacity: 0.7; }
  50% { transform: scale(1.3); opacity: 0; }
}

.empty-row {
  text-align: center;
  color: var(--text-lowest);
  padding: 32px !important;
  font-size: var(--font-size-md);
}

/* KPI tooltip teleportado ao body — nao escondido pelo overflow da tabela */
</style>

<style>
.matriz-tooltip {
  position: fixed;
  z-index: 9999;
  min-width: 220px;
  max-width: 260px;
  padding: 12px 14px;
  background: #141414;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  color: #fff;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.4;
  pointer-events: none;
  animation: matriz-tt-in 120ms ease-out;
}
@keyframes matriz-tt-in {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.matriz-tooltip .tt-head {
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.matriz-tooltip .tt-dot {
  width: 10px; height: 10px; border-radius: 50%;
  flex-shrink: 0;
}
.matriz-tooltip .tt-dot.dot--verde    { background: #10b981; box-shadow: 0 0 6px rgba(16,185,129,0.5); }
.matriz-tooltip .tt-dot.dot--amarelo  { background: #f59e0b; box-shadow: 0 0 6px rgba(245,158,11,0.5); }
.matriz-tooltip .tt-dot.dot--vermelho { background: #ef4444; box-shadow: 0 0 6px rgba(239,68,68,0.5); }
.matriz-tooltip .tt-dot.dot--incompleta { background: #333; border: 1px solid #666; }
.matriz-tooltip .tt-dot.dot--cinza { background: #333; border: 1px dashed #666; }
.matriz-tooltip .tt-fase {
  font-size: 11px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}
.matriz-tooltip .tt-kpi {
  display: flex; align-items: baseline; gap: 4px;
  flex-wrap: wrap;
}
.matriz-tooltip .tt-score {
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.matriz-tooltip .tt-score-max {
  font-size: 13px;
  color: #888;
}
.matriz-tooltip .tt-status {
  margin-left: auto;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.matriz-tooltip .is-safe   { color: #10b981; }
.matriz-tooltip .is-care   { color: #f59e0b; }
.matriz-tooltip .is-danger { color: #ef4444; }
.matriz-tooltip .is-muted  { color: #888; }

.matriz-tooltip .tt-sem-score {
  font-size: 14px;
  font-weight: 600;
  color: #e5e5e5;
}
.matriz-tooltip .tt-hint {
  margin-top: 6px;
  font-size: 12px;
  color: #888;
  font-style: italic;
}
</style>
