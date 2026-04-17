<script setup>
import { computed } from 'vue'

const props = defineProps({
  heatmap: { type: Array, required: true },
  trend: { type: Array, default: () => [] }
})

const heatmapGrid = computed(() => {
  const porFase = {}
  for (const row of props.heatmap) {
    porFase[row.fase] = porFase[row.fase] || { verde: 0, amarelo: 0, vermelho: 0 }
    porFase[row.fase][row.status_cor] = Number(row.total) || 0
  }
  return Object.entries(porFase).map(([fase, counts]) => ({ fase, ...counts }))
})
</script>

<template>
  <div class="tab-visao-geral">
    <div class="card">
      <h3 class="card-title">Heatmap de Fases</h3>
      <div v-if="!heatmapGrid.length" class="empty">
        Sem dados de fases ainda — execute analises para comecar a popular.
      </div>
      <table v-else class="heatmap">
        <thead>
          <tr>
            <th>Fase</th><th>Verde</th><th>Amarelo</th><th>Vermelho</th><th>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="h in heatmapGrid" :key="h.fase">
            <td>{{ h.fase }}</td>
            <td class="cell cell--safe">{{ h.verde }}</td>
            <td class="cell cell--care">{{ h.amarelo }}</td>
            <td class="cell cell--danger">{{ h.vermelho }}</td>
            <td><strong>{{ h.verde + h.amarelo + h.vermelho }}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.tab-visao-geral { display: flex; flex-direction: column; gap: var(--spacing-lg); }
.heatmap { width: 100%; border-collapse: collapse; }
.heatmap th, .heatmap td {
  padding: var(--spacing-sm); text-align: left;
  border-bottom: 1px solid var(--border-row);
}
.heatmap th { color: var(--text-low); font-weight: 500; font-size: var(--font-size-sm); }
.cell { font-weight: 700; text-align: center; }
.cell--safe   { color: var(--color-safe); }
.cell--care   { color: var(--color-care); }
.cell--danger { color: var(--color-danger); }
.empty { padding: var(--spacing-lg); text-align: center; color: var(--text-low); }
</style>
