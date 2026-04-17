<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import TcTimelineFases from './TcTimelineFases.vue'
import TcJobProgress from './TcJobProgress.vue'
import TcKommoOportunidadeModal from './TcKommoOportunidadeModal.vue'
import TcLeadMateriaisEditor from './TcLeadMateriaisEditor.vue'
import TcConsolidadoScorecards from './TcConsolidadoScorecards.vue'
import TcConsolidadoAvanco from './TcConsolidadoAvanco.vue'
import TcConsolidadoQualidadeTime from './TcConsolidadoQualidadeTime.vue'
import TcConsolidadoPontos from './TcConsolidadoPontos.vue'
import TcConsolidadoOportunidades from './TcConsolidadoOportunidades.vue'
import VLoadingState from '../../../components/ui/VLoadingState.vue'
import VEmptyState from '../../../components/ui/VEmptyState.vue'
import { useTorreControle } from '../composables/useTorreControle.js'

const props = defineProps({
  cliente: { type: Object, required: true },
  fases: { type: Array, required: true },
  faseInicial: { type: Number, default: null },
  leadId: { type: String, required: true }
})
const emit = defineEmits(['close'])

const tc = useTorreControle()
const faseAtiva = ref(props.faseInicial || props.fases[0]?.id)
const detalhe = ref(null)
const loadingDetalhe = ref(false)

const analiseAtual = computed(() => detalhe.value?.analises?.[0] || null)
const dadosFaseAtiva = computed(() => props.cliente.fases?.[faseAtiva.value] || null)

function getCF(fieldId) {
  const f = (props.cliente.custom_fields || []).find(x => x.field_id === fieldId)
  return f?.values?.[0]?.value || null
}
const contextoKommo = computed(() => ({
  descricao: getCF(1989878),
  objetivo: getCF(1989880),
  dores: getCF(1989898),
  disc: getCF(1989922),
  stack: getCF(1989904),
  participantes: getCF(1989914),
  tier: getCF(1989461),
  squad: getCF(1989938),
  flag: getCF(1989972)
}))

const jobAtivo = computed(() => {
  for (const j of tc.jobsEmAndamento.value) {
    if (j.progresso?.payload?.projetoFaseId === detalhe.value?.fase?.id) return j
  }
  return null
})

async function carregarDetalhe() {
  if (!faseAtiva.value) return
  loadingDetalhe.value = true
  try {
    detalhe.value = await tc.carregarDetalheFase(props.cliente.id, faseAtiva.value)
  } catch (err) {
    detalhe.value = null
  } finally {
    loadingDetalhe.value = false
  }
}

const PHASES_COM_MATERIAIS = ['kickoff', 'fase-2', 'fase-3', 'fase-4', 'fase-5']

// Flags de contexto
const isFaseProjetoConcluido = computed(() =>
  detalhe.value?.fase?.fase_slug === 'projeto-concluido'
)
const ultimaFalha = computed(() => {
  const f = detalhe.value?.fase
  if (!f?.ultima_falha_msg) return null
  return { msg: f.ultima_falha_msg, em: f.ultima_falha_em }
})

function fmtFalhaDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return ''
  const dia = String(d.getDate()).padStart(2, '0')
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${dia}/${mes} ${h}:${m}`
}

const mostraEditorMateriais = ref(false)

async function analisarFase() {
  if (!detalhe.value?.fase) {
    alert('Detalhe da fase nao carregado — recarregue a pagina')
    return
  }
  const slug = detalhe.value.fase.fase_slug
  const projetoFaseId = detalhe.value.fase.id
  if (!projetoFaseId) {
    alert('projetoFaseId ausente — nao e possivel analisar')
    return
  }
  // Fase "Projeto Concluido" usa relatorio final consolidado (nao tem materiais proprios,
  // agrega analises de todas fases anteriores + contexto Kommo)
  if (slug === 'projeto-concluido') {
    // Confirma antes de gerar nova versao (custo de IA nao e baixo)
    if (analiseAtual.value) {
      const ok = confirm('Gerar NOVA versao da Analise Consolidada? A versao anterior fica preservada no historico.')
      if (!ok) return
    }
    try {
      const job = await tc.analisarFinal(projetoFaseId, props.leadId)
      if (job?.status === 'duplicate') {
        alert('Analise Consolidada ja em andamento. Aguarde concluir.')
      }
    } catch (err) {
      alert('Erro ao disparar Analise Consolidada: ' + (err?.message || err))
    }
    return
  }
  if (!PHASES_COM_MATERIAIS.includes(slug)) {
    const ok = confirm(
      `Fase "${detalhe.value.fase.fase_nome}" nao tem custom fields de material mapeados no Kommo.\n` +
      `A analise rodara sem materiais especificos desta fase.\n\nProsseguir?`
    )
    if (!ok) return
  }
  try {
    const job = await tc.analisar(projetoFaseId, props.leadId, slug)
    if (job?.status === 'duplicate') {
      alert('Ja existe uma analise em andamento para esta fase. Aguarde concluir.')
    }
  } catch (err) {
    alert('Erro ao disparar analise: ' + (err?.message || err))
  }
}

// JSON consolidado (avanco, qualidade_time, pontos_positivos, pontos_negativos)
const consolidado = computed(() => {
  const raw = analiseAtual.value?.consolidado
  if (!raw) return null
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return null }
  }
  return raw
})

const mostraKommoModal = ref(false)
const oportunidadesParaModal = ref([])

function abrirKommoModal(ops) {
  oportunidadesParaModal.value = ops || []
  mostraKommoModal.value = true
  nextTick(() => window.lucide && window.lucide.createIcons())
}

function onLeadCriado(resp) {
  mostraKommoModal.value = false
  const url = resp?.kommo_url || resp?.lead?.id
    ? `https://edisonv4companycom.kommo.com/leads/detail/${resp?.lead?.id || ''}`
    : null
  if (url && confirm(`Lead criado no Kommo!\n\nAbrir no Kommo agora?`)) {
    window.open(url, '_blank', 'noopener')
  }
}

function slugify(s) {
  return String(s || '').toLowerCase().trim().replace(/\s+/g, '-')
}

function formatTipo(s) {
  if (!s) return ''
  return String(s)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

function handleKeydown(e) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => {
  carregarDetalhe()
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})

watch(faseAtiva, carregarDetalhe)
watch(() => jobAtivo.value?.status, (status) => {
  if (status === 'completed') carregarDetalhe()
})
</script>

