<script setup>
import { computed } from 'vue'

const props = defineProps({
  oportunidades: { type: Array, required: true }
})

const total = computed(() =>
  props.oportunidades.reduce((a, o) => a + Number(o.valor || 0), 0)
)
</script>

<template>
  <div class="tab-oportunidades">
    <div class="card">
      <h3 class="card-title">Pipeline de Oportunidades</h3>
      <div v-if="!oportunidades.length" class="empty">
        Nenhuma oportunidade registrada.
      </div>
      <div v-else class="scorecards">
        <div class="scorecard" v-for="o in oportunidades" :key="o.status">
          <div class="scorecard-label">{{ o.status }}</div>
          <div class="scorecard-value">{{ o.total }}</div>
          <div class="scorecard-sub">R$ {{ Number(o.valor || 0).toLocaleString('pt-BR') }}</div>
        </div>
        <div class="scorecard scorecard--total">
          <div class="scorecard-label">Total</div>
          <div class="scorecard-value">R$ {{ total.toLocaleString('pt-BR') }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tab-oportunidades { display: flex; flex-direction: column; gap: var(--spacing-lg); }
.scorecard-sub { color: var(--text-low); font-size: var(--font-size-sm); }
.scorecard--total { border: 1px solid var(--color-primary); }
.empty { padding: var(--spacing-lg); text-align: center; color: var(--text-low); }
</style>
