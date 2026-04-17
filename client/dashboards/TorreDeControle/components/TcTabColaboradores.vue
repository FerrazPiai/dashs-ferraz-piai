<script setup>
defineProps({
  colaboradores: { type: Array, required: true }
})
</script>

<template>
  <div class="tab-colabs">
    <div v-if="!colaboradores.length" class="empty">
      Nenhuma analise de colaboradores ainda. A primeira roda no proximo domingo as 03:00.
    </div>
    <div v-else class="grid">
      <div class="card colab-card" v-for="c in colaboradores" :key="c.id">
        <div class="colab-header">
          <strong>{{ c.name }}</strong>
          <span class="score" :class="Number(c.score_medio ?? 0) < 5 ? 'danger' : 'safe'">
            {{ c.score_medio ?? '-' }}
          </span>
        </div>
        <div class="colab-stats">
          <span>{{ c.total_clientes || 0 }} clientes</span>
          <span v-if="c.clientes_risco">• {{ c.clientes_risco }} em risco</span>
          <small v-if="c.periodo">• {{ c.periodo }}</small>
        </div>
        <div class="secao" v-if="c.pontos_fortes?.length">
          <h4>Pontos Fortes</h4>
          <ul><li v-for="(p, i) in c.pontos_fortes" :key="i">{{ p }}</li></ul>
        </div>
        <div class="secao" v-if="c.pontos_atencao?.length">
          <h4>Pontos de Atencao</h4>
          <ul><li v-for="(p, i) in c.pontos_atencao" :key="i">{{ p }}</li></ul>
        </div>
        <div class="secao" v-if="c.recomendacoes?.length">
          <h4>Recomendacoes</h4>
          <ol><li v-for="(r, i) in c.recomendacoes" :key="i">{{ r }}</li></ol>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tab-colabs { padding: var(--spacing-md) 0; }
.empty { padding: var(--spacing-2xl); text-align: center; color: var(--text-low); }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: var(--spacing-lg); }
.colab-card { display: flex; flex-direction: column; gap: var(--spacing-md); }
.colab-header { display: flex; justify-content: space-between; align-items: center; }
.colab-stats { color: var(--text-low); font-size: var(--font-size-sm); }
.colab-stats > span + span, .colab-stats > span + small { margin-left: var(--spacing-xs); }
.secao h4 { font-size: var(--font-size-sm); color: var(--text-low); margin: 0 0 var(--spacing-xs); text-transform: uppercase; }
.secao ul, .secao ol { margin: 0; padding-left: var(--spacing-lg); color: var(--text-medium); font-size: var(--font-size-sm); }
.score { font-weight: 700; padding: 2px 10px; border-radius: var(--radius-sm); }
.danger { background: var(--color-danger); color: #fff; }
.safe   { background: var(--color-safe); color: #fff; }
</style>
