<template>
  <!-- Overlay -->
  <Teleport to="body">
    <Transition name="overlay">
      <div v-if="visible" class="tc-overlay" @click="$emit('close')" />
    </Transition>

    <!-- Drawer -->
    <Transition name="drawer">
      <div v-if="visible" class="tc-drawer" role="dialog" :aria-label="`Detalhes: ${cliente?.nome} — ${fase}`">
        <!-- Header -->
        <div class="drawer-header">
          <div class="drawer-header-left">
            <span class="dot-badge" :class="`dot-badge--${status}`"></span>
            <div>
              <p class="drawer-cliente">{{ cliente?.nome }}</p>
              <p class="drawer-fase">{{ fase }}</p>
            </div>
          </div>
          <button class="btn-fechar" @click="$emit('close')" title="Fechar">
            <i data-lucide="x"></i>
          </button>
        </div>

        <!-- Sem dados -->
        <div v-if="!detalhe" class="sem-dados">
          <i data-lucide="file-x"></i>
          <p>Nenhum detalhe disponível para esta fase.</p>
        </div>

        <!-- Conteúdo -->
        <div v-else class="drawer-body">

          <!-- Score -->
          <div class="secao secao-score">
            <div class="score-wrap">
              <span class="score-numero" :class="scoreClass">{{ detalhe.score?.toFixed(1) }}</span>
              <span class="score-label">/ 10</span>
            </div>
            <span class="score-texto" :class="scoreClass">{{ scoreTexto }}</span>
          </div>

          <!-- Resumo -->
          <div v-if="detalhe.resumo" class="secao">
            <h4 class="secao-titulo">
              <i data-lucide="file-text"></i>
              Resumo da Reunião
            </h4>
            <p class="secao-texto">{{ detalhe.resumo }}</p>
          </div>

          <!-- Análise de Materiais -->
          <div v-if="detalhe.analise_materiais" class="secao">
            <h4 class="secao-titulo">
              <i data-lucide="layers"></i>
              Análise dos Materiais
            </h4>
            <p class="secao-texto">{{ detalhe.analise_materiais }}</p>
          </div>

          <!-- Insatisfações -->
          <div v-if="detalhe.insatisfacoes?.length" class="secao secao-alerta">
            <h4 class="secao-titulo secao-titulo--alerta">
              <i data-lucide="alert-triangle"></i>
              Insatisfações do Cliente
            </h4>
            <ul class="lista-alerta">
              <li v-for="(item, i) in detalhe.insatisfacoes" :key="i">
                <i data-lucide="minus"></i>
                {{ item }}
              </li>
            </ul>
          </div>

          <!-- Oportunidades -->
          <div v-if="detalhe.oportunidades?.length" class="secao secao-oportunidades">
            <h4 class="secao-titulo secao-titulo--verde">
              <i data-lucide="trending-up"></i>
              Oportunidades de Expansão
            </h4>
            <div class="lista-oportunidades">
              <div
                v-for="(op, i) in detalhe.oportunidades"
                :key="i"
                class="oportunidade-card"
              >
                <div class="oportunidade-info">
                  <p class="oportunidade-titulo">{{ op.titulo }}</p>
                  <p class="oportunidade-desc">{{ op.descricao }}</p>
                  <p v-if="op.valor" class="oportunidade-valor">
                    {{ formatCurrency(op.valor) }}
                  </p>
                </div>
                <button
                  class="btn-crm"
                  @click="$emit('criar-oportunidade', { cliente, fase, oportunidade: op })"
                  title="Criar oportunidade no CRM"
                >
                  <i data-lucide="plus-circle"></i>
                  Criar no CRM
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, watch, nextTick } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  cliente: { type: Object, default: null },
  fase: { type: String, default: '' },
})

defineEmits(['close', 'criar-oportunidade'])

const detalhe = computed(() => {
  if (!props.cliente || !props.fase) return null
  return props.cliente.detalhes?.[props.fase] ?? null
})

