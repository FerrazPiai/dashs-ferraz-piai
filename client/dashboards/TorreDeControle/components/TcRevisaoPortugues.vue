<script setup>
import { computed, onMounted, nextTick, ref, watch } from 'vue'

// Revisao de Portugues — auditoria ortografica/gramatical dos materiais textuais.
// Shape: { veredicto: 'limpo'|'erros_encontrados'|'nao_aplicavel', mensagem: string, erros: [...] }
// Cada erro: { trecho, localizacao, tipo, correcao }

const props = defineProps({
  revisao: { type: Object, default: null }
})

const veredicto = computed(() => props.revisao?.veredicto || 'nao_aplicavel')
const mensagem  = computed(() => props.revisao?.mensagem || '')
const erros     = computed(() => Array.isArray(props.revisao?.erros) ? props.revisao.erros : [])

const total = computed(() => erros.value.length)

const TIPO_LABEL = {
  ortografia:   'Ortografia',
  concordancia: 'Concordância',
  acentuacao:   'Acentuação',
  digitacao:    'Digitação',
  pontuacao:    'Pontuação',
  clareza:      'Clareza'
}
function tipoLabel(t) {
  return TIPO_LABEL[String(t || '').toLowerCase()] || 'Revisão'
}

const aberto = ref(true)
function toggle() {
  aberto.value = !aberto.value
  nextTick(() => window.lucide && window.lucide.createIcons())
}

onMounted(() => nextTick(() => window.lucide && window.lucide.createIcons()))
watch(() => props.revisao, () => nextTick(() => window.lucide && window.lucide.createIcons()), { deep: true })
</script>

<template>
  <section class="rp-section" v-if="revisao" :class="{ 'is-collapsed': !aberto }">
    <header class="rp-head rp-head--clickable" @click="toggle" role="button" :aria-expanded="aberto">
      <h2>
        <i data-lucide="spell-check" class="rp-head-icon"></i>
        Revisão de Português
      </h2>
      <div class="rp-head-right">
        <span
          class="rp-status-pill"
          :class="`rp-status-pill--${veredicto}`"
        >
          <i
            :data-lucide="veredicto === 'limpo'
              ? 'check-circle-2'
              : veredicto === 'erros_encontrados'
                ? 'alert-triangle'
                : 'minus-circle'"
            class="rp-pill-icon"
          ></i>
          <span v-if="veredicto === 'limpo'">Sem erros</span>
          <span v-else-if="veredicto === 'erros_encontrados'">
            {{ total }} {{ total === 1 ? 'erro encontrado' : 'erros encontrados' }}
          </span>
          <span v-else>Não aplicável</span>
        </span>
        <button
          type="button"
          class="rp-toggle"
          @click.stop="toggle"
          :aria-label="aberto ? 'Recolher' : 'Expandir'"
        >
          <svg class="rp-toggle-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline v-if="aberto" points="6 9 12 15 18 9"/>
            <polyline v-else points="18 15 12 9 6 15"/>
          </svg>
        </button>
      </div>
    </header>

    <Transition name="rp-slide-fade">
      <div v-show="aberto" class="rp-body">
        <!-- Mensagem resumo -->
        <p
          v-if="mensagem"
          class="rp-message"
          :class="`rp-message--${veredicto}`"
        >{{ mensagem }}</p>

        <!-- Lista de erros (se houver) -->
        <ul v-if="erros.length" class="rp-list">
          <li v-for="(err, i) in erros" :key="'rp-' + i" class="rp-item">
            <div class="rp-item-head">
              <span class="rp-tipo">{{ tipoLabel(err.tipo) }}</span>
              <span v-if="err.localizacao" class="rp-local">
                <i data-lucide="map-pin" class="rp-loc-icon"></i>
                {{ err.localizacao }}
              </span>
            </div>
            <div v-if="err.trecho" class="rp-trecho">
              <span class="rp-label">Trecho:</span>
              <q>{{ err.trecho }}</q>
            </div>
            <div v-if="err.correcao" class="rp-correcao">
              <span class="rp-label">Correção:</span>
              <span>{{ err.correcao }}</span>
            </div>
          </li>
        </ul>
      </div>
    </Transition>
  </section>
</template>

<style scoped>
.rp-section {
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-md);
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.rp-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rp-slide-fade-enter-active,
.rp-slide-fade-leave-active {
  transition: opacity 180ms ease, transform 180ms ease, max-height 220ms ease;
  overflow: hidden;
}
.rp-slide-fade-enter-from,
.rp-slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
  max-height: 0;
}
.rp-slide-fade-enter-to,
.rp-slide-fade-leave-from {
  opacity: 1;
  max-height: 2000px;
}

.rp-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.rp-head--clickable { cursor: pointer; user-select: none; }
.rp-head h2 {
  font-size: 15px;
  color: var(--text-high);
  margin: 0;
  font-weight: var(--font-weight-semibold);
  display: flex;
  align-items: center;
  gap: 8px;
}
.rp-head-icon { width: 16px; height: 16px; color: var(--text-muted); }
.rp-head-right { display: flex; align-items: center; gap: 10px; }

.rp-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  border: 1px solid transparent;
}
.rp-pill-icon { width: 12px; height: 12px; }
.rp-status-pill--limpo {
  background: rgba(var(--color-safe-rgb), 0.12);
  color: var(--color-safe);
  border-color: rgba(var(--color-safe-rgb), 0.25);
}
.rp-status-pill--erros_encontrados {
  background: rgba(var(--color-care-rgb), 0.12);
  color: var(--color-care);
  border-color: rgba(var(--color-care-rgb), 0.25);
}
.rp-status-pill--nao_aplicavel {
  background: var(--bg-inner);
  color: var(--text-low);
  border-color: var(--border-row);
}

.rp-toggle {
  background: transparent;
  border: none;
  color: var(--text-low);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: color var(--transition-fast), background var(--transition-fast);
}
.rp-toggle:hover { color: var(--text-medium); background: var(--bg-hover); }
.rp-toggle-icon { width: 14px; height: 14px; }

.rp-message {
  margin: 0;
  font-size: var(--font-size-md);
  line-height: 1.55;
  color: var(--text-medium);
  padding: 10px 14px;
  border-radius: var(--radius-md);
  border-left: 3px solid var(--border-input);
  background: var(--bg-inner);
}
.rp-message--limpo {
  border-left-color: var(--color-safe);
  background: rgba(var(--color-safe-rgb), 0.05);
}
.rp-message--erros_encontrados {
  border-left-color: var(--color-care);
  background: rgba(var(--color-care-rgb), 0.05);
}

.rp-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.rp-item {
  background: var(--bg-inner);
  border: 1px solid var(--border-row);
  border-left: 3px solid var(--color-care);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rp-item-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}
.rp-tipo {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-care);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.rp-local {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-sm);
  color: var(--text-lowest);
}
.rp-loc-icon { width: 11px; height: 11px; }

.rp-trecho,
.rp-correcao {
  display: flex;
  gap: 6px;
  font-size: var(--font-size-md);
  color: var(--text-medium);
  line-height: 1.5;
  flex-wrap: wrap;
}
.rp-label {
  color: var(--text-lowest);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  font-size: var(--font-size-sm);
  flex-shrink: 0;
  min-width: 64px;
}
.rp-trecho q {
  color: var(--color-danger);
  font-style: italic;
  quotes: '“' '”';
}
.rp-correcao span:last-child {
  color: var(--color-safe);
}
</style>