<template>
  <div class="super-painel" role="dialog" aria-modal="true">
    <header class="sp-header">
      <div class="sp-titulo">
        <h1>{{ cliente.nome }}</h1>
        <div class="sp-meta">
          <span v-if="cliente.segmento">{{ cliente.segmento }}</span>
          <span v-if="cliente.squad">• {{ cliente.squad }}</span>
          <span v-if="dadosFaseAtiva?.score">• Score: {{ dadosFaseAtiva.score }}</span>
        </div>
        <div v-if="contextoKommo.tier || contextoKommo.flag || contextoKommo.squad" class="sp-badges">
          <span v-if="contextoKommo.tier" class="badge badge--tier">{{ contextoKommo.tier }}</span>
          <span
            v-if="contextoKommo.flag"
            class="badge"
            :class="`badge--flag-${contextoKommo.flag.toLowerCase()}`"
          >
            {{ contextoKommo.flag }}
          </span>
          <span v-if="contextoKommo.squad" class="badge badge--squad">Squad: {{ contextoKommo.squad }}</span>
        </div>
      </div>
      <button class="btn close-btn" @click="emit('close')" aria-label="Fechar">&times;</button>
    </header>

    <section
      v-if="contextoKommo.descricao || contextoKommo.objetivo || contextoKommo.dores || contextoKommo.stack || contextoKommo.disc || contextoKommo.participantes"
      class="sp-contexto"
    >
      <div class="ctx-card" v-if="contextoKommo.descricao">
        <h3>Descricao da Empresa</h3>
        <p>{{ contextoKommo.descricao }}</p>
      </div>
      <div class="ctx-card" v-if="contextoKommo.objetivo">
        <h3>Objetivo da Empresa</h3>
        <p>{{ contextoKommo.objetivo }}</p>
      </div>
      <div class="ctx-card ctx-card--dores" v-if="contextoKommo.dores">
        <h3>Dores do Negocio</h3>
        <p>{{ contextoKommo.dores }}</p>
      </div>
      <div class="ctx-card" v-if="contextoKommo.stack">
        <h3>Stack de Ferramentas</h3>
        <p>{{ contextoKommo.stack }}</p>
      </div>
      <div class="ctx-card" v-if="contextoKommo.disc">
        <h3>Perfil DISC</h3>
        <p>{{ contextoKommo.disc }}</p>
      </div>
      <div class="ctx-card" v-if="contextoKommo.participantes">
        <h3>Participantes</h3>
        <p>{{ contextoKommo.participantes }}</p>
      </div>
    </section>

    <TcTimelineFases
      :fases="fases"
      :cliente-fases="cliente.fases || {}"
      :active="faseAtiva"
      :fase-atual-ordem="Number(cliente.fase_atual_ordem || 0)"
      @select="faseAtiva = $event"
    />

    <!-- Banner de erro inline: ultima tentativa de analise falhou -->
    <div v-if="ultimaFalha && !jobAtivo" class="sp-falha-banner">
      <i data-lucide="alert-circle" class="banner-icon"></i>
      <div class="falha-body">
        <strong>Ultima analise falhou</strong>
        <p class="falha-msg">{{ ultimaFalha.msg }}</p>
        <small v-if="ultimaFalha.em">Falha em {{ fmtFalhaDate(ultimaFalha.em) }}</small>
      </div>
      <div class="falha-actions">
        <button class="btn-falha" @click="mostraEditorMateriais = true">
          <i data-lucide="edit-3" class="inline-icon"></i>
          Editar materiais
        </button>
        <button class="btn-falha btn-falha--primary" @click="analisarFase" :disabled="!!jobAtivo">
          <i data-lucide="rotate-cw" class="inline-icon"></i>
          Tentar novamente
        </button>
      </div>
    </div>

    <div v-if="jobAtivo" class="sp-job-wrap">
      <TcJobProgress :job="jobAtivo" />
    </div>

    <div v-if="loadingDetalhe" class="sp-loading">
      <VLoadingState size="lg" />
    </div>

    <div v-else-if="!analiseAtual && !jobAtivo" class="sp-vazio">
      <VEmptyState
        :icon="isFaseProjetoConcluido ? 'file-check' : 'sparkles'"
        :title="isFaseProjetoConcluido ? 'Projeto pronto para validacao' : 'Fase ainda nao analisada'"
        :description="isFaseProjetoConcluido
          ? 'Gere o relatorio consolidado que junta todas as fases auditadas, destaca pontos positivos e negativos, avalia a qualidade do time e mapeia oportunidades de expansao.'
          : 'Dispare uma analise para que a IA avalie os materiais entregues nesta fase. Ela vai ler slides, transcricoes e documentos, gerar score, riscos e oportunidades.'"
      />
      <div class="sp-vazio-actions">
        <button class="btn btn-primary" @click="analisarFase" :disabled="!!jobAtivo">
          <i :data-lucide="isFaseProjetoConcluido ? 'sparkles' : 'play'" class="inline-icon"></i>
          {{ isFaseProjetoConcluido ? 'Gerar Analise Consolidada' : 'Analisar agora' }}
        </button>
      </div>
    </div>

    <div v-else-if="!analiseAtual && jobAtivo" class="sp-vazio sp-vazio--running">
      <!-- Job em andamento, sem analise anterior: TcJobProgress acima ja comunica -->
    </div>

    <div v-else class="sp-body">
      <div v-if="analiseAtual.status_avaliacao === 'incompleta'" class="sp-incomplete-banner">
        <i data-lucide="alert-triangle" class="banner-icon"></i>
        <div>
          <strong>Analise nao realizada — materiais insuficientes</strong>
          <p>O conteudo recebido nao permite uma auditoria justa. Veja em "Recomendacoes" o que precisa ser coletado antes de re-analisar.</p>
        </div>
      </div>
      <div v-else-if="analiseAtual.status_avaliacao === 'parcial'" class="sp-incomplete-banner sp-incomplete-banner--parcial">
        <i data-lucide="info" class="banner-icon"></i>
        <div>
          <strong>Analise parcial</strong>
          <p>A IA pontuou com base no que foi entregue, mas alguns materiais ainda faltam. Score reflete apenas o que foi avaliado.</p>
        </div>
      </div>

      <!-- ==== BLOCOS DA ANALISE CONSOLIDADA (fase Projeto Concluido) ==== -->
      <div v-if="isFaseProjetoConcluido && consolidado" class="sp-consolidado">
        <TcConsolidadoScorecards
          :consolidado="consolidado"
          :oportunidades="analiseAtual.oportunidades || []"
        />
        <TcConsolidadoAvanco v-if="consolidado.avanco" :avanco="consolidado.avanco" />
        <TcConsolidadoPontos
          v-if="(consolidado.pontos_positivos?.length || consolidado.pontos_negativos?.length)"
          :pontos-positivos="consolidado.pontos_positivos"
          :pontos-negativos="consolidado.pontos_negativos"
        />
        <TcConsolidadoQualidadeTime v-if="consolidado.qualidade_time" :qualidade-time="consolidado.qualidade_time" />
      </div>

      <section class="sp-coluna sp-coluna--relatorio">
        <div class="sp-card">
          <div class="sp-card-header">
            <h2>Resumo Executivo</h2>
            <span class="sp-veredicto">{{ analiseAtual.veredicto }}</span>
          </div>
          <p>{{ analiseAtual.resumo }}</p>
        </div>

        <div class="sp-card">
          <h2>Analise dos Materiais</h2>
          <p>{{ analiseAtual.analise_materiais }}</p>
        </div>

        <div class="sp-card" v-if="analiseAtual.percepcao_cliente">
          <h2>Percepcao do Cliente</h2>
          <div class="sp-percepcao">
            <div v-for="(valor, chave) in analiseAtual.percepcao_cliente" :key="chave">
              <span class="label">{{ chave }}</span>
              <strong>{{ valor }}/10</strong>
            </div>
          </div>
        </div>

        <div class="sp-card" v-if="analiseAtual.dores?.length">
          <h2>Dores / Insatisfacoes</h2>
          <ul>
            <li v-for="(d, i) in analiseAtual.dores" :key="i">
              <span class="gravidade" :class="`gravidade--${d.gravidade}`">{{ d.gravidade }}</span>
              {{ d.descricao }}
            </li>
          </ul>
        </div>
      </section>

      <section class="sp-coluna sp-coluna--acoes">
        <!-- Novo card de Oportunidades (probabilidade + justificativa expansivel) -->
        <TcConsolidadoOportunidades
          v-if="analiseAtual.oportunidades?.length"
          :oportunidades="analiseAtual.oportunidades"
          @criar-kommo="abrirKommoModal"
        />

        <div class="sp-card" v-if="analiseAtual.riscos?.length">
          <h2>Riscos</h2>
          <ul>
            <li v-for="(r, i) in analiseAtual.riscos" :key="i">
              <strong>{{ formatTipo(r.tipo) }}</strong> — {{ r.descricao }}
              <small>(prob: {{ r.probabilidade }} / impacto: {{ r.impacto }})</small>
            </li>
          </ul>
        </div>

        <div class="sp-card" v-if="analiseAtual.recomendacoes?.length">
          <h2>Recomendacoes</h2>
          <ol>
            <li v-for="(rec, i) in analiseAtual.recomendacoes" :key="i">
              <span class="prioridade" :class="`prioridade--${rec.prioridade}`">{{ rec.prioridade }}</span>
              {{ rec.descricao }}
            </li>
          </ol>
        </div>
      </section>
    </div>

    <footer class="sp-footer">
      <span class="sp-versao">Versao {{ analiseAtual?.versao || '-' }}</span>
      <div class="sp-actions">
        <button
          class="btn"
          @click="mostraEditorMateriais = true"
          :disabled="!!jobAtivo"
          title="Editar links dos materiais no Kommo"
        >
          <i data-lucide="edit-3" class="inline-icon"></i>
          Editar materiais
        </button>
        <button
          v-if="analiseAtual"
          class="btn"
          :class="{ 'btn-primary': isFaseProjetoConcluido }"
          @click="analisarFase"
          :disabled="!!jobAtivo"
        >
          <i :data-lucide="isFaseProjetoConcluido ? 'sparkles' : 'rotate-cw'" class="inline-icon"></i>
          {{ isFaseProjetoConcluido ? 'Regenerar Analise Consolidada' : 'Re-analisar fase atual' }}
        </button>
      </div>
    </footer>

    <!-- Modal Kommo multi-produto (substitui o TcKommoLeadForm antigo) -->
    <TcKommoOportunidadeModal
      v-if="mostraKommoModal"
      :cliente="cliente"
      :oportunidades="oportunidadesParaModal"
      :analise-id="analiseAtual?.id || null"
      :lead-id="leadId"
      @close="mostraKommoModal = false"
      @created="onLeadCriado"
    />

    <!-- Editor de materiais do lead (abre a partir do rodape ou banner de erro) -->
    <TcLeadMateriaisEditor
      v-if="mostraEditorMateriais"
      :cliente="cliente"
      :lead-id="leadId"
      @close="mostraEditorMateriais = false"
    />
  </div>
