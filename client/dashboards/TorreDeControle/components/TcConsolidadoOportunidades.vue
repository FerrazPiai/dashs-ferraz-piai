<script setup>
import { computed, ref, onMounted, nextTick, watch } from 'vue'

const props = defineProps({
  oportunidades: { type: Array, default: () => [] }
})
const emit = defineEmits(['criar-kommo'])

// Filtra 0% aderencia (IA achou que nao casa), ordena por probabilidade, cap em 5 (prompt pede max 5).
const ordenadas = computed(() => {
  return [...props.oportunidades]
    .filter(o => Number(o.probabilidade_fechamento || 0) > 0)
    .sort((a, b) =>
      Number(b.probabilidade_fechamento || 0) - Number(a.probabilidade_fechamento || 0)
    )
    .slice(0, 5)
})

const URGENCIA_ORDEM = { alta: 3, media: 2, baixa: 1 }

// Breakdown: quantas oportunidades por nivel de urgencia (substitui "urgencia dominante")
const urgenciaBreakdown = computed(() => {
  const acc = { alta: 0, media: 0, baixa: 0 }
  for (const o of ordenadas.value) {
    const u = String(o.urgencia || '').toLowerCase()
    if (acc[u] != null) acc[u] += 1
  }
  return acc
})

// Modo colapsado por padrao — usuario clica pra ver lista completa
const listaAberta = ref(false)
function toggleLista() {
  listaAberta.value = !listaAberta.value
  nextTick(() => window.lucide && window.lucide.createIcons())
}

// Usa chave estavel (titulo do produto) em vez de indice — evita vazamento de
// estado "expandido" quando a lista e reordenada.
const expandido = ref(new Set())
function keyDe(op, fallback) {
  return op?.titulo ? `t:${op.titulo}` : `i:${fallback}`
}
function toggle(op, i) {
  const k = keyDe(op, i)
  const s = new Set(expandido.value)
  if (s.has(k)) s.delete(k)
  else s.add(k)
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

function urgenciaLabel(u) {
  return { alta: 'Urgencia alta', media: 'Urgencia media', baixa: 'Urgencia baixa' }[u] || ''
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
        <span class="opp-total">{{ ordenadas.length }} {{ ordenadas.length === 1 ? 'produto sugerido' : 'produtos sugeridos' }}</span>
      </div>
    </header>

    <div v-if="ordenadas.length === 0" class="opp-vazio">
      <i data-lucide="package-x" class="opp-vazio-icon"></i>
      <p>Nenhuma oportunidade com aderencia suficiente.</p>
    </div>

    <template v-else>
      <!-- Resumo sempre visivel: qtd de produtos + breakdown por urgencia -->
      <div class="opp-resumo">
        <div class="opp-resumo-item">
          <span class="opp-resumo-label">Produtos sugeridos</span>
          <strong class="opp-resumo-valor">{{ ordenadas.length }}</strong>
        </div>
        <div class="opp-urg-breakdown" v-if="ordenadas.length">
          <span class="opp-urg-chip urg--alta" :class="{ 'is-zero': urgenciaBreakdown.alta === 0 }">
            <strong>{{ urgenciaBreakdown.alta }}</strong> alta
          </span>
          <span class="opp-urg-chip urg--media" :class="{ 'is-zero': urgenciaBreakdown.media === 0 }">
            <strong>{{ urgenciaBreakdown.media }}</strong> média
          </span>
          <span class="opp-urg-chip urg--baixa" :class="{ 'is-zero': urgenciaBreakdown.baixa === 0 }">
            <strong>{{ urgenciaBreakdown.baixa }}</strong> baixa
          </span>
        </div>
        <button class="opp-expand-toggle" @click="toggleLista">
          <i :data-lucide="listaAberta ? 'chevron-up' : 'chevron-down'" class="opp-toggle-icon"></i>
          {{ listaAberta ? 'Recolher lista' : 'Ver produtos' }}
        </button>
      </div>

      <ul v-if="listaAberta" class="opp-list">
        <li v-for="(op, i) in ordenadas" :key="keyDe(op, i)" class="opp-item" :class="{ 'is-expanded': expandido.has(keyDe(op, i)) }">
          <header class="opp-item-head">
            <div class="opp-item-title">
              <strong>{{ op.titulo }}</strong>
              <span class="opp-badge" :class="probClass(op.probabilidade_fechamento)">
                {{ Number(op.probabilidade_fechamento || 0).toFixed(0) }}% aderencia
              </span>
              <span
                v-if="op.urgencia && URGENCIA_ORDEM[String(op.urgencia).toLowerCase()]"
                class="opp-badge opp-badge--urg"
                :class="`urg--${String(op.urgencia).toLowerCase()}`"
              >
                {{ urgenciaLabel(String(op.urgencia).toLowerCase()) }}
              </span>
            </div>
          </header>

          <p v-if="op.descricao" class="opp-desc">{{ op.descricao }}</p>

          <div class="opp-meta-linha">
            <button class="opp-toggle" @click="toggle(op, i)">
              <i :data-lucide="expandido.has(keyDe(op, i)) ? 'chevron-up' : 'chevron-down'" class="opp-toggle-icon"></i>
              {{ expandido.has(keyDe(op, i)) ? 'Ocultar analise' : 'Ver analise' }}
            </button>
          </div>

          <section v-if="expandido.has(keyDe(op, i))" class="opp-detalhe">
            <h4>
              <i data-lucide="lightbulb" class="opp-detalhe-icon"></i>
              Por que esse produto
            </h4>
            <p v-if="op.justificativa" class="opp-justificativa">{{ op.justificativa }}</p>
            <p v-else class="opp-justificativa opp-justificativa--vazia">Sem justificativa detalhada pela IA.</p>
          </section>
        </li>
      </ul>
    </template>

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
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-md);
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
  font-size: 15px; color: var(--text-high); margin: 0; font-weight: var(--font-weight-semibold);
  display: flex; align-items: center; gap: 8px;
}
.opp-head-icon { width: 16px; height: 16px; color: var(--text-muted); }
.opp-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 0; }
.opp-total-label {
  font-size: var(--font-size-xs); color: var(--text-muted);
  text-transform: uppercase; letter-spacing: 0.4px;
}
.opp-total { font-size: 16px; color: var(--text-high); font-weight: var(--font-weight-bold); }
.opp-count { font-size: var(--font-size-sm); color: var(--text-muted); }

