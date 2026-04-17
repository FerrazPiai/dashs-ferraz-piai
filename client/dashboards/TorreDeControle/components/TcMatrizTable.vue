<template>
  <div class="matriz-wrap">
    <table class="matriz-table">
      <thead>
        <tr>
          <th class="col-cliente">Cliente</th>
          <th class="col-account">Account</th>
          <th
            v-for="fase in fases"
            :key="fase.id || fase.nome || fase"
            class="col-fase"
          >
            {{ fase.nome || fase }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="cliente in clientes" :key="cliente.id || cliente.lead_id">
          <td class="col-cliente cell-nome">{{ cliente.nome }}</td>
          <td class="col-account cell-meta">{{ cliente.account || '—' }}</td>
          <td
            v-for="fase in fases"
            :key="fase.id || fase.nome || fase"
            class="col-fase cell-fase"
          >
            <span
              class="dot"
              :class="[
                dotClass(getFaseDado(cliente, fase)),
                isFaseAtual(cliente, fase) ? 'dot--atual' : '',
                isAuditavel(cliente, fase) ? 'dot--clicavel' : 'dot--bloqueado'
              ]"
              :title="dotLabel(cliente, fase, getFaseDado(cliente, fase))"
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
</template>

<script setup>
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
.matriz-wrap {
  overflow-x: auto;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-card);
  background: var(--bg-card);
}

.matriz-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-base);
  white-space: nowrap;
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
  background-color: rgba(255, 255, 255, 0.02);
}

.matriz-table td {
  padding: var(--spacing-sm) var(--spacing-md);
  color: var(--text-medium);
}

.cell-nome {
  font-weight: 600;
  color: #fff;
  min-width: 200px;
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: -0.1px;
}

.cell-meta {
  color: #aaa;
  min-width: 140px;
  font-size: 12.5px;
}
.cell-meta:empty::before, .cell-meta:has(+ :empty)::before { content: '—'; color: #555; }

.cell-fase {
  text-align: center;
}

.dot {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  transition: transform 0.15s, opacity 0.15s, filter 0.15s;
}

.dot--cinza    { background-color: #333; border: 1px dashed #555; }
.dot--verde    { background-color: #22c55e; box-shadow: 0 0 6px rgba(34, 197, 94, 0.4); }
.dot--amarelo  { background-color: #f59e0b; box-shadow: 0 0 6px rgba(245, 158, 11, 0.4); }
.dot--vermelho { background-color: #ef4444; box-shadow: 0 0 6px rgba(239, 68, 68, 0.4); }
/* Analise feita mas materiais insuficientes — nao polui KPIs */
.dot--incompleta {
  background-color: #1f2937;
  border: 1px solid #6b7280;
  position: relative;
}
.dot--incompleta::after {
  content: '?';
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  color: #9ca3af; font-size: 9px; font-weight: 700;
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
  outline: 2px solid #ffffff;
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
  color: #555;
  padding: 32px !important;
  font-size: 13px;
}
</style>