const status = computed(() => {
  if (!props.cliente || !props.fase) return null
  return props.cliente.fases?.[props.fase] ?? null
})

// Escala unica de cor por score: 9-10 = verde, 7-8 = amarelo, <=6 = vermelho
const scoreClass = computed(() => {
  const s = detalhe.value?.score
  if (s == null) return ''
  if (s >= 9) return 'score--verde'
  if (s >= 7) return 'score--amarelo'
  return 'score--vermelho'
})

const scoreTexto = computed(() => {
  const s = detalhe.value?.score
  if (s == null) return ''
  if (s >= 9) return 'Bom'
  if (s >= 7) return 'Mediano'
  return 'Ruim'
})

function formatCurrency(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Recriar ícones Lucide sempre que o painel abrir ou o conteúdo mudar
watch(() => [props.visible, props.cliente, props.fase], async () => {
  if (!props.visible) return
  await nextTick()
  if (window.lucide) window.lucide.createIcons()
})
</script>

<style scoped>
/* ── Overlay ──────────────────────────────────────────────────────────────── */
.tc-overlay {
  position: fixed; inset: 0; z-index: 100;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(2px);
}

/* ── Drawer ───────────────────────────────────────────────────────────────── */
.tc-drawer {
  position: fixed; top: 0; right: 0; bottom: 0; z-index: 101;
  width: 460px; max-width: 95vw;
  background: var(--bg-card);
  border-left: 1px solid var(--border-card);
  display: flex; flex-direction: column;
  overflow: hidden;
}

/* ── Header ───────────────────────────────────────────────────────────────── */
.drawer-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--spacing-lg) var(--spacing-xl);
  border-bottom: 1px solid var(--border-row);
  flex-shrink: 0;
  gap: 12px;
}

.drawer-header-left {
  display: flex; align-items: center; gap: 14px; min-width: 0;
}

.dot-badge {
  flex-shrink: 0;
  width: 14px; height: 14px; border-radius: 50%;
}
.dot-badge--verde    { background: var(--color-safe); box-shadow: 0 0 8px rgba(var(--color-safe-rgb), 0.5); }
.dot-badge--amarelo  { background: var(--color-care); box-shadow: 0 0 8px rgba(var(--color-care-rgb), 0.5); }
.dot-badge--vermelho { background: var(--color-danger); box-shadow: 0 0 8px rgba(var(--color-danger-rgb), 0.5); }