/* Resumo compacto visivel sem expandir */
.opp-resumo {
  display: flex; align-items: center; gap: 18px;
  padding: 10px 14px;
  background: var(--bg-inner);
  border: 1px solid var(--border-row);
  border-radius: var(--radius-sm);
  flex-wrap: wrap;
}
.opp-resumo-item { display: flex; flex-direction: column; gap: 2px; }
.opp-resumo-label {
  font-size: var(--font-size-xs); color: var(--text-muted);
  text-transform: uppercase; letter-spacing: 0.4px;
}
.opp-resumo-valor { font-size: var(--font-size-md); color: var(--text-high); font-weight: var(--font-weight-semibold); }
.opp-resumo-valor.urg--alta   { color: var(--color-danger); }
.opp-resumo-valor.urg--media  { color: var(--color-care); }
.opp-resumo-valor.urg--baixa  { color: var(--text-low); }

.opp-expand-toggle {
  margin-left: auto;
  background: transparent; border: 1px solid var(--border-card);
  color: var(--text-medium); padding: 6px 12px; border-radius: var(--radius-sm);
  font-family: inherit; font-size: var(--font-size-sm); font-weight: var(--font-weight-medium);
  cursor: pointer; transition: all var(--transition-fast);
  display: inline-flex; align-items: center; gap: 6px;
}
.opp-expand-toggle:hover { background: var(--bg-hover); color: var(--text-high); border-color: var(--border-input); }

.opp-badge--urg.urg--alta   { background: rgba(var(--color-danger-rgb), 0.18); color: var(--color-danger); }
.opp-badge--urg.urg--media  { background: rgba(var(--color-care-rgb), 0.18); color: var(--color-care); }
.opp-badge--urg.urg--baixa  { background: var(--bg-hover); color: var(--text-low); }

.opp-urg-breakdown {
  display: inline-flex; gap: 6px; align-items: center;
}
.opp-urg-chip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 9px; border-radius: 999px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  border: 1px solid transparent;
  transition: opacity var(--transition-fast);
}
.opp-urg-chip strong { font-weight: var(--font-weight-bold); font-variant-numeric: tabular-nums; }
.opp-urg-chip.is-zero { opacity: 0.4; }
.opp-urg-chip.urg--alta  { background: rgba(var(--color-danger-rgb), 0.15); color: var(--color-danger); border-color: rgba(var(--color-danger-rgb), 0.3); }
.opp-urg-chip.urg--media { background: rgba(var(--color-care-rgb), 0.15); color: var(--color-care); border-color: rgba(var(--color-care-rgb), 0.3); }
.opp-urg-chip.urg--baixa { background: var(--bg-inner); color: var(--text-low); border-color: var(--border-row); }