</template>

<style scoped>
.super-painel {
  position: fixed; inset: 0;
  background: var(--bg-body);
  display: flex; flex-direction: column;
  z-index: 9000;
  overflow-y: auto;
}
.sp-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--border-card);
}
.sp-titulo h1 {
  font-size: var(--font-size-xl);
  color: var(--text-high);
  margin: 0;
  font-weight: var(--font-weight-semibold);
}
.sp-meta { font-size: var(--font-size-sm); color: var(--text-low); margin-top: var(--spacing-xs); }
.sp-meta > span + span { margin-left: var(--spacing-xs); }

.sp-badges { display: flex; gap: var(--spacing-xs); margin-top: var(--spacing-xs); flex-wrap: wrap; }
.badge {
  padding: 2px var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.badge--tier { background: var(--bg-inner); color: var(--text-high); }
.badge--squad { background: var(--bg-inner); color: var(--text-low); }
.badge--flag-safe { background: var(--color-safe); color: #fff; }
.badge--flag-care { background: var(--color-care); color: #000; }
.badge--flag-risk, .badge--flag-danger { background: var(--color-danger); color: #fff; }

.sp-contexto {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: var(--spacing-md); padding: 0 var(--spacing-lg) var(--spacing-md);
}
.ctx-card {
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
}
.ctx-card h3 {
  font-size: var(--font-size-sm);
  color: var(--text-low);
  margin: 0 0 var(--spacing-sm);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: var(--font-weight-semibold);
}
.ctx-card p {
  color: var(--text-medium);
  margin: 0;
  font-size: var(--font-size-base);
  line-height: 1.5;
  white-space: pre-wrap;
}
.ctx-card--dores { border-left: 3px solid var(--color-danger); }

.sp-loading, .sp-vazio {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-2xl) var(--spacing-lg);
}
.sp-vazio--running { display: none; }

.sp-job-wrap {
  padding: 0 var(--spacing-lg);
  margin-bottom: var(--spacing-md);
}

.sp-vazio-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  flex-wrap: wrap;
  justify-content: center;
}
.sp-vazio-hint {
  color: var(--text-muted);
  font-size: var(--font-size-sm);
}
.btn-primary {
  background: var(--color-primary);
  color: #fff;
  border: none;
  padding: 10px 20px;
  font-weight: var(--font-weight-semibold);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: var(--font-size-base);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.15s;
}
.btn-primary:hover:not(:disabled) { background: #cc0000; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.sp-body {
  display: grid; grid-template-columns: 1.2fr 1fr;
  gap: var(--spacing-lg); padding: var(--spacing-lg);
  flex: 1;
}
.sp-coluna { display: flex; flex-direction: column; gap: var(--spacing-md); }

/* Banner para analise incompleta/parcial — span as 2 colunas no grid */
.sp-incomplete-banner {
  grid-column: 1 / -1;
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-lg);
  background: linear-gradient(90deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02));
  border: 1px solid rgba(245,158,11,0.3);
  border-left: 3px solid var(--color-care);
  border-radius: var(--radius-md);
}
.sp-incomplete-banner .banner-icon {
  width: 24px; height: 24px;
  color: var(--color-care);
  flex-shrink: 0;
  margin-top: 2px;
}
.sp-incomplete-banner strong {
  color: var(--text-high);
  font-size: var(--font-size-md);
  display: block;
  margin-bottom: 4px;
}
.sp-incomplete-banner p {
  color: var(--text-medium);
  font-size: var(--font-size-sm);
  margin: 0;
}
.sp-incomplete-banner--parcial {
  background: linear-gradient(90deg, rgba(59,130,246,0.08), rgba(59,130,246,0.02));
  border-color: rgba(59,130,246,0.3);
  border-left-color: #3b82f6;
}
.sp-incomplete-banner--parcial .banner-icon { color: #3b82f6; }
.sp-card {
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
}
.sp-card h2 {
  font-size: var(--font-size-lg);
  color: var(--text-high);
  margin: 0 0 var(--spacing-md);
  font-weight: var(--font-weight-semibold);
}
.sp-card-header { display: flex; justify-content: space-between; align-items: center; gap: var(--spacing-md); }
.sp-veredicto {
  padding: 2px var(--spacing-sm);
  background: var(--bg-inner);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  color: var(--text-high);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  font-weight: var(--font-weight-semibold);
}

/* Listas dentro dos cards — sem bullets nativos, items espacados */
.sp-card ul,
.sp-card ol {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}
.sp-card ul li,
.sp-card ol li {
  color: var(--text-medium);
  font-size: var(--font-size-base);
  line-height: 1.5;
  padding-left: 0;
}
.sp-card ol {
  counter-reset: item;
}
.sp-card ol li {
  counter-increment: item;
  padding-left: 28px;
  position: relative;
}
.sp-card ol li::before {
  content: counter(item);
  position: absolute;
  left: 0;
  top: 0;
  width: 20px; height: 20px;
  background: var(--bg-inner);
  color: var(--text-low);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}
.sp-card small {
  display: block;
  color: var(--text-lowest);
  font-size: var(--font-size-xs);
  margin-top: 2px;
}

.sp-percepcao { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--spacing-md); }
.sp-percepcao .label { display: block; color: var(--text-low); font-size: var(--font-size-sm); }
.sp-percepcao strong { color: var(--text-high); font-size: var(--font-size-lg); }