.drawer-cliente {
  font-size: 15px; font-weight: var(--font-weight-semibold); color: var(--text-medium);
  margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.drawer-fase {
  font-size: var(--font-size-base); color: var(--text-lowest); margin: 0; margin-top: 2px;
  text-transform: uppercase; letter-spacing: 0.5px;
}

.btn-fechar {
  flex-shrink: 0;
  background: none; border: none; cursor: pointer; color: var(--text-lowest);
  padding: 6px; border-radius: var(--radius-sm);
  transition: color var(--transition-fast), background var(--transition-fast);
  display: flex; align-items: center;
}
.btn-fechar:hover { color: var(--text-medium); background: var(--bg-hover); }

/* ── Body ─────────────────────────────────────────────────────────────────── */
.drawer-body {
  flex: 1; overflow-y: auto; padding: 24px;
  display: flex; flex-direction: column; gap: 24px;
}

/* ── Sem dados ────────────────────────────────────────────────────────────── */
.sem-dados {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 12px;
  color: var(--text-lowest); font-size: var(--font-size-lg); text-align: center; padding: 40px;
}

/* ── Seções ───────────────────────────────────────────────────────────────── */
.secao {
  display: flex; flex-direction: column; gap: 10px;
}

.secao-titulo {
  display: flex; align-items: center; gap: 8px;
  font-size: var(--font-size-base); font-weight: var(--font-weight-semibold); text-transform: uppercase;
  letter-spacing: 0.6px; color: var(--text-lowest); margin: 0;
}
.secao-titulo--alerta { color: var(--color-danger); }
.secao-titulo--verde  { color: var(--color-safe); }

.secao-texto {
  font-size: var(--font-size-lg); color: var(--text-low); line-height: 1.65; margin: 0;
}

/* ── Score ────────────────────────────────────────────────────────────────── */
.secao-score {
  background: var(--bg-inner); border: 1px solid var(--border-row);
  border-radius: var(--radius-md); padding: var(--spacing-lg) var(--spacing-xl);
  flex-direction: row; align-items: center; gap: 16px;
}

.score-wrap {
  display: flex; align-items: baseline; gap: 4px;
}

.score-numero {
  font-size: 44px; font-weight: var(--font-weight-bold); line-height: 1;
  font-variant-numeric: tabular-nums;
}
.score-label { font-size: 18px; color: var(--text-lowest); }

.score-texto {
  font-size: 15px; font-weight: var(--font-weight-medium);
}

.score--verde   { color: var(--color-safe); }
.score--amarelo { color: var(--color-care); }
.score--vermelho { color: var(--color-danger); }

/* ── Insatisfações ────────────────────────────────────────────────────────── */
.secao-alerta {
  background: rgba(var(--color-danger-rgb), 0.05);
  border: 1px solid rgba(var(--color-danger-rgb), 0.15);
  border-radius: var(--radius-md); padding: 16px;
}

.lista-alerta {
  list-style: none; margin: 0; padding: 0;
  display: flex; flex-direction: column; gap: 8px;
}
.lista-alerta li {
  display: flex; align-items: flex-start; gap: 8px;
  font-size: var(--font-size-md); color: var(--text-medium); line-height: 1.55;
}
.lista-alerta li i { flex-shrink: 0; color: var(--color-danger); margin-top: 2px; }

/* ── Oportunidades ────────────────────────────────────────────────────────── */
.secao-oportunidades {
  background: rgba(var(--color-safe-rgb), 0.04);
  border: 1px solid rgba(var(--color-safe-rgb), 0.12);
  border-radius: var(--radius-md); padding: 16px;
}

.lista-oportunidades {
  display: flex; flex-direction: column; gap: 12px;
}

.oportunidade-card {
  display: flex; align-items: flex-start;
  justify-content: space-between; gap: 16px;
  background: var(--bg-inner);
  border: 1px solid var(--border-row);
  border-radius: var(--radius-md); padding: 14px;
}

.oportunidade-info { flex: 1; min-width: 0; }
.oportunidade-titulo {
  font-size: var(--font-size-md); font-weight: var(--font-weight-semibold); color: var(--text-medium); margin: 0 0 4px;
}
.oportunidade-desc {
  font-size: var(--font-size-base); color: var(--text-muted); margin: 0 0 6px; line-height: 1.5;
}
.oportunidade-valor {
  font-size: var(--font-size-md); font-weight: var(--font-weight-semibold); color: var(--color-safe); margin: 0;
}

.btn-crm {
  flex-shrink: 0;
  display: flex; align-items: center; gap: 6px;
  background: rgba(var(--color-primary-rgb), 0.1);
  border: 1px solid rgba(var(--color-primary-rgb), 0.25);
  color: var(--color-primary); font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold); font-family: inherit;
  padding: 8px 12px; border-radius: var(--radius-sm); cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast);
  white-space: nowrap;
}
.btn-crm:hover {
  background: rgba(var(--color-primary-rgb), 0.18);
  border-color: rgba(var(--color-primary-rgb), 0.4);
}

/* ── Transições ───────────────────────────────────────────────────────────── */
.overlay-enter-active, .overlay-leave-active { transition: opacity 0.2s ease; }
.overlay-enter-from, .overlay-leave-to { opacity: 0; }

.drawer-enter-active, .drawer-leave-active { transition: transform 0.25s ease; }
.drawer-enter-from, .drawer-leave-to { transform: translateX(100%); }
</style>
