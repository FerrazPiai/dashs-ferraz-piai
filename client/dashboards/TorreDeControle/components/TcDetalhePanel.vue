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

const scoreClass = computed(() => {
  const s = detalhe.value?.score
  if (s == null) return ''
  if (s >= 8) return 'score--verde'
  if (s >= 6) return 'score--amarelo'
  return 'score--vermelho'
})

const scoreTexto = computed(() => {
  const s = detalhe.value?.score
  if (s == null) return ''
  if (s >= 8) return 'Bom'
  if (s >= 6) return 'Mediano'
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
  background: #141414;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  display: flex; flex-direction: column;
  overflow: hidden;
}

/* ── Header ───────────────────────────────────────────────────────────────── */
.drawer-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
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
.dot-badge--verde    { background: #22c55e; box-shadow: 0 0 8px rgba(34,197,94,0.5); }
.dot-badge--amarelo  { background: #f59e0b; box-shadow: 0 0 8px rgba(245,158,11,0.5); }
.dot-badge--vermelho { background: #ef4444; box-shadow: 0 0 8px rgba(239,68,68,0.5); }

.drawer-cliente {
  font-size: 15px; font-weight: 600; color: #e0e0e0;
  margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.drawer-fase {
  font-size: 12px; color: #666; margin: 0; margin-top: 2px;
  text-transform: uppercase; letter-spacing: 0.5px;
}

.btn-fechar {
  flex-shrink: 0;
  background: none; border: none; cursor: pointer; color: #555;
  padding: 6px; border-radius: 4px; transition: color 0.15s, background 0.15s;
  display: flex; align-items: center;
}
.btn-fechar:hover { color: #ccc; background: rgba(255,255,255,0.06); }

/* ── Body ─────────────────────────────────────────────────────────────────── */
.drawer-body {
  flex: 1; overflow-y: auto; padding: 24px;
  display: flex; flex-direction: column; gap: 24px;
}

/* ── Sem dados ────────────────────────────────────────────────────────────── */
.sem-dados {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 12px;
  color: #555; font-size: 14px; text-align: center; padding: 40px;
}

/* ── Seções ───────────────────────────────────────────────────────────────── */
.secao {
  display: flex; flex-direction: column; gap: 10px;
}

.secao-titulo {
  display: flex; align-items: center; gap: 8px;
  font-size: 12px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.6px; color: #666; margin: 0;
}
.secao-titulo--alerta { color: #ef4444; }
.secao-titulo--verde  { color: #22c55e; }

.secao-texto {
  font-size: 14px; color: #aaa; line-height: 1.65; margin: 0;
}

/* ── Score ────────────────────────────────────────────────────────────────── */
.secao-score {
  background: #1a1a1a; border: 1px solid rgba(255,255,255,0.07);
  border-radius: 6px; padding: 20px 24px;
  flex-direction: row; align-items: center; gap: 16px;
}

.score-wrap {
  display: flex; align-items: baseline; gap: 4px;
}

.score-numero {
  font-size: 44px; font-weight: 700; line-height: 1;
  font-variant-numeric: tabular-nums;
}
.score-label { font-size: 18px; color: #555; }

.score-texto {
  font-size: 15px; font-weight: 500;
}

.score--verde   { color: #22c55e; }
.score--amarelo { color: #f59e0b; }
.score--vermelho { color: #ef4444; }

/* ── Insatisfações ────────────────────────────────────────────────────────── */
.secao-alerta {
  background: rgba(239, 68, 68, 0.05);
  border: 1px solid rgba(239, 68, 68, 0.15);
  border-radius: 6px; padding: 16px;
}

.lista-alerta {
  list-style: none; margin: 0; padding: 0;
  display: flex; flex-direction: column; gap: 8px;
}
.lista-alerta li {
  display: flex; align-items: flex-start; gap: 8px;
  font-size: 13px; color: #ccc; line-height: 1.55;
}
.lista-alerta li i { flex-shrink: 0; color: #ef4444; margin-top: 2px; }

/* ── Oportunidades ────────────────────────────────────────────────────────── */
.secao-oportunidades {
  background: rgba(34, 197, 94, 0.04);
  border: 1px solid rgba(34, 197, 94, 0.12);
  border-radius: 6px; padding: 16px;
}

.lista-oportunidades {
  display: flex; flex-direction: column; gap: 12px;
}

.oportunidade-card {
  display: flex; align-items: flex-start;
  justify-content: space-between; gap: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px; padding: 14px;
}

.oportunidade-info { flex: 1; min-width: 0; }
.oportunidade-titulo {
  font-size: 13px; font-weight: 600; color: #e0e0e0; margin: 0 0 4px;
}
.oportunidade-desc {
  font-size: 12px; color: #888; margin: 0 0 6px; line-height: 1.5;
}
.oportunidade-valor {
  font-size: 13px; font-weight: 600; color: #22c55e; margin: 0;
}

.btn-crm {
  flex-shrink: 0;
  display: flex; align-items: center; gap: 6px;
  background: rgba(255, 0, 0, 0.1); border: 1px solid rgba(255, 0, 0, 0.25);
  color: #ff4444; font-size: 12px; font-weight: 600; font-family: inherit;
  padding: 8px 12px; border-radius: 5px; cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  white-space: nowrap;
}
.btn-crm:hover {
  background: rgba(255, 0, 0, 0.18); border-color: rgba(255, 0, 0, 0.4);
}

/* ── Transições ───────────────────────────────────────────────────────────── */
.overlay-enter-active, .overlay-leave-active { transition: opacity 0.2s ease; }
.overlay-enter-from, .overlay-leave-to { opacity: 0; }

.drawer-enter-active, .drawer-leave-active { transition: transform 0.25s ease; }
.drawer-enter-from, .drawer-leave-to { transform: translateX(100%); }
</style>
