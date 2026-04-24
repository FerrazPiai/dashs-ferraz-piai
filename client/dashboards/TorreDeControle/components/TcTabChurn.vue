<script setup>
defineProps({
  churn: { type: Array, required: true }
})
const emit = defineEmits(['abrir-cliente'])
</script>

<template>
  <div class="tab-churn">
    <div class="card">
      <h3 class="card-title">Radar de Churn — Clientes em Risco</h3>
      <p class="subtitulo">Ordenado por score ascendente + dores graves</p>
      <ul class="lista-risco">
        <li v-for="c in churn" :key="c.id" class="item" @click="emit('abrir-cliente', c.id)">
          <div class="meta">
            <strong>{{ c.nome }}</strong>
            <span class="veredicto">{{ c.veredicto }}</span>
          </div>
          <div class="indicadores">
            <span class="score" :class="Number(c.score) < 3 ? 'critico' : Number(c.score) < 5 ? 'alto' : 'medio'">
              {{ c.score }}
            </span>
            <span v-if="Number(c.dores_graves) > 0" class="dores">
              {{ c.dores_graves }} dor(es) grave(s)
            </span>
          </div>
        </li>
        <li v-if="!churn.length" class="empty">Nenhum cliente em zona de risco.</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.subtitulo { color: var(--text-low); margin-bottom: var(--spacing-md); }
.lista-risco { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--spacing-xs); }
.item {
  display: flex; justify-content: space-between; align-items: center;
  padding: var(--spacing-sm); border-radius: var(--radius-sm);
  cursor: pointer; transition: background var(--transition-fast);
}
.item:hover { background: var(--bg-hover); }
.meta { display: flex; flex-direction: column; }
.veredicto { color: var(--text-low); font-size: var(--font-size-sm); }
.indicadores { display: flex; align-items: center; gap: var(--spacing-md); }
.score {
  font-weight: 700; font-size: var(--font-size-lg);
  padding: 2px 8px; border-radius: var(--radius-sm);
}
.critico { background: var(--color-danger); color: var(--text-high); }
.alto    { background: var(--color-care); color: #000; }
.medio   { background: var(--bg-inner); color: var(--text-high); }
.dores { color: var(--color-danger); font-size: var(--font-size-sm); }
.empty { color: var(--text-lowest); text-align: center; padding: var(--spacing-lg); }
</style>