.opp-valor { display: inline-flex; align-items: baseline; gap: 6px; }
.opp-valor-label {
  font-size: var(--font-size-xs); color: var(--text-muted);
  text-transform: uppercase; letter-spacing: 0.4px;
}
.opp-valor-num { font-size: var(--font-size-md); color: var(--text-high); font-weight: var(--font-weight-semibold); }

.opp-vazio {
  padding: 28px 12px; text-align: center; color: var(--text-lowest);
  display: flex; flex-direction: column; align-items: center; gap: 8px;
}
.opp-vazio-icon { width: 28px; height: 28px; color: var(--border-card); }
.opp-vazio p { margin: 0; font-size: var(--font-size-md); }

.opp-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
.opp-item {
  background: var(--bg-inner);
  border: 1px solid var(--border-row);
  border-radius: var(--radius-md);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: border-color var(--transition-fast), background var(--transition-fast);
}
.opp-item:hover { border-color: var(--border-card); }
.opp-item.is-expanded { border-color: rgba(var(--color-primary-rgb), 0.25); background: rgba(var(--color-primary-rgb), 0.02); }

.opp-item-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
.opp-item-title {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap; flex: 1;
}
.opp-item-title strong { color: var(--text-high); font-size: var(--font-size-md); line-height: 1.35; }

.opp-badge {
  font-size: var(--font-size-sm); font-weight: var(--font-weight-bold); padding: 3px 9px;
  border-radius: 10px; text-transform: uppercase; letter-spacing: 0.3px;
  white-space: nowrap;
}
.prob--alta  { background: rgba(var(--color-safe-rgb), 0.18);  color: var(--color-safe); }
.prob--media { background: rgba(var(--color-care-rgb), 0.18);  color: var(--color-care); }
.prob--baixa { background: var(--bg-hover); color: var(--text-low); }

.opp-desc { color: var(--text-medium); font-size: var(--font-size-base); line-height: 1.5; margin: 0; }

.opp-meta-linha {
  display: flex; justify-content: space-between; align-items: center; gap: 8px;
}
.opp-valor { font-size: var(--font-size-md); color: var(--text-high); font-weight: var(--font-weight-semibold); }

.opp-toggle {
  background: transparent; border: 1px solid var(--border-card);
  color: var(--text-medium); padding: 4px 10px; border-radius: var(--radius-sm);
  font-family: inherit; font-size: var(--font-size-sm); font-weight: var(--font-weight-medium);
  cursor: pointer; transition: all var(--transition-fast);
  display: inline-flex; align-items: center; gap: 5px;
}
.opp-toggle:hover { background: var(--bg-hover); color: var(--text-high); border-color: var(--border-input); }
.opp-toggle-icon { width: 11px; height: 11px; }

.opp-detalhe {
  padding: 10px 12px;
  background: var(--bg-body);
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--color-primary);
  display: flex; flex-direction: column; gap: 6px;
  animation: opp-slide var(--transition-fast) ease-out;
}
@keyframes opp-slide {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.opp-detalhe h4 {
  margin: 0; font-size: var(--font-size-sm); color: var(--color-primary);
  font-weight: var(--font-weight-bold); text-transform: uppercase; letter-spacing: 0.4px;
  display: flex; align-items: center; gap: 6px;
}
.opp-detalhe-icon { width: 12px; height: 12px; }
.opp-justificativa { color: var(--text-medium); font-size: var(--font-size-base); line-height: 1.55; margin: 0; }
.opp-justificativa--vazia { color: var(--text-lowest); font-style: italic; }

.opp-foot {
  display: flex; justify-content: space-between; align-items: center;
  gap: 10px; flex-wrap: wrap;
  padding-top: 10px;
  border-top: 1px solid var(--border-row);
}
.opp-foot-hint { font-size: var(--font-size-sm); color: var(--text-muted); font-style: italic; }
.btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px; border-radius: var(--radius-md);
  font-family: inherit; font-size: var(--font-size-md); font-weight: var(--font-weight-medium);
  cursor: pointer; transition: all var(--transition-fast); border: none;
}
.btn-primary { background: var(--color-primary); color: var(--text-high); }
.btn-primary:hover:not(:disabled) { background: var(--color-primary-dark); }
.btn-icon { width: 14px; height: 14px; }
</style>