.gravidade, .prioridade {
  display: inline-block;
  padding: 2px 6px; border-radius: var(--radius-sm);
  font-size: var(--font-size-xs); margin-right: var(--spacing-xs);
  text-transform: uppercase; font-weight: 700;
}
.gravidade--critica, .prioridade--critica,
.gravidade--alta, .prioridade--alta { background: var(--color-danger); color: #fff; }
.gravidade--media, .prioridade--media { background: var(--color-care); color: #000; }
.gravidade--baixa, .prioridade--baixa { background: var(--color-safe); color: #fff; }

.sp-oportunidades { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--spacing-md); }
.sp-oportunidades .linha { display: flex; justify-content: space-between; align-items: center; margin-top: var(--spacing-sm); }

.sp-footer {
  display: flex; justify-content: space-between; align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-lg);
  border-top: 1px solid var(--border-card);
  flex-wrap: wrap;
}
.sp-versao { color: var(--text-muted); font-size: var(--font-size-sm); }
.sp-actions { display: flex; gap: var(--spacing-sm); flex-wrap: wrap; }

.inline-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.close-btn {
  width: 36px;
  height: 36px;
  padding: 0;
  font-size: 20px;
  line-height: 1;
  flex-shrink: 0;
}

.sp-modal {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.6); z-index: 9100;
  display: flex; align-items: center; justify-content: center;
}
.sp-modal-body {
  background: var(--bg-card); border-radius: var(--radius-md);
  padding: var(--spacing-lg); min-width: 440px; max-width: 600px;
}

