<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import TcTimelineFases from './TcTimelineFases.vue'
import TcJobProgress from './TcJobProgress.vue'
import TcKommoLeadForm from './TcKommoLeadForm.vue'
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
const mostraFormLead = ref(false)
const oportunidadeSelecionada = ref(null)

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

// Ordem -> slug (para analisar em lote todas as fases passadas)
const FASES_ORDEM_SLUG = [
  { ordem: 1, slug: 'kickoff',  nome: 'Fase 1' },
  { ordem: 2, slug: 'fase-2',   nome: 'Fase 2' },
  { ordem: 3, slug: 'fase-3',   nome: 'Fase 3' },
  { ordem: 4, slug: 'fase-4',   nome: 'Fase 4' },
  { ordem: 5, slug: 'fase-5',   nome: 'Fase 5' }
]

// Fases auditaveis = todas com ordem < fase_atual_ordem do lead
const fasesAuditaveis = computed(() => {
  const atual = Number(props.cliente?.fase_atual_ordem || 0)
  return FASES_ORDEM_SLUG.filter(f => f.ordem < atual)
})

const analisandoTudo = ref(false)

async function analisarTodasFases() {
  const alvo = fasesAuditaveis.value
  if (alvo.length === 0) {
    alert('Nenhuma fase auditavel — o lead ainda esta na Fase 1 ou antes.')
    return
  }
  const ok = confirm(
    `Isso vai disparar ${alvo.length} analise(s) IA em paralelo para este cliente:\n\n` +
    alvo.map(f => `• ${f.nome}`).join('\n') +
    `\n\nProsseguir?`
  )
  if (!ok) return
  analisandoTudo.value = true
  try {
    // Para cada fase, precisa primeiro resolver projetoFaseId (chama GET /cliente/:id/fase/:faseId)
    for (const f of alvo) {
      try {
        const stageId = STAGE_BY_ORDEM[f.ordem]
        const det = await tc.carregarDetalheFase(props.cliente.id, stageId)
        const pfId = det?.fase?.id
        if (pfId) {
          await tc.analisar(pfId, props.leadId, f.slug)
        }
      } catch (err) {
        console.error('[analisarTodasFases] fase', f.slug, err)
      }
    }
  } finally {
    analisandoTudo.value = false
  }
}

const STAGE_BY_ORDEM = { 1: 99670920, 2: 99670924, 3: 99671028, 4: 99671032, 5: 99671036 }

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
    try {
      const job = await tc.analisarFinal(projetoFaseId, props.leadId)
      if (job?.status === 'duplicate') {
        alert('Relatorio final ja em andamento. Aguarde concluir.')
      }
    } catch (err) {
      alert('Erro ao disparar relatorio final: ' + (err?.message || err))
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

async function criarLead(payload) {
  try {
    await tc.criarLeadKommo(payload)
    mostraFormLead.value = false
  } catch (err) {
    alert('Erro ao criar lead: ' + err.message)
  }
}

function abrirFormLead(op) {
  oportunidadeSelecionada.value = op
  mostraFormLead.value = true
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
      @select="faseAtiva = $event"
    />

    <div v-if="jobAtivo" class="sp-job-wrap">
      <TcJobProgress :job="jobAtivo" />
    </div>

    <div v-if="loadingDetalhe" class="sp-loading">
      <VLoadingState size="lg" />
    </div>

    <div v-else-if="!analiseAtual && !jobAtivo" class="sp-vazio">
      <VEmptyState
        icon="sparkles"
        title="Fase ainda nao analisada"
        description="Dispare uma analise para que a IA avalie os materiais entregues nesta fase. Ela vai ler slides, transcricoes e documentos, gerar score, riscos e oportunidades."
      />
      <div class="sp-vazio-actions">
        <button class="btn btn-primary" @click="analisarFase" :disabled="!!jobAtivo">
          <i data-lucide="play" class="inline-icon"></i>
          Analisar agora
        </button>
        <span v-if="fasesAuditaveis.length > 1" class="sp-vazio-hint">
          ou use "Analisar todas as {{ fasesAuditaveis.length }} fases" no rodape
        </span>
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
        <div class="sp-card" v-if="analiseAtual.oportunidades?.length">
          <h2>Oportunidades</h2>
          <ul class="sp-oportunidades">
            <li v-for="(op, i) in analiseAtual.oportunidades" :key="i">
              <strong>{{ op.titulo }}</strong>
              <p>{{ op.descricao }}</p>
              <div class="linha">
                <span v-if="op.valor_estimado">R$ {{ op.valor_estimado.toLocaleString('pt-BR') }}</span>
                <button class="btn btn-sm" @click="abrirFormLead(op)">+ Kommo</button>
              </div>
            </li>
          </ul>
        </div>

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
          v-if="fasesAuditaveis.length > 0"
          class="btn"
          @click="analisarTodasFases"
          :disabled="!!jobAtivo || analisandoTudo"
        >
          <i data-lucide="layers" class="inline-icon"></i>
          {{ analisandoTudo ? 'Disparando...' : `Analisar todas as ${fasesAuditaveis.length} fases` }}
        </button>
        <button class="btn" @click="analisarFase" :disabled="!!jobAtivo">
          Re-analisar fase atual
        </button>
      </div>
    </footer>

    <div v-if="mostraFormLead" class="sp-modal" @click.self="mostraFormLead = false">
      <div class="sp-modal-body">
        <h2>Novo lead no Kommo</h2>
        <TcKommoLeadForm
          :oportunidade="oportunidadeSelecionada"
          @submit="criarLead"
          @cancel="mostraFormLead = false"
        />
      </div>
    </div>
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
</style>
