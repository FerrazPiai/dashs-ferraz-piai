<template>
  <div class="matriz-wrap">
    <table class="matriz-table">
      <thead>
        <tr>
          <th class="col-cliente">Cliente</th>
          <th class="col-squad">Squad</th>
          <th class="col-coord">Coordenador</th>
          <th
            v-for="fase in fases"
            :key="fase"
            class="col-fase"
          >
            {{ fase }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="cliente in clientes" :key="cliente.nome">
          <td class="col-cliente cell-nome">{{ cliente.nome }}</td>
          <td class="col-squad cell-meta">{{ cliente.squad || '—' }}</td>
          <td class="col-coord cell-meta">{{ cliente.coordenador || '—' }}</td>
          <td
            v-for="fase in fases"
            :key="fase"
            class="col-fase cell-fase"
          >
            <span
              class="dot"
              :class="[dotClass(cliente.fases?.[fase]), cliente.detalhes?.[fase] ? 'dot--clicavel' : '']"
              :title="dotLabel(cliente.fases?.[fase])"
              @click="cliente.detalhes?.[fase] ? $emit('click-dot', { cliente, fase }) : null"
            ></span>
          </td>
        </tr>
        <tr v-if="!clientes.length">
          <td :colspan="3 + fases.length" class="empty-row">
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
    default: () => [],
  },
  clientes: {
    type: Array,
    default: () => [],
  },
})

function dotClass(valor) {
  if (!valor) return 'dot--cinza'
  if (valor === 'verde') return 'dot--verde'
  if (valor === 'amarelo') return 'dot--amarelo'
  if (valor === 'vermelho') return 'dot--vermelho'
  return 'dot--cinza'
}

function dotLabel(valor) {
  if (!valor) return 'Não ocorreu'
  if (valor === 'verde') return 'Bom'
  if (valor === 'amarelo') return 'Mediano'
  if (valor === 'vermelho') return 'Ruim'
  return 'Não ocorreu'
}
</script>

<style scoped>
.matriz-wrap {
  overflow-x: auto;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.matriz-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  white-space: nowrap;
}

/* ── Head ─────────────────────────────────────────────────────────────────── */
.matriz-table thead tr {
  background: #1a1a1a;
  position: sticky;
  top: 0;
  z-index: 2;
}

.matriz-table th {
  padding: 10px 16px;
  text-align: left;
  color: #666;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.col-fase {
  text-align: center !important;
  min-width: 90px;
}

/* ── Body ─────────────────────────────────────────────────────────────────── */
.matriz-table tbody tr {
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  transition: background 0.15s;
}

.matriz-table tbody tr:last-child {
  border-bottom: none;
}

.matriz-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.025);
}

.matriz-table td {
  padding: 9px 16px;
  color: #ccc;
}

.cell-nome {
  font-weight: 500;
  color: #e0e0e0;
  min-width: 180px;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cell-meta {
  color: #888;
  min-width: 120px;
}

.cell-fase {
  text-align: center;
}

/* ── Dots ─────────────────────────────────────────────────────────────────── */
.dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  cursor: default;
  transition: transform 0.15s, opacity 0.15s;
}

.dot:hover {
  transform: scale(1.3);
  opacity: 0.9;
}

.dot--cinza    { background-color: #444; }
.dot--verde    { background-color: #22c55e; box-shadow: 0 0 6px rgba(34, 197, 94, 0.4); }
.dot--amarelo  { background-color: #f59e0b; box-shadow: 0 0 6px rgba(245, 158, 11, 0.4); }
.dot--vermelho { background-color: #ef4444; box-shadow: 0 0 6px rgba(239, 68, 68, 0.4); }

.dot--clicavel {
  cursor: pointer;
}
.dot--clicavel:hover {
  transform: scale(1.5);
  filter: brightness(1.2);
}

/* ── Empty ────────────────────────────────────────────────────────────────── */
.empty-row {
  text-align: center;
  color: #555;
  padding: 32px !important;
  font-size: 13px;
}
</style>