@media (max-width: 1024px) {
  .sp-body { grid-template-columns: 1fr; }
}

/* ===== Banner de erro inline (ultima_falha) ===== */
.sp-falha-banner {
  margin: 0 var(--spacing-lg);
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--spacing-md);
  padding: 12px 16px;
  background: linear-gradient(90deg, rgba(239,68,68,0.12), rgba(239,68,68,0.02));
  border: 1px solid rgba(239,68,68,0.3);
  border-left: 3px solid var(--color-danger, #ef4444);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-md);
}
.sp-falha-banner .banner-icon {
  width: 22px; height: 22px;
  color: var(--color-danger, #ef4444);
  flex-shrink: 0;
}
.sp-falha-banner .falha-body strong {
  color: var(--text-high, #fff);
  font-size: 13.5px;
  display: block;
  margin-bottom: 2px;
}
.sp-falha-banner .falha-msg {
  color: #ffaaaa;
  font-size: 12.5px;
  margin: 0 0 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  word-break: break-word;
}
.sp-falha-banner small {
  color: #888;
  font-size: 11px;
}
.sp-falha-banner .falha-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
.sp-falha-banner .btn-falha {
  display: inline-flex; align-items: center; gap: 5px;
  background: transparent;
  border: 1px solid #2a2a2a;
  color: #ccc;
  padding: 6px 12px;
  border-radius: 4px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 120ms;
}
.sp-falha-banner .btn-falha:hover:not(:disabled) {
  background: rgba(255,255,255,0.04);
  color: #fff;
  border-color: #333;
}
.sp-falha-banner .btn-falha--primary {
  background: var(--color-danger, #ef4444);
  border-color: var(--color-danger, #ef4444);
  color: #fff;
}
.sp-falha-banner .btn-falha--primary:hover:not(:disabled) {
  background: #dc2626;
  border-color: #dc2626;
}

/* ===== Blocos da Analise Consolidada (projeto-concluido) ===== */
.sp-consolidado {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}
</style>
