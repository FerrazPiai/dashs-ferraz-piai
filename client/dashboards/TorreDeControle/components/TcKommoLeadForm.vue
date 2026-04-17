<script setup>
import { ref } from 'vue'

const props = defineProps({
  oportunidade: { type: Object, default: null }
})
const emit = defineEmits(['submit', 'cancel'])

const PIPELINES = [
  { id: '12184216', nome: 'Pre-Vendas' },
  { id: '12184220', nome: 'Aquisicao' },
  { id: '12184212', nome: 'Expansao' },
  { id: '12887948', nome: 'Fabrica de Receitas' },
  { id: '13504320', nome: 'Ter' },
  { id: '13504028', nome: 'Executar Onboarding' },
  { id: '13504212', nome: 'Executar Retention' },
  { id: '12697488', nome: 'Nutricao' }
]

const form = ref({
  pipelineId: PIPELINES[0].id,
  statusId: '',
  name: props.oportunidade?.titulo || '',
  valor: props.oportunidade?.valor_estimado || 0,
  observacoes: props.oportunidade?.descricao || ''
})
const submitting = ref(false)
const errorMsg = ref('')

async function handleSubmit() {
  if (!form.value.name || !form.value.statusId) {
    errorMsg.value = 'Nome e ID da etapa sao obrigatorios'
    return
  }
  submitting.value = true
  errorMsg.value = ''
  try {
    emit('submit', { ...form.value })
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <form class="kommo-form" @submit.prevent="handleSubmit">
    <label>
      Pipeline
      <select v-model="form.pipelineId">
        <option v-for="p in PIPELINES" :key="p.id" :value="p.id">{{ p.nome }}</option>
      </select>
    </label>
    <label>
      ID da etapa (status)
      <input v-model="form.statusId" type="text" placeholder="ex: 142" />
    </label>
    <label>
      Nome do lead
      <input v-model="form.name" type="text" required />
    </label>
    <label>
      Valor (R$)
      <input v-model.number="form.valor" type="number" step="0.01" />
    </label>
    <label>
      Observacoes
      <textarea v-model="form.observacoes" rows="3" />
    </label>
    <div v-if="errorMsg" class="error">{{ errorMsg }}</div>
    <div class="actions">
      <button type="button" class="btn" @click="emit('cancel')">Cancelar</button>
      <button type="submit" class="btn" :disabled="submitting">
        {{ submitting ? 'Criando...' : 'Criar no Kommo' }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.kommo-form { display: flex; flex-direction: column; gap: var(--spacing-md); }
.kommo-form label {
  display: flex; flex-direction: column; gap: var(--spacing-xs);
  font-size: var(--font-size-sm); color: var(--text-low);
}
.kommo-form input, .kommo-form select, .kommo-form textarea {
  background: var(--bg-inner); border: 1px solid var(--border-card);
  color: var(--text-high); padding: var(--spacing-sm);
  border-radius: var(--radius-sm); font-family: inherit;
}
.actions { display: flex; gap: var(--spacing-sm); justify-content: flex-end; }
.error { color: var(--color-danger); font-size: var(--font-size-sm); }
</style>
