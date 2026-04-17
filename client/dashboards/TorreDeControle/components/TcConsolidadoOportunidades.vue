<script setup>
import { computed, ref, onMounted, nextTick, watch } from 'vue'

const props = defineProps({
  oportunidades: { type: Array, default: () => [] }
})
const emit = defineEmits(['criar-kommo'])

// Ordena por probabilidade (mais quente primeiro)
const ordenadas = computed(() => {
  return [...props.oportunidades].sort((a, b) =>
    Number(b.probabilidade_fechamento || 0) - Number(a.probabilidade_fechamento || 0)
  )
})

const valorTotal = computed(() =>
  ordenadas.value.reduce((a, o) => a + (Number(o.valor_estimado) || 0), 0)
)

const expandido = ref(new Set())
function toggle(i) {
  const s = new Set(expandido.value)
  if (s.has(i)) s.delete(i)
  else s.add(i)
  expandido.value = s
  nextTick(() => window.lucide && window.lucide.createIcons())
}

function probClass(p) {
  const n = Number(p)
  if (!isFinite(n)) return 'prob--baixa'
  if (n >= 70) return 'prob--alta'
  if (n >= 40) return 'prob--media'
  return 'prob--baixa'
}

function brl(v) {
  return Number(v || 0).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL', maximumFractionDigits: 0
  })
}

onMounted(() => nextTick(() => window.lucide && window.lucide.createIcons()))
watch(() => ordenadas.value, () => nextTick(() => window.lucide && window.lucide.createIcons()))
</script>

<template>
  <section class="opp-card">
    <header class="opp-head">
      <h2>
        <i data-lucide="target" class="opp-head-icon"></i>
        Oportunidades
      </h2>
      <div class="opp-meta" v-if="ordenadas.length">
        <span class="opp-total">{{ brl(valorTotal) }}</span>
        <span class="opp-count">{{ ordenadas.length }} {{ ordenadas.length === 1 ? 'produto' : 'produtos' }}</span>
      </div>
    </header>

    <div v-if="ordenadas.length === 0" class="opp-vazio">
      <i data-lucide="package-x" class="opp-vazio-icon"></i>
      <p>Nenhuma oportunidade mapeada.</p>
    </div>

    <ul v-else class="opp-list">
      <li v-for="(op, i) in ordenadas" :key="i" class="opp-item" :class="{ 'is-expanded': expandido.has(i) }">
        <header class="opp-item-head">
          <div class="opp-item-title">
            <strong>{{ op.titulo }}</strong>
            <span class="opp-badge" :class="probClass(op.probabilidade_fechamento)">
              {{ Number(op.probabilidade_fechamento || 0).toFixed(0) }}% aderencia
            </span>
          </div>
        </header>

        <p v-if="op.descricao" class="opp-desc">{{ op.descricao }}</p>

        <div class="opp-meta-linha">
          <span v-if="op.valor_estimado" class="opp-valor">
            {{ brl(op.valor_estimado) }}
          </span>
          <button class="opp-toggle" @click="toggle(i)">
            <i :data-lucide="expandido.has(i) ? 'chevron-up' : 'chevron-down'" class="opp-toggle-icon"></i>
            {{ expandido.has(i) ? 'Ocultar analise' : 'Ver analise' }}
          </button>
        </div>

        <section v-if="expandido.has(i)" class="opp-detalhe">
          <h4>
            <i data-lucide="lightbulb" class="opp-detalhe-icon"></i>
            Por que esse produto
          </h4>
          <p v-if="op.justificativa" class="opp-justificativa">{{ op.justificativa }}</p>
          <p v-else class="opp-justificativa opp-justificativa--vazia">Sem justificativa detalhada pela IA.</p>
        </section>
      </li>
    </ul>

    <footer v-if="ordenadas.length > 0" class="opp-foot">
      <span class="opp-foot-hint">Selecione ate 4 produtos na proxima etapa</span>
      <button class="btn btn-primary" @click="emit('criar-kommo', ordenadas)">
        <i data-lucide="plus" class="btn-icon"></i>
        Criar oportunidade no Kommo
      </button>
    </footer>
  </section>
