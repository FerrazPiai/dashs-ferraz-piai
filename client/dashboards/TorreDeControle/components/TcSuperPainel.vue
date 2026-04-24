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
import TcChecklistAuditoria from './TcChecklistAuditoria.vue'
import TcRevisaoPortugues from './TcRevisaoPortugues.vue'
import TcResumoEstruturado from './TcResumoEstruturado.vue'
import TcAnaliseMateriaisEstruturada from './TcAnaliseMateriaisEstruturada.vue'
import TcPercepcaoCliente from './TcPercepcaoCliente.vue'
import TcAvaliacaoEquipe from './TcAvaliacaoEquipe.vue'
import TcFontesExtraidasBotao from './TcFontesExtraidasBotao.vue'
import VLoadingState from '../../../components/ui/VLoadingState.vue'
import VEmptyState from '../../../components/ui/VEmptyState.vue'
import VSharingRequiredBanner from '../../../components/ui/VSharingRequiredBanner.vue'
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

// Analise marcada incompleta porque conta V4 nao tem acesso ao arquivo Google
// (webhook n8n retornou 403). Frontend mostra banner com emails a compartilhar.
const analiseSharingRequired = computed(() => {
  const a = analiseAtual.value
  if (!a) return false
  return a.status_avaliacao === 'incompleta' && a.erro_code === 'sharing_required'
})
// Banner so aparece quando ha analise com status incompleto/parcial (ou sharing required)
const mostraBanner = computed(() => {
  const a = analiseAtual.value
  if (!a) return false
  if (loadingDetalhe.value) return false
  const st = a.status_avaliacao
  return st === 'incompleta' || st === 'parcial' || analiseSharingRequired.value
})
const sharingContext = computed(() => {
  const ctx = analiseAtual.value?.contexto_rag
  const parsed = typeof ctx === 'string' ? (() => { try { return JSON.parse(ctx) } catch { return null } })() : ctx
  return {
    accounts: parsed?.accounts || [],
    platform: parsed?.platform || '',
    url: parsed?.url || ''
  }
})

function onAnaliseRetried() {
  // Recarrega o detalhe para pegar a analise nova do job de retentar
  carregarDetalhe()
}

// Rotulos humanos para nomes tecnicos de plataforma vindos do pipeline n8n
const PLATAFORMA_LABELS = {
  slides: 'Slides da apresentacao',
  reuniao: 'Gravacao da reuniao',
  transcricao: 'Transcricao da reuniao',
  figma: 'Prototipo no Figma',
  miro: 'Board no Miro'
}
function labelPlataforma(p) { return PLATAFORMA_LABELS[p] || p }

// Traduz motivos tecnicos em linguagem do negocio — sem HTTP codes ou nomes de ferramentas
function humanizeMotivo(motivo) {
  if (!motivo) return 'Arquivo nao acessivel ou nao preenchido'
  const m = String(motivo).toLowerCase()
  if (m.includes('403') || m.includes('forbidden') || m.includes('permission')) return 'Sem permissao de acesso ao arquivo'
  if (m.includes('404') || m.includes('not found')) return 'Arquivo nao encontrado no link informado'
  if (m.includes('timeout') || m.includes('timed out')) return 'Tempo esgotado ao ler o arquivo'
  if (m.includes('500') || m.includes('502') || m.includes('503') || m.includes('504')) return 'Arquivo nao acessivel ou nao preenchido'
  if (m.includes('empty') || m.includes('vazio')) return 'Arquivo vazio'
  if (m.includes('unsupported') || m.includes('invalid')) return 'Formato de arquivo nao suportado'
  return 'Arquivo nao acessivel ou nao preenchido'
}

// Banner de materiais retratil — colapsado por padrao pra nao gerar "espaco vazio imenso"
const bannerAberto = ref(false)
function toggleBanner() {
  bannerAberto.value = !bannerAberto.value
  nextTick(() => window.lucide && window.lucide.createIcons())
}

// Cards retrateis — padrao comeca TUDO fechado, usuario abre o que quer ver
const cardsAbertos = ref(new Set())
function toggleCard(key) {
  const s = new Set(cardsAbertos.value)
  if (s.has(key)) s.delete(key)
  else s.add(key)
  cardsAbertos.value = s
  nextTick(() => window.lucide && window.lucide.createIcons())
}
function isCardAberto(key) { return cardsAbertos.value.has(key) }

