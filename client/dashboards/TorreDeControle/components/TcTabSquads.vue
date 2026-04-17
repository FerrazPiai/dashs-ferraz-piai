<script setup>
defineProps({
  squads: { type: Array, required: true }
})
</script>

<template>
  <div class="tab-squads">
    <div class="card">
      <h3 class="card-title">Saude por Squad</h3>
      <div v-if="!squads.length" class="empty">
        Sem squads atribuidos a clientes com analises.
      </div>
      <table v-else class="table">
        <thead>
          <tr>
            <th>Squad</th><th>Clientes</th><th>Score medio</th><th>Risco</th><th>Oportunidades</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in squads" :key="s.squad || 'sem-squad'">
            <td>{{ s.squad || '(sem squad)' }}</td>
            <td>{{ s.clientes }}</td>
            <td>
              <strong :class="Number(s.score_medio) < 5 ? 'danger' : Number(s.score_medio) < 7 ? 'care' : 'safe'">
                {{ s.score_medio ?? '-' }}
              </strong>
            </td>
            <td>{{ s.risco }}</td>
            <td>R$ {{ Number(s.oportunidades || 0).toLocaleString('pt-BR') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.tab-squads { display: flex; flex-direction: column; gap: var(--spacing-lg); }
.danger { color: var(--color-danger); }
.care   { color: var(--color-care); }
.safe   { color: var(--color-safe); }
.empty { padding: var(--spacing-lg); text-align: center; color: var(--text-low); }
</style>