</template>

<style scoped>
.opp-card {
  background: var(--bg-card, #141414);
  border: 1px solid var(--border-card, rgba(255,255,255,0.06));
  border-radius: 8px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.opp-head {
  display: flex; justify-content: space-between;
  align-items: center; flex-wrap: wrap; gap: 10px;
}
.opp-head h2 {
  font-size: 15px; color: #fff; margin: 0; font-weight: 600;
  display: flex; align-items: center; gap: 8px;
}
.opp-head-icon { width: 16px; height: 16px; color: #888; }
.opp-meta { display: flex; align-items: center; gap: 12px; }
.opp-total { font-size: 16px; color: #fff; font-weight: 700; }
.opp-count { font-size: 11.5px; color: #888; }

.opp-vazio {
  padding: 28px 12px; text-align: center; color: #666;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
}
.opp-vazio-icon { width: 28px; height: 28px; color: #444; }
.opp-vazio p { margin: 0; font-size: 13px; }

.opp-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
.opp-item {
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.04);
  border-radius: 6px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: border-color 150ms, background 150ms;
}
.opp-item:hover { border-color: rgba(255,255,255,0.08); }
.opp-item.is-expanded { border-color: rgba(255,0,0,0.25); background: rgba(255,0,0,0.02); }

.opp-item-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
.opp-item-title {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap; flex: 1;
}
.opp-item-title strong { color: #fff; font-size: 13.5px; line-height: 1.35; }

.opp-badge {
  font-size: 11px; font-weight: 700; padding: 3px 9px;
  border-radius: 10px; text-transform: uppercase; letter-spacing: 0.3px;
  white-space: nowrap;
}
.prob--alta  { background: rgba(34,197,94,0.18);  color: #22c55e; }
.prob--media { background: rgba(245,158,11,0.18); color: #f59e0b; }
.prob--baixa { background: rgba(255,255,255,0.08); color: #aaa;   }

.opp-desc { color: #bbb; font-size: 12.5px; line-height: 1.5; margin: 0; }

.opp-meta-linha {
  display: flex; justify-content: space-between; align-items: center; gap: 8px;
}
.opp-valor { font-size: 13px; color: #fff; font-weight: 600; }

.opp-toggle {
  background: transparent; border: 1px solid #2a2a2a;
  color: #ccc; padding: 4px 10px; border-radius: 4px;
  font-family: inherit; font-size: 11.5px; font-weight: 500;
  cursor: pointer; transition: all 120ms;
  display: inline-flex; align-items: center; gap: 5px;
}
.opp-toggle:hover { background: rgba(255,255,255,0.04); color: #fff; border-color: #333; }
.opp-toggle-icon { width: 11px; height: 11px; }

.opp-detalhe {
  padding: 10px 12px;
  background: rgba(0,0,0,0.25);
  border-radius: 4px;
  border-left: 3px solid #ff0000;
  display: flex; flex-direction: column; gap: 6px;
  animation: opp-slide 150ms ease-out;
}
@keyframes opp-slide {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.opp-detalhe h4 {
  margin: 0; font-size: 11px; color: #ff6666;
  font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px;
  display: flex; align-items: center; gap: 6px;
}
.opp-detalhe-icon { width: 12px; height: 12px; }
.opp-justificativa { color: #ddd; font-size: 12.5px; line-height: 1.55; margin: 0; }
.opp-justificativa--vazia { color: #666; font-style: italic; }

.opp-foot {
  display: flex; justify-content: space-between; align-items: center;
  gap: 10px; flex-wrap: wrap;
  padding-top: 10px;
  border-top: 1px solid rgba(255,255,255,0.04);
}
.opp-foot-hint { font-size: 11.5px; color: #888; font-style: italic; }
.btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px; border-radius: 6px;
  font-family: inherit; font-size: 13px; font-weight: 500;
  cursor: pointer; transition: all 150ms; border: none;
}
.btn-primary { background: #ff0000; color: #fff; }
.btn-primary:hover:not(:disabled) { background: #cc0000; }
.btn-icon { width: 14px; height: 14px; }
</style>