// Mini renderer de markdown seguro para textos retornados pela IA (resumo, analise_materiais, etc).
// Escape HTML primeiro, depois aplica replacements controlados — sem dependencia externa.
function renderIaText(raw) {
  if (raw == null) return ''
  let s = String(raw)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  // Separador horizontal: --- em linha propria
  s = s.replace(/^\s*---\s*$/gm, '<hr class="ia-hr">')
  // Titulos: ## / ###
  s = s.replace(/^###\s+(.+)$/gm, '<h5 class="ia-h">$1</h5>')
  s = s.replace(/^##\s+(.+)$/gm, '<h4 class="ia-h">$1</h4>')
  s = s.replace(/^#\s+(.+)$/gm, '<h3 class="ia-h">$1</h3>')
  // Negrito e italico
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
  // Listas: "- item" ou "* item" no inicio da linha
  s = s.replace(/^[ \t]*[-*]\s+(.+)$/gm, '<li>$1</li>')
  // Envolve grupos consecutivos de <li> em <ul>
  s = s.replace(/(?:<li>[^<]*<\/li>\s*)+/g, m => `<ul class="ia-ul">${m}</ul>`)
  // Paragrafos: quebras duplas viram </p><p>
  s = s.split(/\n{2,}/).map(p => p.trim()).filter(Boolean).map(p => {
    if (/^<(ul|h\d|hr)/.test(p)) return p
    return `<p>${p.replace(/\n/g, '<br>')}</p>`
  }).join('')
  return s
}

// Gravidade pode chegar como numero (escala 0-10) ou texto (alta/media/baixa) — normalizamos.
function gravidadeSlug(g) {
  if (g == null) return 'media'
  const num = Number(g)
  if (!isNaN(num) && isFinite(num)) {
    if (num >= 7) return 'alta'
    if (num >= 4) return 'media'
    return 'baixa'
  }
  const s = String(g).toLowerCase()
  if (s.includes('alt') || s.includes('critic')) return 'alta'
  if (s.includes('med')) return 'media'
  return 'baixa'
}
function gravidadeLabel(g) {
  return { alta: 'ALTA', media: 'MÉDIA', baixa: 'BAIXA' }[gravidadeSlug(g)]
}

// Percepcao: tradur chaves snake_case em labels amigaveis
const PERCEPCAO_LABELS = {
  tom: 'Tom',
  engajamento: 'Engajamento',
  confianca: 'Confiança',
  abertura_mudanca: 'Abertura à mudança',
  clareza_objetivos: 'Clareza de objetivos',
  maturidade_digital: 'Maturidade digital',
  disposicao_investir: 'Disposição a investir',
  velocidade_decisao: 'Velocidade de decisão'
}
function percepcaoLabel(chave) {
  return PERCEPCAO_LABELS[chave] || String(chave).replace(/_/g, ' ')
}

// Plataformas esperadas por fase — ESPELHA server/services/kommo-client.js PHASE_FIELDS.
// So essas que sao auditadas/alertadas na fase correspondente.
const PHASE_EXPECTED_PLATFORMS = {
  'kickoff': ['slides', 'transcricao'],
  'fase-2':  ['slides', 'transcricao'],
  'fase-3':  ['slides', 'transcricao', 'figma', 'miro'],
  'fase-4':  ['slides', 'transcricao'],
  'fase-5':  ['slides', 'transcricao', 'figma', 'miro']
}
function plataformasEsperadas() {
  const slug = detalhe.value?.fase?.fase_slug
  return PHASE_EXPECTED_PLATFORMS[slug] || ['slides', 'transcricao']
}

const extractionReportParsed = computed(() => {
  const ctx = analiseAtual.value?.contexto_rag
  const parsed = typeof ctx === 'string' ? (() => { try { return JSON.parse(ctx) } catch { return null } })() : ctx
  return parsed?.extractionReport || null
})

const materiaisFaltantes = computed(() => {
  const esperadas = new Set(plataformasEsperadas())
  const report = extractionReportParsed.value
  if (report?.failed?.length) {
    // Filtra so o que realmente e esperado nesta fase (nao alerta figma/miro fora de fase-3/fase-5)
    return report.failed
      .filter(f => esperadas.has(f.plataforma))
      .map(f => ({
        plataforma: labelPlataforma(f.plataforma),
        motivo: humanizeMotivo(f.motivo)
      }))
  }
  // Fallback: status 'parcial' sem extractionReport -> presumir que algo nao foi extraido
  const st = analiseAtual.value?.status_avaliacao
  if (st === 'parcial' && !report) {
    const naoUsadas = plataformasEsperadas().filter(p => p !== 'transcricao')
    return naoUsadas.map(p => ({
      plataforma: labelPlataforma(p),
      motivo: 'Arquivo nao acessivel ou nao preenchido'
    }))
  }
  return []
})

const materiaisExtraidos = computed(() => {
  const report = extractionReportParsed.value
  if (report?.success?.length) {
    return report.success.map(labelPlataforma)
  }
  // Fallback: qualquer status 'parcial' ou 'completa' — presumir transcricao foi usada (regra do prompt)
  const st = analiseAtual.value?.status_avaliacao
  if (st === 'parcial' || st === 'completa') {
    return [labelPlataforma('transcricao')]
  }
  return []
})

// Avaliacao da equipe V4 — persistida em consolidado.avaliacao_equipe
const avaliacaoEquipe = computed(() => {
  const raw = analiseAtual.value?.consolidado
  if (!raw) return null
  const parsed = typeof raw === 'string' ? (() => { try { return JSON.parse(raw) } catch { return null } })() : raw
  return parsed?.avaliacao_equipe || null
})
const equipeScores = computed(() => {
  const s = avaliacaoEquipe.value?.scores
  if (!s || typeof s !== 'object') return []
  const DIM_LABELS = {
    conducao_reuniao: 'Conducao da reuniao',
    escuta_ativa: 'Escuta ativa',
    profundidade_diagnostico: 'Profundidade do diagnostico',
    clareza_proximos_passos: 'Clareza de proximos passos',
    postura_consultiva: 'Postura consultiva'
  }
  return Object.entries(s)
    .filter(([, v]) => v != null && isFinite(Number(v)))
    .map(([chave, valor]) => ({ chave, label: DIM_LABELS[chave] || chave, valor: Number(valor) }))
})
const metodoLabel = computed(() => {
  const m = avaliacaoEquipe.value?.v4_metodo
  if (!m) return ''
  return {
    email: 'identificado por email',
    nome_squad: 'identificado pelo nome do squad',
    inferencia_transcricao: 'inferido pela transcricao'
  }[m] || m
})
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
    const res = await tc.carregarDetalheFase(props.cliente.id, faseAtiva.value)
    detalhe.value = res
    // Re-atacha polling de job em andamento — evita a barra de progresso "sumir"
    // quando o usuario trocou de fase e voltou (pollJob e idempotente via activeJobs).
    // Passa o created_at real para o cronometro nao resetar a cada reabertura.
    if (res?.job_ativo?.id) tc.pollJob(res.job_ativo.id, res.job_ativo.created_at || null)
  } catch (err) {
    detalhe.value = null
  } finally {
    loadingDetalhe.value = false
    // Re-renderiza icones lucide apos carga async (banner, rodape, componentes consolidados)
    nextTick(() => window.lucide && window.lucide.createIcons())
  }
}

const PHASES_COM_MATERIAIS = ['kickoff', 'fase-2', 'fase-3', 'fase-4', 'fase-5']

// Flags de contexto
const isFaseProjetoConcluido = computed(() =>
  detalhe.value?.fase?.fase_slug === 'projeto-concluido'
)
// Traduz mensagem tecnica de falha em algo legivel para o usuario final.
// Nunca expoe nomes de env vars, constraints SQL, HTTP codes ou stack traces.
function humanizeFalhaMsg(raw) {
  if (!raw) return 'Falha na analise — tente novamente'
  const m = String(raw).toLowerCase()
  if (m.includes('api_key') || m.includes('openrouter') || m.includes('not configured')) {
    return 'Servico de IA indisponivel no momento — contate o responsavel tecnico'
  }
  if (m.includes('null value') || m.includes('constraint') || m.includes('violates')) {
    return 'A IA retornou dados incompletos — uma nova tentativa costuma resolver'
  }
  if (m.includes('timeout') || m.includes('timed out')) return 'Tempo esgotado na analise — tente novamente'
  if (m.includes('403') || m.includes('forbidden') || m.includes('permission')) return 'Sem permissao para acessar algum arquivo dos materiais'
  if (m.includes('404') || m.includes('not found')) return 'Algum material nao foi encontrado no link informado'
  if (m.includes('500') || m.includes('502') || m.includes('503') || m.includes('504')) return 'Falha temporaria na leitura dos materiais'
  if (m.includes('network') || m.includes('fetch')) return 'Falha de rede ao processar a analise'
  return 'Falha na analise — tente novamente'
}

const ultimaFalha = computed(() => {
  const f = detalhe.value?.fase
  if (!f?.ultima_falha_msg) return null
  return { msg: humanizeFalhaMsg(f.ultima_falha_msg), em: f.ultima_falha_em }
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
      const ok = confirm('Gerar NOVA versão da Análise Consolidada? A versão anterior fica preservada no histórico.')
      if (!ok) return
    }
    try {
      const job = await tc.analisarFinal(projetoFaseId, props.leadId)
      if (job?.status === 'duplicate') {
        alert('Análise Consolidada já em andamento. Aguarde concluir.')
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

// JSON consolidado (avanco, qualidade_time, pontos_positivos, pontos_negativos, checklist_auditoria)
const consolidado = computed(() => {
  const raw = analiseAtual.value?.consolidado
  if (!raw) return null
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return null }
  }
  return raw
})

// Checklist de Auditoria — lista esperada X entregue (entregue/ausente/nao_aplicavel/extra).
// Persistido em consolidado.checklist_auditoria tanto nas analises individuais quanto no final report.
const checklistAuditoria = computed(() => consolidado.value?.checklist_auditoria || null)

// Revisao de Portugues — sempre presente em todas as analises (obrigatoria no prompt).
// Shape: { veredicto, mensagem, erros: [] }
const revisaoPortugues = computed(() => consolidado.value?.revisao_portugues || null)

// Novo schema estruturado (lido de consolidado em analises novas) com fallback ao legado.
const resumoEstruturado = computed(() => consolidado.value?.resumo_estruturado || null)
const analiseMateriaisEstruturada = computed(() => consolidado.value?.analise_materiais_estruturada || null)

// Insatisfacoes do cliente (novo) e recomendacoes de como lidar (novo) — com fallback aos aliases legados
const insatisfacoesCliente = computed(() => {
  const c = consolidado.value?.insatisfacoes_cliente
  if (Array.isArray(c) && c.length) return c
  return analiseAtual.value?.dores || []
})
const recomendacoesLidarCliente = computed(() => {
  const c = consolidado.value?.recomendacoes_lidar_cliente
  if (Array.isArray(c) && c.length) return c.map(r => ({
    descricao: r.descricao, tipo: r.categoria || r.tipo || 'comunicacao', prioridade: r.prioridade || 'media'
  }))
  return analiseAtual.value?.recomendacoes || []
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

// Bloqueia scroll do body enquanto o painel esta aberto.
// Sempre limpa para string vazia no unlock — mais robusto do que restaurar valor anterior,
// que poderia ficar preso em 'hidden' se duas instancias montassem em sequencia rapida.
function lockBodyScroll() {
  document.body.style.overflow = 'hidden'
  document.documentElement.style.overflow = 'hidden'
}
function unlockBodyScroll() {
  document.body.style.overflow = ''
  document.documentElement.style.overflow = ''
}

onMounted(() => {
  carregarDetalhe()
  window.addEventListener('keydown', handleKeydown)
  lockBodyScroll()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  unlockBodyScroll()
})

watch(faseAtiva, carregarDetalhe)
// jobsEmAndamento filtra completed/failed — entao jobAtivo vai de objeto -> null quando conclui.
// Recarregamos o detalhe tanto ao ver status "completed" quanto na transicao job->null.
watch(jobAtivo, (novo, antigo) => {
  if (antigo && !novo) {
    // Job saiu da lista de em-andamento (concluiu ou falhou) — recarrega analise
    carregarDetalhe()
  } else if (novo?.status === 'completed') {
    carregarDetalhe()
  }
})
</script>

<template>
  <div class="super-painel" role="dialog" aria-modal="true">
    <!-- Bloco 1: header + timeline + banner formam uma unidade visual -->
    <section class="sp-head-bloco">
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
      <div class="sp-header-actions">
        <!-- Botão de Fontes: mostra as plataformas esperadas da fase atual (Slides / Transcrição / Figma / Miro) -->
        <TcFontesExtraidasBotao
          :fase-slug="detalhe?.fase?.fase_slug || ''"
          :extraction-report="extractionReportParsed"
        />
        <button class="btn close-btn" @click="emit('close')" aria-label="Fechar">&times;</button>
      </div>
    </header>

    <!-- Linha de navegacao: timeline de fases + banner de status alinhados horizontalmente -->
    <div class="sp-nav-row" :class="{ 'no-banner': !mostraBanner }">
      <TcTimelineFases
        :fases="fases"
        :cliente-fases="cliente.fases || {}"
        :active="faseAtiva"
        :fase-atual-ordem="Number(cliente.fase_atual_ordem || 0)"
        @select="faseAtiva = $event"
      />

      <!-- Banner fica a direita, na mesma linha da timeline. Expande sutilmente ao clicar em Detalhes. -->
      <div
        v-if="analiseAtual && !jobAtivo && !loadingDetalhe"
        class="sp-nav-banners"
        :class="{ 'is-expanded': bannerAberto }"
      >
        <VSharingRequiredBanner
          v-if="analiseSharingRequired"
          :analise-id="analiseAtual.id"
          :accounts="sharingContext.accounts"
          :platform="sharingContext.platform"
          :url="sharingContext.url"
          @retried="onAnaliseRetried"
        />
        <div
          v-else-if="analiseAtual.status_avaliacao === 'incompleta'"
          class="sp-incomplete-banner"
          :class="{ 'is-collapsed': !bannerAberto }"
        >
          <i data-lucide="alert-triangle" class="banner-icon"></i>
          <div class="banner-content">
            <div class="banner-compact">
              <div class="banner-compact-text">
                <strong>Sem material suficiente para auditar</strong>
                <span v-if="!bannerAberto && materiaisFaltantes.length" class="banner-compact-hint">
                  {{ materiaisFaltantes.length }} material{{ materiaisFaltantes.length === 1 ? '' : 'is' }} indisponível{{ materiaisFaltantes.length === 1 ? '' : 'is' }}
                </span>
              </div>
              <button class="banner-toggle" @click="toggleBanner" :aria-expanded="bannerAberto">
                <i :data-lucide="bannerAberto ? 'chevron-up' : 'chevron-down'" class="inline-icon"></i>
                {{ bannerAberto ? 'Recolher' : 'Detalhes' }}
              </button>
            </div>
            <template v-if="bannerAberto">
              <p>Envie a transcrição da reunião para que a IA consiga rodar uma análise profunda.</p>
              <ul v-if="materiaisFaltantes.length" class="banner-materiais">
                <li v-for="m in materiaisFaltantes" :key="m.plataforma">
                  <span class="banner-mat-label">{{ m.plataforma }}</span>
                  <span class="banner-mat-motivo">{{ m.motivo }}</span>
                </li>
              </ul>
            </template>
          </div>
        </div>
        <div
          v-else-if="analiseAtual.status_avaliacao === 'parcial'"
          class="sp-incomplete-banner sp-incomplete-banner--parcial"
          :class="{ 'is-collapsed': !bannerAberto }"
        >
          <i data-lucide="info" class="banner-icon"></i>
          <div class="banner-content">
            <div class="banner-compact">
              <div class="banner-compact-text">
                <strong>Análise feita a partir da transcrição</strong>
                <span v-if="!bannerAberto" class="banner-compact-hint">
                  {{ materiaisExtraidos.length }} usado{{ materiaisExtraidos.length === 1 ? '' : 's' }}
                  <template v-if="materiaisFaltantes.length"> · {{ materiaisFaltantes.length }} indisponível{{ materiaisFaltantes.length === 1 ? '' : 'is' }}</template>
                </span>
              </div>
              <button class="banner-toggle" @click="toggleBanner" :aria-expanded="bannerAberto">
                <i :data-lucide="bannerAberto ? 'chevron-up' : 'chevron-down'" class="inline-icon"></i>
                {{ bannerAberto ? 'Recolher' : 'Detalhes' }}
              </button>
            </div>
            <template v-if="bannerAberto">
              <p>A transcrição foi a base da análise. Anexar os demais materiais pode enriquecer o score.</p>
              <div v-if="materiaisExtraidos.length || materiaisFaltantes.length" class="banner-materiais-grid">
                <div v-if="materiaisExtraidos.length" class="banner-ok">
                  <span class="banner-mat-titulo">Usados na análise</span>
                  <ul>
                    <li v-for="p in materiaisExtraidos" :key="'ok-' + p">{{ p }}</li>
                  </ul>
                </div>
                <div v-if="materiaisFaltantes.length" class="banner-fail">
                  <span class="banner-mat-titulo">Não disponíveis</span>
                  <ul>
                    <li v-for="m in materiaisFaltantes" :key="'fail-' + m.plataforma">
                      <span class="banner-mat-label">{{ m.plataforma }}</span>
                      <span class="banner-mat-motivo">{{ m.motivo }}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Banner de erro inline: ultima tentativa de analise falhou -->
    <div v-if="ultimaFalha && !jobAtivo" class="sp-falha-banner">
      <i data-lucide="alert-circle" class="banner-icon"></i>
      <div class="falha-body">
        <strong>Última análise falhou</strong>
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
    </section>
    <!-- Fim do Bloco 1 (header + timeline + banner) -->

    <div v-if="jobAtivo" class="sp-job-wrap">
      <TcJobProgress :job="jobAtivo" />
    </div>

    <div v-if="loadingDetalhe" class="sp-loading">
      <VLoadingState size="lg" />
    </div>

    <div v-else-if="!analiseAtual && !jobAtivo" class="sp-vazio">
      <VEmptyState
        :icon="isFaseProjetoConcluido ? 'file-check' : 'sparkles'"
        :title="isFaseProjetoConcluido ? 'Projeto pronto para validação' : 'Fase ainda não analisada'"
        :description="isFaseProjetoConcluido
          ? 'Gere o relatório consolidado que junta todas as fases auditadas, destaca pontos positivos e negativos, avalia a qualidade do time e mapeia oportunidades de expansão.'
          : 'Dispare uma análise para que a IA avalie os materiais entregues nesta fase. Ela vai ler slides, transcrições e documentos, gerar score, riscos e oportunidades.'"
      />
      <div class="sp-vazio-actions">
        <button class="btn btn-primary" @click="analisarFase" :disabled="!!jobAtivo">
          <i :data-lucide="isFaseProjetoConcluido ? 'sparkles' : 'play'" class="inline-icon"></i>
          {{ isFaseProjetoConcluido ? 'Gerar Análise Consolidada' : 'Analisar agora' }}
        </button>
      </div>
    </div>

    <div v-else-if="!analiseAtual && jobAtivo" class="sp-vazio sp-vazio--running">
      <!-- Job em andamento, sem analise anterior: TcJobProgress acima ja comunica -->
    </div>

    <div v-if="analiseAtual && !loadingDetalhe" class="sp-body">

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
        <TcChecklistAuditoria v-if="checklistAuditoria" :checklist="checklistAuditoria" />
        <TcRevisaoPortugues v-if="revisaoPortugues" :revisao="revisaoPortugues" />
      </div>

      <!-- TOPO DESTAQUE: Percepção + Avaliação da Equipe lado a lado (maior peso na nota — 75% + 20%) -->
      <div
        class="sp-topo-destaque"
        v-if="analiseAtual.status_avaliacao !== 'incompleta' && (analiseAtual.percepcao_cliente || avaliacaoEquipe)"
      >
        <TcPercepcaoCliente
          v-if="analiseAtual.percepcao_cliente"
          :percepcao="analiseAtual.percepcao_cliente"
        />
        <TcAvaliacaoEquipe
          v-if="avaliacaoEquipe"
          :avaliacao="avaliacaoEquipe"
        />
      </div>

      <section class="sp-coluna sp-coluna--relatorio" v-if="analiseAtual.status_avaliacao !== 'incompleta'">
        <!-- Resumo Executivo — subcards com sentiment/flash, expansíveis individualmente -->
        <TcResumoEstruturado
          v-if="resumoEstruturado || analiseAtual.resumo"
          :resumo-estruturado="resumoEstruturado"
          :resumo-fallback="analiseAtual.resumo || ''"
          :veredicto="analiseAtual.veredicto || ''"
        />

        <!-- Analise dos Materiais — subcards com sentiment/flash, expansíveis individualmente -->
        <TcAnaliseMateriaisEstruturada
          v-if="analiseMateriaisEstruturada || analiseAtual.analise_materiais"
          :analise-estruturada="analiseMateriaisEstruturada"
          :analise-fallback="analiseAtual.analise_materiais || ''"
        />

        <!-- Checklist de Auditoria (lista esperada da fase × conteudo entregue) -->
        <TcChecklistAuditoria
          v-if="!isFaseProjetoConcluido && checklistAuditoria"
          :checklist="checklistAuditoria"
        />

        <!-- Revisao de Portugues (ortografia/gramatica dos materiais) -->
        <TcRevisaoPortugues
          v-if="!isFaseProjetoConcluido && revisaoPortugues"
          :revisao="revisaoPortugues"
        />

        <!-- Insatisfacoes do Cliente (renomeado de "Dores") — foco: o que o cliente esta descontente sobre a V4 -->
        <div class="sp-card" v-if="insatisfacoesCliente.length">
          <h2>Insatisfações do Cliente</h2>
          <ul>
            <li v-for="(d, i) in insatisfacoesCliente" :key="i">
              <span class="gravidade" :class="`gravidade--${gravidadeSlug(d.gravidade)}`">
                {{ gravidadeLabel(d.gravidade) }}
              </span>
              {{ d.descricao }}
              <small v-if="d.evidencia" class="insat-evidencia">“{{ d.evidencia }}”</small>
            </li>
          </ul>
        </div>
      </section>

      <section
        class="sp-coluna sp-coluna--acoes"
        v-if="analiseAtual.status_avaliacao !== 'incompleta' &&
              (analiseAtual.oportunidades?.length || recomendacoesLidarCliente.length)"
      >
        <!-- Novo card de Oportunidades (probabilidade + breakdown de urgencia + justificativa expansivel) -->
        <TcConsolidadoOportunidades
          v-if="analiseAtual.oportunidades?.length"
          :oportunidades="analiseAtual.oportunidades"
          @criar-kommo="abrirKommoModal"
        />

        <!-- Bloco oculto de Riscos — removido por preferencia do usuario (foco no relacionamento, nao em riscos internos).
             Mantido apenas no backend se o prompt ainda retornar (retrocompat com dados legados). -->
        <div v-if="false" class="sp-card">
          <h2>Riscos</h2>
          <ul>
            <li v-for="(r, i) in analiseAtual.riscos" :key="i">
              <strong>{{ formatTipo(r.tipo) }}</strong> — {{ r.descricao }}
              <small>(probabilidade: {{ r.probabilidade }} · impacto: {{ r.impacto }})</small>
            </li>
          </ul>
        </div>

        <div class="sp-card" v-if="recomendacoesLidarCliente.length">
          <h2>Recomendações de como lidar com o Cliente</h2>
          <p class="sp-card-sub">
            Foco em comunicação, engajamento e pontos que o cliente valoriza — não em ações estratégicas do negócio.
          </p>
          <ol>
            <li v-for="(rec, i) in recomendacoesLidarCliente" :key="i">
              <span class="prioridade" :class="`prioridade--${rec.prioridade}`">{{ rec.prioridade }}</span>
              <span v-if="rec.tipo" class="recom-tipo">{{ formatTipo(rec.tipo) }}</span>
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
          {{ isFaseProjetoConcluido ? 'Regenerar Análise Consolidada' : 'Re-analisar fase atual' }}
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
/* === Visual focado em leitura e acao === */
.super-painel {
  position: fixed; inset: 0;
  /* Base solida + tingimento vermelho sutil no topo-esquerda (reforca marca V4) */
  background:
    radial-gradient(900px 420px at 10% -10%, rgba(255, 0, 0, 0.08), transparent 65%),
    #0a0a0a;
  display: flex; flex-direction: column;
  z-index: 9000;
  overflow-y: auto;
  animation: sp-in 220ms ease-out;
}
@keyframes sp-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Cards solidos com hover lift — convida exploracao sem poluir */
.super-painel :deep(.sp-card),
.super-painel :deep(.av-card),
.super-painel :deep(.qt-card),
.super-painel :deep(.pp-section),
.super-painel :deep(.sc-card),
.super-painel :deep(.opp-card) {
  background: #141414;
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
}
.super-painel :deep(.sp-card:hover),
.super-painel :deep(.av-card:hover),
.super-painel :deep(.qt-card:hover),
.super-painel :deep(.pp-section:hover),
.super-painel :deep(.opp-card:hover) {
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.14);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

/* Barras de acento laterais por categoria — cria hierarquia visual imediata.
   Sem azul primario (proibido no design system V4) — paleta: branco / lime / roxo / vermelho */
.super-painel :deep(.av-card)       { border-left: 3px solid rgba(255, 255, 255, 0.6); }
.super-painel :deep(.qt-card)       { border-left: 3px solid var(--chart-color-6, #84cc16); }
.super-painel :deep(.pp-section)    { border-left: 3px solid var(--chart-color-5, #a855f7); }
.super-painel :deep(.opp-card)      { border-left: 3px solid var(--color-primary, #ff0000); }

/* Titulos de secao com mais peso para guiar leitura */
.super-painel :deep(.sp-card h2),
.super-painel :deep(.av-card h2),
.super-painel :deep(.qt-card h2),
.super-painel :deep(.pp-section h2),
.super-painel :deep(.opp-card h2) {
  letter-spacing: -0.2px;
}

.sp-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  padding: var(--spacing-lg);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: #0d0d0d;
  position: sticky; top: 0; z-index: 2;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
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
  grid-auto-rows: max-content;   /* evita itens do grid esticarem verticalmente */
  gap: var(--spacing-lg); padding: var(--spacing-lg);
  flex: 0 1 auto;                 /* sp-body cresce so ate o conteudo */
}
.sp-coluna { display: flex; flex-direction: column; gap: var(--spacing-md); }

/* Topo destaque: Percepção + Avaliação da Equipe lado a lado (ocupa toda a largura do grid .sp-body) */
.sp-topo-destaque {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-lg);
}
@media (max-width: 900px) {
  .sp-topo-destaque { grid-template-columns: 1fr; }
}

/* Bloco 1: header + timeline + banner formam uma unidade visual coesa */
.sp-head-bloco {
  background: #0d0d0d;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
  padding-bottom: var(--spacing-sm);
}
.sp-head-bloco .sp-header {
  position: static;                        /* sticky fica no bloco inteiro, nao so no header */
  border-bottom: none;                     /* separador fica no wrapper */
  box-shadow: none;
}

/* Linha de navegacao: timeline + banner sempre centralizados verticalmente */
.sp-nav-row {
  display: flex;
  align-items: center;                     /* sempre ao centro — remove jogo de flex-start/center */
  justify-content: flex-start;
  gap: var(--spacing-md);
  padding: 0 var(--spacing-lg);
}
/* Quando nao ha banner (analise completa ou inexistente), menu ocupa o centro da faixa */
.sp-nav-row.no-banner {
  justify-content: center;
}
.sp-nav-row > :deep(.tc-timeline) {
  margin: 0;
  padding: var(--spacing-sm) var(--spacing-md);
  flex-shrink: 0;
  min-height: 0;
}
.sp-nav-banners {
  flex: 1; min-width: 0;
  display: flex;
  align-items: center;                     /* alinhado com o centro da timeline */
}
.sp-nav-banners > * {
  flex: 1; min-width: 0;
}

@media (max-width: 1000px) {
  .sp-nav-row { flex-direction: column; align-items: stretch; }
  .sp-nav-row > :deep(.tc-timeline) { align-self: auto; }
}

/* Card de Avaliacao da Equipe — reaproveita o estilo de Percepcao + tag do V4 */
.sp-card--equipe .sp-card-header {
  margin-bottom: var(--spacing-md);
}
.equipe-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px var(--spacing-sm);
  background: rgba(var(--color-safe-rgb), 0.12);
  color: var(--color-safe);
  border: 1px solid rgba(var(--color-safe-rgb), 0.3);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  cursor: help;
}
.equipe-tag .inline-icon { width: 12px; height: 12px; }

/* Alerta sutil (amarelo discreto) — quando IA nao identificou o V4 */
.equipe-alert {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px var(--spacing-sm);
  background: rgba(var(--color-care-rgb), 0.08);
  color: var(--color-care);
  border: 1px solid rgba(var(--color-care-rgb), 0.25);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  cursor: help;
}
.equipe-alert .inline-icon { width: 12px; height: 12px; }

.equipe-vazio {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: var(--text-muted);
  font-size: var(--font-size-sm);
  line-height: 1.5;
  margin: 0;
  cursor: help;
}
.equipe-vazio .inline-icon {
  width: 14px; height: 14px;
  flex-shrink: 0; margin-top: 2px;
  color: var(--color-care);                /* ponto amarelo sutil para o alerta */
}

/* Banner inline mantem estilo — classe .sp-incomplete-banner usada SO dentro de .sp-banners */
.sp-incomplete-banner {
  align-self: start;
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-lg);
  background: linear-gradient(90deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02));
  border: 1px solid rgba(245,158,11,0.3);
  border-left: 3px solid var(--color-care);
  border-radius: var(--radius-md);
  transition: padding 140ms ease;
}
.sp-incomplete-banner.is-collapsed {
  padding: 10px var(--spacing-lg);          /* altura compacta quando fechado */
  align-items: center;
}
.sp-incomplete-banner.is-collapsed .banner-icon {
  margin-top: 0;
  width: 20px; height: 20px;
}
.sp-incomplete-banner.is-collapsed strong {
  margin-bottom: 0;                          /* sem margem — linha unica */
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
  margin: var(--spacing-sm) 0 0;
}

/* Linha compacta (titulo + hint + botao toggle) */
.banner-compact {
  display: flex; align-items: center; justify-content: space-between;
  gap: var(--spacing-md); flex-wrap: wrap;
}
.banner-compact-text {
  display: flex; align-items: baseline; gap: var(--spacing-sm); flex-wrap: wrap;
  min-width: 0;
}
.banner-compact-hint {
  color: var(--text-muted); font-size: var(--font-size-sm);
}
.banner-toggle {
  flex-shrink: 0;
  display: inline-flex; align-items: center; gap: 4px;
  background: transparent; border: 1px solid rgba(var(--color-care-rgb), 0.3);
  color: var(--color-care); font-family: inherit;
  font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold);
  padding: 4px 10px; border-radius: var(--radius-sm);
  cursor: pointer; transition: all var(--transition-fast);
  text-transform: uppercase; letter-spacing: 0.3px;
}
.banner-toggle:hover {
  background: rgba(var(--color-care-rgb), 0.1);
  border-color: rgba(var(--color-care-rgb), 0.5);
}
/* Parcial: tom amarelo sutil (do design system — sem azul proibido) */
.sp-incomplete-banner--parcial {
  background: linear-gradient(90deg, rgba(var(--color-care-rgb), 0.08), rgba(var(--color-care-rgb), 0.02));
  border-color: rgba(var(--color-care-rgb), 0.3);
  border-left-color: var(--color-care);
}
.sp-incomplete-banner--parcial .banner-icon { color: var(--color-care); }

.banner-content { flex: 1; min-width: 0; }

.banner-materiais {
  list-style: none;
  padding: 0;
  margin: var(--spacing-sm) 0 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.banner-materiais li {
  display: flex;
  gap: var(--spacing-sm);
  align-items: baseline;
  font-size: var(--font-size-sm);
  color: var(--text-medium);
}

.banner-materiais-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
  margin-top: var(--spacing-md);
}
.banner-materiais-grid ul {
  list-style: none;
  padding: 0;
  margin: 4px 0 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: var(--font-size-sm);
}
.banner-mat-titulo {
  display: block;
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--text-lowest);
  font-weight: var(--font-weight-semibold);
}
.banner-ok ul li {
  color: var(--color-safe);
  font-weight: var(--font-weight-medium);
}
.banner-ok ul li::before {
  content: '✓ ';
  color: var(--color-safe);
}
.banner-fail ul li {
  color: var(--text-low);
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 0;
  border-top: 1px solid var(--border-row);
}
.banner-fail ul li:first-child { border-top: none; }
.banner-mat-label {
  color: var(--color-danger);
  font-weight: var(--font-weight-semibold);
  text-transform: capitalize;
}
.banner-mat-motivo {
  color: var(--text-muted);
  font-size: var(--font-size-xs);
  font-style: italic;
}

@media (max-width: 720px) {
  .banner-materiais-grid { grid-template-columns: 1fr; }
}
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

/* Card retratil: header clicavel + botao toggle minimalista */
.sp-card--collapsible .sp-card-header { margin-bottom: var(--spacing-md); }
.sp-card--collapsible.is-collapsed .sp-card-header { margin-bottom: 0; }
.sp-card-header--clickable {
  cursor: pointer;
  user-select: none;
  transition: opacity var(--transition-fast);
}
.sp-card-header--clickable:hover { opacity: 0.85; }
.sp-card-header--clickable h2 { margin: 0; }
.sp-card-head-right { display: flex; align-items: center; gap: var(--spacing-sm); }
.sp-card-toggle {
  background: transparent;
  border: 1px solid var(--border-card);
  color: var(--text-medium);
  width: 28px; height: 28px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  transition: all var(--transition-fast);
}
.sp-card-toggle:hover {
  background: var(--bg-hover);
  border-color: var(--border-input);
  color: var(--text-high);
}
.sp-card-toggle .inline-icon { width: 14px; height: 14px; }

/* Texto rico (markdown simples renderizado pela IA) */
.ia-rich {
  color: var(--text-medium);
  font-size: var(--font-size-base);
  line-height: 1.6;
}
/* Primeiro/ultimo elemento nao tem margem externa — o card ja da o padding */
.ia-rich > *:first-child { margin-top: 0 !important; }
.ia-rich > *:last-child { margin-bottom: 0 !important; }

.ia-rich p { margin: 0 0 12px; }
.ia-rich p + p { margin-top: 0; }
.ia-rich strong { color: var(--text-high); font-weight: var(--font-weight-semibold); }
.ia-rich em { font-style: italic; color: var(--text-medium); }

/* Titulos: respiro GRANDE acima (separa da secao anterior) e PEQUENO abaixo (conecta com o paragrafo que vem) */
.ia-rich h3, .ia-rich h4, .ia-rich h5, .ia-rich .ia-h {
  color: var(--text-high);
  font-weight: var(--font-weight-semibold);
  margin: 20px 0 6px;
  line-height: 1.3;
}
.ia-rich h3, .ia-rich .ia-h { font-size: var(--font-size-lg); margin-top: 22px; }
.ia-rich h4 { font-size: var(--font-size-md); }
.ia-rich h5 {
  font-size: var(--font-size-sm);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-low);
  margin-top: 18px;
  margin-bottom: 4px;
}
/* Imediatamente apos titulo, remove margem-topo do paragrafo/lista pra "colar" no titulo */
.ia-rich h3 + p, .ia-rich h4 + p, .ia-rich h5 + p,
.ia-rich h3 + .ia-ul, .ia-rich h4 + .ia-ul, .ia-rich h5 + .ia-ul { margin-top: 0; }

.ia-rich .ia-ul {
  list-style: disc;
  padding-left: 18px;
  margin: 4px 0 12px;
}
.ia-rich .ia-ul li {
  margin-bottom: 2px;
  color: var(--text-medium);
  line-height: 1.55;
}
.ia-rich .ia-ul li:last-child { margin-bottom: 0; }

/* Separador horizontal: respiro igual em cima e embaixo, sem exagero */
.ia-rich .ia-hr {
  border: none;
  border-top: 1px solid var(--border-row);
  margin: 18px 0;
}
/* Paragrafo apos hr nao precisa de margem-topo extra */
.ia-rich .ia-hr + p,
.ia-rich .ia-hr + h3,
.ia-rich .ia-hr + h4,
.ia-rich .ia-hr + h5 { margin-top: 0; }

/* Transicao suave ao expandir/recolher conteudo dos cards */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: opacity 220ms ease, transform 220ms ease, max-height 260ms ease;
  overflow: hidden;
  max-height: 4000px;
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
  max-height: 0;
}

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

/* Evidencia citada pela IA na insatisfacao (trecho da conversa) */
.insat-evidencia {
  display: block;
  margin-top: 4px;
  font-style: italic;
  color: var(--text-lowest);
  font-size: var(--font-size-xs);
  line-height: 1.4;
}

/* Sub-titulo explicativo abaixo do h2 em alguns cards */
.sp-card-sub {
  margin: 0 0 var(--spacing-md);
  color: var(--text-lowest);
  font-size: var(--font-size-sm);
  line-height: 1.4;
  font-style: italic;
}

/* Tag de categoria da recomendacao (comunicacao, engajamento, tom, processo, ponto forte a reforcar) */
.recom-tipo {
  display: inline-block;
  padding: 1px 6px;
  background: var(--bg-inner);
  border: 1px solid var(--border-row);
  border-radius: var(--radius-sm);
  color: var(--text-low);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  margin-right: var(--spacing-xs);
  text-transform: none;
  letter-spacing: 0;
}

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

/* Group de ações do header: Fontes (popover) + close */
.sp-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
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
  font-size: 13px;
  margin: 0 0 4px;
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
