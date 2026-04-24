// AI client abstrato — roteia analise/nota/coordenador para o provedor configurado
// pelo admin no DB (tc_ai_provider_config). Embedding permanece em openai-client.js
// porque os vetores ja persistidos em tc_embeddings foram gerados com text-embedding-3-small.
//
// Providers suportados: openai, openrouter.
// Ambos usam payload compativel com OpenAI chat/completions — so mudam base URL + auth.

import pool from '../lib/db.js'
import { createRateLimiter, withRetry } from '../lib/rate-limiter.js'
import { getCatalogoProdutosTexto } from './catalogo-produtos-v4.js'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_SITE_URL = process.env.OPENROUTER_SITE_URL || 'https://dashboards.v4ferrazpiai.com.br'
const OPENROUTER_APP_TITLE = process.env.OPENROUTER_APP_TITLE || 'Torre de Controle V4'

const PROVIDER_ENDPOINTS = {
  openai:     { url: 'https://api.openai.com/v1/chat/completions',     keyVar: 'OPENAI_API_KEY' },
  openrouter: { url: 'https://openrouter.ai/api/v1/chat/completions',  keyVar: 'OPENROUTER_API_KEY' }
}

// Defaults por provider (sobrescritos pelo DB). Output < $1/1M tokens.
export const PROVIDER_DEFAULTS = {
  openai: {
    model_analysis: 'gpt-5.4-mini',
    model_note: 'gpt-5.4-nano',
    price_in_per_mtok: 0.75,
    price_out_per_mtok: 4.50
  },
  openrouter: {
    model_analysis: 'deepseek/deepseek-v3.2-exp',
    model_note: 'deepseek/deepseek-v3.2-exp',
    price_in_per_mtok: 0.27,
    price_out_per_mtok: 0.41
  }
}

// Catalogo curado de modelos por provider/campo — usado pela UI admin para preencher selects.
// Ordem: do melhor para o pior para a tarefa especifica do campo.
// Precos em USD por 1M tokens. Modelos :free sao gratuitos mas sujeitos a 429 (retry automatico).
// Campos: id, label, price_in, price_out, hint (uso), free? (true se rate-limited free tier).
export const PROVIDER_CATALOG = {
  openai: {
    analysis: [
      { id: 'gpt-5.4',       label: 'GPT-5.4 (flagship)',   price_in: 2.50, price_out: 15.00, hint: 'Melhor raciocinio e JSON mode' },
      { id: 'gpt-5.4-mini',  label: 'GPT-5.4 mini',         price_in: 0.75, price_out: 4.50,  hint: 'Equilibrio forte' },
      { id: 'o4-mini',       label: 'o4-mini (reasoning)',  price_in: 1.10, price_out: 4.40,  hint: 'Raciocinio estruturado' },
      { id: 'gpt-4o',        label: 'GPT-4o (legado)',      price_in: 2.50, price_out: 10.00, hint: 'Legado solido' }
    ],
    note: [
      { id: 'gpt-5.4',       label: 'GPT-5.4',              price_in: 2.50, price_out: 15.00, hint: 'Maxima qualidade de tom pt-BR' },
      { id: 'gpt-5.4-mini',  label: 'GPT-5.4 mini',         price_in: 0.75, price_out: 4.50,  hint: 'Alto nivel, menor custo' },
      { id: 'o4-mini',       label: 'o4-mini',              price_in: 1.10, price_out: 4.40,  hint: 'Reasoning leve' },
      { id: 'gpt-5.4-nano',  label: 'GPT-5.4 nano',         price_in: 0.20, price_out: 1.25,  hint: 'Barato, qualidade suficiente para notas curtas' }
    ],
    coordinator: [
      { id: 'gpt-5.4',       label: 'GPT-5.4',              price_in: 2.50, price_out: 15.00, hint: 'Melhor raciocinio geral' },
      { id: 'gpt-4.1',       label: 'GPT-4.1 (1M contexto)',price_in: 2.00, price_out: 8.00,  hint: '1M tokens — ideal para muitos colaboradores' },
      { id: 'gpt-5.4-mini',  label: 'GPT-5.4 mini',         price_in: 0.75, price_out: 4.50,  hint: 'Balance' },
      { id: 'o4-mini',       label: 'o4-mini',              price_in: 1.10, price_out: 4.40,  hint: 'Reasoning leve' }
    ]
  },
  openrouter: {
    analysis: [
      { id: 'nvidia/nemotron-3-super-120b-a12b',       label: 'Nemotron 3 Super 120B',          price_in: 0.09, price_out: 0.45, hint: 'MoE 120B/12B ativos, 1M contexto — melhor pago' },
      { id: 'nvidia/nemotron-3-super-120b-a12b:free',  label: 'Nemotron 3 Super 120B (gratis)', price_in: 0,    price_out: 0,    hint: 'Mesmo modelo, gratuito (retry auto em 429)', free: true },
      { id: 'deepseek/deepseek-v3.2-exp',              label: 'DeepSeek V3.2 exp',              price_in: 0.27, price_out: 0.41, hint: '164k contexto, solido' },
      { id: 'qwen/qwen-2.5-72b-instruct',              label: 'Qwen 2.5 72B',                   price_in: 0.35, price_out: 0.40, hint: 'Multilingue forte' }
    ],
    note: [
      { id: 'nvidia/nemotron-3-super-120b-a12b:free',  label: 'Nemotron 3 Super 120B (gratis)', price_in: 0,    price_out: 0,    hint: 'Gratuito + alta qualidade (retry 429)', free: true },
      { id: 'google/gemini-2.5-flash',                 label: 'Gemini 2.5 Flash',               price_in: 0.10, price_out: 0.40, hint: 'Rapido e limpo' },
      { id: 'nvidia/nemotron-3-nano-30b-a3b',          label: 'Nemotron 3 Nano 30B',            price_in: 0.05, price_out: 0.20, hint: 'Mais barato pago' },
      { id: 'nvidia/nemotron-nano-9b-v2:free',         label: 'Nemotron Nano 9B v2 (gratis)',   price_in: 0,    price_out: 0,    hint: 'Pequeno e rapido (retry 429)', free: true }
    ],
    coordinator: [
      { id: 'nvidia/nemotron-3-super-120b-a12b',       label: 'Nemotron 3 Super 120B',          price_in: 0.09, price_out: 0.45, hint: 'MoE 120B, 1M contexto — recomendado' },
      { id: 'nvidia/nemotron-3-super-120b-a12b:free',  label: 'Nemotron 3 Super 120B (gratis)', price_in: 0,    price_out: 0,    hint: 'Mesmo modelo, gratuito (retry 429)', free: true },
      { id: 'deepseek/deepseek-v3.2-exp',              label: 'DeepSeek V3.2 exp',              price_in: 0.27, price_out: 0.41, hint: '164k contexto' },
      { id: 'meta-llama/llama-3.3-70b-instruct',       label: 'Llama 3.3 70B',                  price_in: 0.23, price_out: 0.40, hint: '128k contexto, Meta open-source' }
    ]
  }
}

// Cache de 60s para evitar N queries por job
const CACHE_TTL_MS = 60_000
let _configCache = null
let _configCacheTs = 0

export function invalidateProviderCache() {
  _configCache = null
  _configCacheTs = 0
}

export async function getActiveProviderConfig() {
  const now = Date.now()
  if (_configCache && (now - _configCacheTs) < CACHE_TTL_MS) return _configCache

  try {
    const { rows } = await pool.query(
      `SELECT provider, model_analysis, model_note, model_coordinator,
              price_in_per_mtok, price_out_per_mtok
       FROM tc_ai_provider_config WHERE id = 1`
    )
    if (rows[0]) {
      _configCache = rows[0]
      _configCacheTs = now
      return rows[0]
    }
  } catch (err) {
    console.warn(`[${new Date().toISOString()}] [ai-client] falha lendo config, usando defaults:`, err.message)
  }

  // Fallback: env ou defaults
  const provider = process.env.AI_PROVIDER || 'openai'
  const base = PROVIDER_DEFAULTS[provider] || PROVIDER_DEFAULTS.openai
  return {
    provider,
    model_analysis: process.env.AI_MODEL_ANALYSIS || base.model_analysis,
    model_note: process.env.AI_MODEL_NOTE || base.model_note,
    model_coordinator: process.env.AI_MODEL_COORDINATOR || null,
    price_in_per_mtok: base.price_in_per_mtok,
    price_out_per_mtok: base.price_out_per_mtok
  }
}

// Rate limiter por provider (evita thundering herd em picos)
const _limiters = {}
function limiterFor(provider) {
  if (!_limiters[provider]) {
    _limiters[provider] = createRateLimiter({
      type: 'concurrent-rpm',
      maxConcurrent: parseInt(process.env[`${provider.toUpperCase()}_MAX_CONCURRENT`] || '3', 10),
      maxRpm: parseInt(process.env[`${provider.toUpperCase()}_MAX_RPM`] || '60', 10)
    })
  }
  return _limiters[provider]
}

function getApiKey(provider) {
  if (provider === 'openai') return OPENAI_API_KEY
  if (provider === 'openrouter') return OPENROUTER_API_KEY
  return null
}

async function chatCompletion(provider, body) {
  const endpoint = PROVIDER_ENDPOINTS[provider]
  if (!endpoint) throw new Error(`Provider desconhecido: ${provider}`)

  const apiKey = getApiKey(provider)
  if (!apiKey) {
    const err = new Error(`${endpoint.keyVar} nao configurado`)
    err.status = 500
    throw err
  }

  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  }
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = OPENROUTER_SITE_URL
    headers['X-Title'] = OPENROUTER_APP_TITLE
  }

  // Modelos :free do OpenRouter tem rate limit agressivo (20 req/min, 200/dia).
  // Retry ampliado com backoff maior e mais tentativas — usuario NAO deve ver erro 429.
  const isFreeModel = String(body?.model || '').endsWith(':free')
  const retryOpts = isFreeModel
    ? { maxRetries: 6, baseDelayMs: 2000 }   // ate ~2+4+8+16+32+64 = 126s de espera total
    : { maxRetries: 3, baseDelayMs: 1000 }

  const limiter = limiterFor(provider)
  await limiter.acquire()
  try {
    return await withRetry(async () => {
      const res = await globalThis.fetch(endpoint.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(180_000)
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        const err = new Error(`${provider} ${res.status}: ${text.slice(0, 300)}`)
        err.status = res.status
        throw err
      }
      return res.json()
    }, retryOpts)
  } finally {
    limiter.release()
  }
}

// Aproximacao tokens (pt-BR ~1.3 tokens/palavra) — usada para budget control
export function countTokens(text) {
  if (!text) return 0
  return Math.ceil(String(text).split(/\s+/).length * 1.3)
}

// ─────────────────────────────────────────────────────────────────────────────
// Checklist de Auditoria por fase — lista esperada de entregas
// Usada para injetar a "Lista Esperada" no prompt e gerar checklist_auditoria.
// Slugs alinhados com STAGE_TO_FASE (kommo-client.js).
// ─────────────────────────────────────────────────────────────────────────────

export const FASE_CHECKLIST = {
  kickoff: {
    nome: 'Fase 1 — Abertura e Onboarding',
    topicos: [
      'Apresentacao do time V4 e do cliente',
      'Escopo do projeto e entregaveis acordados',
      'Cronograma e prazos',
      'Responsabilidades e canais de comunicacao',
      'Objetivos principais e KPIs alinhados'
    ]
  },
  'fase-2': {
    nome: 'Fase 2 — Imersao e Descoberta',
    topicos: [
      'Definicao e Sizing de Mercado (TAM / SAM / SOM)',
      'Estudo de Concorrentes',
      'Definicao de ICPs + Comite de Compra (B2B)',
      'Definicao de Persona (B2C)',
      'Jobs To Be Done',
      'Comparativo de Solucoes',
      'Diferenciais Competitivos',
      'Definicao de PUV (Proposta Unica de Valor)'
    ]
  },
  'fase-3': {
    nome: 'Fase 3 — Diagnostico (Midia Paga, Criativos e Ambientes)',
    topicos: [
      'Revisao tecnica das campanhas Meta Ads',
      'Revisao tecnica das campanhas Google Ads',
      'Avaliacao de eficiencia dos investimentos',
      'Plano de Acao — Midia Paga',
      'Analise de Material Criativo para anuncios',
      'Benchmarking de anuncios',
      'Analise e Bench Social Media (fixados, destaques, bio e posts)',
      'Plano de Acao — Criativos / Social Media',
      'Estudo de Copy e Narrativa do ambiente (LP / Site)',
      'Analise de Design e Usabilidade',
      'Cliente Oculto (ambiente digital)',
      'Plano de Acao — Ambientes / CRO / Vendas'
    ]
  },
  'fase-4': {
    nome: 'Fase 4 — Comercial',
    topicos: [
      'Analise Tecnica, Comportamental e Processual do time comercial',
      'Cliente Oculto (atendimento comercial)',
      'Plano de Acao — Comercial'
    ]
  },
  'fase-5': {
    nome: 'Fase 5 — Encerramento (Planejamento Final e GTM)',
    topicos: [
      'Matriz de Priorizacao de Modelo de Go To Market e Canais',
      'Fluxo de estrategias de Aquisicao, Engajamento, Monetizacao e Retencao',
      'Manual de Copy',
      'Manual de Identidade Visual',
      'Forecast / Projecao 3 meses de midia',
      'Entrega Final com o Cliente'
    ]
  },
  'projeto-concluido': {
    nome: 'Relatorio Final Consolidado',
    topicos: [
      'Cobertura das 5 fases do projeto',
      'Pontos positivos consolidados',
      'Pontos negativos consolidados',
      'Avanco do cliente fase a fase',
      'Qualidade do time V4',
      'Oportunidades de expansao mapeadas'
    ]
  }
}

function buildChecklistInstruction(fase) {
  const entry = FASE_CHECKLIST[fase]
  if (!entry) return ''
  const lista = entry.topicos.map((t, i) => `  ${i + 1}. ${t}`).join('\n')
  return `

CHECKLIST DE AUDITORIA — regra obrigatoria:
Gere o campo checklist_auditoria cruzando a LISTA ESPERADA desta fase com o conteudo real dos materiais.
Busque CONCEITOS, nao palavras-chave exatas — um topico coberto por titulo diferente mas conteudo equivalente e PRESENTE.
Conteudo fragmentado em varios slides/paginas conta como UM topico presente.

LISTA ESPERADA (${entry.nome}):
${lista}

Formato JSON de checklist_auditoria:
{
  "entregue":       array de { "topico": string, "fontes": string (slides/paginas/secoes onde foi localizado), "observacao": string opcional },
  "ausente":        array de { "topico": string, "motivo": string (ex: "nao encontrado apos varredura semantica completa") },
  "nao_aplicavel":  array de { "topico": string, "justificativa": string (ex: "cliente nao opera Google Ads — documentado no material") },
  "extra":          array de { "topico": string, "fontes": string, "descricao": string curta }
}

REGRAS:
- Cubra TODOS os topicos da LISTA ESPERADA — cada um deve estar em entregue, ausente ou nao_aplicavel.
- "fontes" deve citar onde o conteudo foi encontrado (ex: "Slide 12 — Analise Competitiva", "Secao 3.2 do PDF", "Transcricao min 14").
- "extra" e para entregas adicionais do time que NAO constavam na lista — so registre se realmente agregam valor auditavel.
- Se o material tem apenas transcricao/conteudo parcial, marque como ausente os topicos nao cobertos (nao invente presencas).`
}

// ─────────────────────────────────────────────────────────────────────────────
// API publica — analise/nota/coordenador
// ─────────────────────────────────────────────────────────────────────────────

const ANALYSIS_SYSTEM_PROMPT = `Voce e um auditor de relacionamento da V4 Company. Seu trabalho e ler os materiais da fase do cliente e devolver um JSON estruturado que responda a DUAS perguntas — e SO essas duas:

  (A) Como o cliente esta enxergando a V4 neste momento?
  (B) Qual foi a qualidade real e percebida das entregas da V4 ate aqui?

Voce NAO e um estrategista de negocios do cliente. NAO sugira "proximo movimento estrategico", NAO recomende o que o cliente deveria fazer no mercado dele, NAO opine sobre o negocio dele. Se o texto que voce esta escrevendo soa como conselho de consultoria ao cliente, reescreva — o foco e relacao V4 x cliente e qualidade da entrega V4.

PRINCIPIO CENTRAL — Profundidade sobre completude:
A transcricao da reuniao e a FONTE PRIMARIA. Se ha transcricao utilizavel, voce tem material suficiente para uma analise profunda:
- Leia com profundidade o humor do cliente, a dinamica entre os times, quem puxa a conversa, onde o cliente recua, onde elogia, onde cobra.
- NUNCA marque "incompleta" so porque faltam slides ou outros materiais — a transcricao carrega o conteudo real da conversa.
- "incompleta" = apenas quando NAO HA conteudo real em NENHUM material (sem transcricao, sem documentos, so links vazios).
- Com transcricao + qualquer material extra: status_avaliacao = "completa".
- So use "parcial" se a transcricao for curta/truncada E faltar outro material que importaria.

LINGUAGEM NO TEXTO RETORNADO — REGRA ABSOLUTA:
- NUNCA mencione erros tecnicos, codigos HTTP, nomes de variaveis de ambiente, ferramentas de extracao ou mensagens de sistema (ex: "erro 500", "n8n extract", "OPENROUTER_API_KEY", "falha na extracao dos slides").
- NUNCA cite o briefing tecnico (<estado_extracao>): nao repita frases como "0 fontes", "nenhum material", "transcricao disponivel", "materiais que falharam". Isso e metadata interno, NAO faz parte da analise.
- NUNCA mencione o que NAO foi recebido. O front ja sinaliza isso. Analise o que VOCE tem, trate como se fosse completo.
- Se ha material util, escreva como se aquele fosse o material completo. Foco em insight, nao em queixa.

FORMATACAO DOS CAMPOS DE TEXTO LONGO — OBRIGATORIO usar:
- **negrito** para destacar numeros, nomes proprios, termos chave e achados criticos (ex: "cliente voltou 3x ao tema **prazo de entrega**").
- *italico* para citar falas curtas do cliente/time V4 (ex: "ele disse *'gostei muito da apresentacao da semana passada'*").
- ## Subtitulo para dividir o texto em blocos tematicos claros.
- ### Subtitulo menor para sub-secoes dentro de um tema.
- - item de lista quando houver 3+ pontos de mesmo tipo (sinais, elogios, frustracoes).
- --- separador horizontal entre blocos grandes se fizer sentido visualmente.

REGRAS DE ESPACAMENTO (formatacao do markdown):
- SEPARADOR HORIZONTAL (---): SEMPRE linha em branco ANTES e linha em branco DEPOIS do ---.
- SUBTITULOS (##, ###): sempre linha em branco ANTES, mas NUNCA linha em branco APOS — o paragrafo colado logo abaixo.
- Paragrafos curtos (2-4 linhas). Textos longos sem estrutura sao proibidos. O leitor deve escanear em 15 segundos.

CAMPOS PADRAO FIXOS — NAO INVENTE TOPICOS DIFERENTES A CADA ANALISE:
As subdivisoes de resumo_estruturado e analise_materiais_estruturada sao FIXAS. Toda analise cobre os mesmos 5 campos de resumo e os mesmos 4 campos de analise de materiais. Se um campo genuinamente nao fizer sentido (ex: nao ha entregavel visual para avaliar clareza visual), use string curta explicando: "Sem material visual nesta fase para avaliar." Nunca omita o campo.

---

JSON ESPERADO — schema completo:

- status_avaliacao: "completa" | "parcial" | "incompleta" — OBRIGATORIO.
- score: number 0-10 (NULL se incompleta). Ver FORMULA DO SCORE no final.
- score_composicao: { percepcao: number, checklist: number, oportunidades: number, final: number } — transparencia do calculo.
- veredicto: string curta. Para incompleta: "Materiais insuficientes — coletar antes de auditar".

- resumo_estruturado: objeto com 5 campos fixos. CADA campo e um objeto { texto, sentiment, flash }:
  {
    momento_cliente:        { texto, sentiment, flash },
    dinamica_v4_cliente:    { texto, sentiment, flash },
    qualidade_entregas_v4:  { texto, sentiment, flash },
    sinais_satisfacao:      { texto, sentiment, flash },
    pontos_atencao_relacao: { texto, sentiment, flash }
  }
  - texto: 3-6 frases densas, DETALHADAS e com EVIDENCIAS citaveis (**negrito**, *italico*, ## subtitulos internos permitidos). Tom consultivo de relacionamento — NAO estrategico. O usuario precisa abrir esse campo e sentir que tem uma analise ULTRA DETALHADA, nao um resumo superficial.
  - sentiment: uma de "positivo" | "neutro" | "atencao" | "negativo". Representa semaforo do tema:
      * positivo = tudo bem, pode manter; indicador verde.
      * neutro = nem bom nem ruim, so observar; indicador cinza.
      * atencao = precisa olhar; indicador amarelo.
      * negativo = problema real; indicador vermelho.
    Regras por campo:
      - momento_cliente: positivo se cliente esta bem; atencao se ha tensao; negativo se descontente.
      - dinamica_v4_cliente: positivo se saudavel; atencao se unilateral/defensiva; negativo se conflituosa.
      - qualidade_entregas_v4: positivo se qualidade alta; atencao se media; negativo se cliente cobrou qualidade.
      - sinais_satisfacao: positivo quando ha; neutro quando ausente (nao forcar negativo).
      - pontos_atencao_relacao: neutro se nao ha nada; atencao se ha algo a observar; negativo se ha problema real.
  - flash: UMA linha ate 100 chars, resumo escaneavel para quando o subcard estiver recolhido. Frase completa, nao bullet. Ex: "Cliente engajado mas visivelmente tenso com prazo da fase 4".
  Conteudo do texto DEVE sustentar o sentiment — se sentiment="positivo", o texto deve evidenciar porque e positivo; se "negativo", quais evidencias sustentam.
  Se incompleta: todos os 5 campos = { texto: null, sentiment: "neutro", flash: "Sem material para avaliar" }.

- resumo: string (OBRIGATORIA, markdown). E a concatenacao renderizada dos 5 campos de resumo_estruturado, um por bloco, com ## subtitulos nesta ordem:
  ## Momento do cliente
  ## Dinamica entre V4 e cliente
  ## Qualidade das entregas da V4
  ## Sinais de satisfacao
  ## Pontos de atencao na relacao
  Use **negrito** e *italico* conforme regras de formatacao.

- analise_materiais_estruturada: objeto com 4 campos fixos. CADA campo e um objeto { texto, sentiment, flash } (mesma regra do resumo_estruturado):
  {
    cobertura_escopo:         { texto, sentiment, flash },
    profundidade_conteudo:    { texto, sentiment, flash },
    clareza_visual_didatica:  { texto, sentiment, flash },
    alinhamento_com_cliente:  { texto, sentiment, flash }
  }
  - texto: 3-6 frases densas, DETALHADAS, com EVIDENCIAS (quais slides, quais paginas, quais trechos). SEM citar falhas de extracao. Permite **negrito**, *italico* e ## subtitulos internos.
  - sentiment: "positivo" | "neutro" | "atencao" | "negativo" (mesmo semaforo do resumo).
    Regras por campo:
      - cobertura_escopo: positivo quando cobre >=80% dos topicos esperados; atencao entre 50-80%; negativo abaixo de 50%.
      - profundidade_conteudo: positivo quando diagnosticos densos com dados; atencao quando superficial; negativo quando raso ou generico.
      - clareza_visual_didatica: positivo quando legivel e alinhado ao padrao V4; atencao quando funcional mas desalinhado; negativo quando confuso/poluido.
      - alinhamento_com_cliente: positivo quando conecta as dores; atencao quando genera; negativo quando fala de outro assunto.
  - flash: UMA linha ate 100 chars, resumo escaneavel. Ex: "Slides cobrem 9 de 12 topicos — falta ICP e PUV".
  Se incompleta: todos os 4 campos = { texto: null, sentiment: "neutro", flash: "Sem material para avaliar" }.

- analise_materiais: string (OBRIGATORIA, markdown). Concatenacao renderizada dos 4 campos acima, com ## subtitulos:
  ## Cobertura do escopo
  ## Profundidade do conteudo
  ## Clareza visual e didatica
  ## Alinhamento com o cliente

- percepcao_cliente: objeto onde CADA dimensao e um objeto { valor, justificativa, confianca }:
  {
    tom: { valor: 0-10, justificativa: "...citar trecho/evidencia...", confianca: 0-10 },
    engajamento: { valor, justificativa, confianca },
    confianca: { valor, justificativa, confianca },
    abertura_mudanca: { valor, justificativa, confianca },
    clareza_objetivos: { valor, justificativa, confianca },
    maturidade_digital: { valor, justificativa, confianca },
    disposicao_investir: { valor, justificativa, confianca },
    velocidade_decisao: { valor, justificativa, confianca }
  }
  Regras:
  - valor: nota 0-10 refletindo COMO o cliente se apresenta.
  - justificativa: 1-2 frases citando evidencia especifica (ex: "interrompeu 4x para questionar ROI"). Nao e generica.
  - confianca: 0-10 quao confiante voce esta nesta nota, baseado em material disponivel.
  - Se incompleta: dimensoes com valor=null, justificativa="Sem material para avaliar", confianca=0. NAO omita dimensoes.
- avaliacao_equipe: objeto avaliando o FUNCIONARIO DA V4 que conduziu a reuniao — NAO o cliente:
  {
    v4_identificado: string ou null (nome do funcionario V4),
    v4_metodo: "email" | "nome_squad" | "inferencia_transcricao" | null,
    cliente_identificado: string ou null,
    confianca_geral: 0-10 (quao confiante voce esta da avaliacao do time como um todo),
    scores: {
      conducao_reuniao:         { valor: 0-10, justificativa: "...", confianca: 0-10 },
      escuta_ativa:             { valor, justificativa, confianca },
      profundidade_diagnostico: { valor, justificativa, confianca },
      clareza_proximos_passos:  { valor, justificativa, confianca },
      postura_consultiva:       { valor, justificativa, confianca }
    }
  }
  Regras:
  - Se NAO identifica o V4 com razoavel confianca: v4_identificado=null, v4_metodo=null, scores={} (vazio), confianca_geral=0.
  - Se identifica mas nao ha evidencia para uma dimensao: aquela dimensao = { valor: null, justificativa: "Sem evidencia suficiente", confianca: 0 }.
  - A analise e do V4. Ignore comportamento do cliente aqui.

- insatisfacoes_cliente: array de { descricao, gravidade, evidencia }.
  FOCO ABSOLUTO: insatisfacoes do cliente COM A ENTREGA OU POSTURA DA V4. NAO dores gerais de negocio do cliente.
  - descricao: 1-2 frases sobre o ponto de insatisfacao com a V4.
  - gravidade: "alta" | "media" | "baixa".
  - evidencia: trecho curto ou citacao da conversa/material que sustenta.
  Exemplos validos: "cliente mencionou que slides da fase 3 vieram superficiais", "cobrou retorno que ficou 2 semanas sem resposta".
  Exemplos INVALIDOS: "cliente tem dificuldade de gerar leads", "empresa sofre com concorrencia".
  Se nada apareceu: array vazio. Para incompleta: array vazio.

- dores: ALIAS de insatisfacoes_cliente para retrocompatibilidade. Duplicar o mesmo array. Cada item no formato { descricao, gravidade }.

- oportunidades: array com NO MAXIMO 5 itens de { titulo, descricao, urgencia, probabilidade_fechamento, justificativa, evidencia_urgencia }:
  - titulo: NOME EXATO de produto do <catalogo_produtos_v4>. Nao invente.
  - descricao: 1-2 frases conectando o produto a uma dor/oportunidade real identificada.
  - urgencia: "alta" | "media" | "baixa". CRITERIOS RIGOROSOS:
    * alta = cliente citou EXPLICITAMENTE a dor com intensidade (precisa trecho citavel) E ha timing claro ("preciso resolver isso este mes"). Sem evidencia citavel = NUNCA alta. Se evidencia_urgencia vazia, degradar para "media".
    * media = dor aparece mas sem pressao temporal clara.
    * baixa = nice-to-have, conexao fraca.
  - probabilidade_fechamento: 0-100.
  - justificativa: 2-4 frases referenciando dor especifica e trecho.
  - evidencia_urgencia: string curta citando trecho (OBRIGATORIA quando urgencia="alta"; pode ser vazia em media/baixa).
  - Se NAO ha produto do catalogo que realmente casa com uma dor: array menor (ate vazio). Nao forcar.
  - NAO incluir valor_estimado.
  - Para incompleta: array vazio.

- riscos: array de { descricao, tipo, probabilidade, impacto }.
  NAO E PRIORIDADE. Preencher SOMENTE se ha risco EVIDENTE de churn citado (ex: cliente disse literalmente que pensou em sair). Sem evidencia = array vazio.

- recomendacoes_lidar_cliente: array de { descricao, categoria, prioridade }.
  FOCO: como o time V4 deve se comunicar e se relacionar com ESTE cliente daqui pra frente. O que ele gosta, o que valoriza, o que manter, o que evitar, tom a adotar.
  - categoria: "comunicacao" | "engajamento" | "tom" | "processo" | "ponto_forte_a_reforcar".
  - prioridade: "alta" | "media" | "baixa".
  Exemplos validos: "Reforcar uso de numeros concretos — cliente visivelmente responde melhor a dados", "Evitar jargao tecnico em reunioes com a diretora".
  Exemplos INVALIDOS: "Implementar plano de acao X no negocio do cliente", "Fazer auditoria do funil do cliente".
  Para incompleta: liste o que a V4 precisa coletar ("Solicitar gravacao do kickoff").

- recomendacoes: ALIAS de recomendacoes_lidar_cliente. Duplicar. Campos: { descricao, tipo, prioridade } (tipo = categoria).
- checklist_auditoria (objeto com arrays entregue/ausente/nao_aplicavel/extra — ver regra especifica abaixo quando aplicavel).
- revisao_portugues (objeto OBRIGATORIO — sempre gerar):
  {
    "veredicto": "limpo" | "erros_encontrados" | "nao_aplicavel",
    "mensagem": string (se 'limpo': parabenize a equipe pela escrita; se 'erros_encontrados': resumo em 1-2 frases; se 'nao_aplicavel': explique por que — ex: material so tem audio/transcricao automatica),
    "erros": array de { "trecho": string (texto exato com o erro), "localizacao": string (slide/secao/paragrafo onde aparece), "tipo": "ortografia" | "concordancia" | "acentuacao" | "digitacao" | "pontuacao" | "clareza", "correcao": string (versao correta sugerida) }
  }
  FONTES PRIORITARIAS DA AUDITORIA (ordem):
  1. Apresentacoes do Google Slides (plataforma="slides") — titulos, subtitulos, bullets, legendas.
  2. Boards do Figma (plataforma="figma") — textos de frames, componentes, anotacoes.
  3. Boards do Miro (plataforma="miro") — post-its, conectores, blocos de texto.
  4. Documentos anexos (plataforma="documento" / "pdf") — corpo do texto.
  REGRAS:
  - Varra TODO texto visivel das FONTES PRIORITARIAS acima (slides, figma, miro) — inclusive conteudo embarcado em anotacoes/legendas/fala do slide.
  - Ignore transcricoes automaticas de audio (Whisper/YouTube, plataforma="transcricao" / "reuniao") — erros ali sao do transcritor, nao da equipe.
  - Sempre que for um erro em slides/figma/miro, inclua a plataforma no inicio da localizacao (ex: "Slides — pagina 3, titulo", "Figma — frame 'Hero'", "Miro — bloco superior direito").
  - Liste cada erro SEPARADAMENTE. Nao agrupe varios erros numa string so.
  - Se nao houver erros: veredicto="limpo", erros=[], mensagem com parabenizacao breve (1 frase).
  - Nunca invente erros — so reporte o que voce VE com certeza no material.
  - Se nenhum material textual auditavel estiver disponivel (so transcricao automatica): veredicto="nao_aplicavel", erros=[], mensagem explicando.

---

FORMULA DO SCORE (OBRIGATORIA — use exatamente):

  media_percepcao = media aritmetica dos valores \`valor\` (0-10) de todas as 8 dimensoes de percepcao_cliente que NAO sao null.
    Se todas null: media_percepcao = null (score final = null).

  n_entregues   = quantidade de itens em checklist_auditoria.entregue
  n_ausentes    = quantidade de itens em checklist_auditoria.ausente
  (ignorar nao_aplicavel e extra)
  score_checklist = (n_entregues + n_ausentes > 0) ? (10 * n_entregues / (n_entregues + n_ausentes)) : null

  score_oportunidades = maior valor de (probabilidade_fechamento/10) entre as oportunidades; 0 se array vazio.

  score_final = 0.75 * media_percepcao
              + 0.20 * score_checklist
              + 0.05 * score_oportunidades

  Se media_percepcao for null OU score_checklist for null: use apenas as partes disponiveis, renormalizando os pesos proporcionalmente. Se nenhuma parte disponivel: score_final = null.

  Arredonde para 1 casa decimal, escala 0-10.

  Preencher score_composicao:
    {
      percepcao: media_percepcao (ou null),
      checklist: score_checklist (ou null),
      oportunidades: score_oportunidades,
      final: score_final
    }

  O campo \`score\` recebe score_final.

---

AUTORREVISAO OBRIGATORIA DO SEU PROPRIO TEXTO (ultima etapa antes de emitir o JSON):
Releia cada campo de texto livre (resumo, resumo_estruturado.*, analise_materiais, analise_materiais_estruturada.*, veredicto, oportunidades.descricao, oportunidades.justificativa, insatisfacoes_cliente.descricao, recomendacoes_lidar_cliente.descricao, percepcao_cliente.*.justificativa, avaliacao_equipe.scores.*.justificativa) e corrija erros de ortografia, concordancia, acentuacao, crase, pontuacao, digitacao e regencia. A saida final deve estar 100% correta em portugues brasileiro. Voce audita a escrita do time — a sua precisa ser impecavel. Nao confunda "ha/a", "mais/mas", "mim/eu", "afim/a fim", "onde/aonde".

Responda APENAS com JSON valido — sem markdown, sem comentarios.`

/**
 * Analise de fase — retorna JSON estruturado + metadados (provider/modelo/tokens).
 * opts.systemPrompt: override para casos especiais (ex: relatorio final).
 * opts.userPrompt:   quando systemPrompt e fornecido, usar como user message direto.
 */
// Converte o ragContext (objeto com camadas L1-L5) em XML — mais denso e legivel para LLM
// do que JSON.stringify, e evita que o modelo confunda chaves/aspas com instrucoes.
function ragContextToXml(ragContext) {
  if (!ragContext || typeof ragContext !== 'object') return String(ragContext ?? '')
  const esc = (s) => String(s ?? '').replace(/<\/?(contexto_rag|historico|casos_similares|conhecimento|kommo|notas|camada)\b[^>]*>/gi, '')
  const layers = [
    ['historico',        ragContext.historico_cliente],
    ['casos_similares',  ragContext.casos_similares],
    ['conhecimento',     ragContext.base_conhecimento],
    ['kommo',            ragContext.contexto_kommo],
    ['notas',            ragContext.anotacoes_internas]
  ]
  const body = layers
    .filter(([, v]) => v && String(v).trim())
    .map(([tag, v]) => `<${tag}>\n${esc(v)}\n</${tag}>`)
    .join('\n')
  return `<contexto_rag>\n${body || '(sem contexto disponivel)'}\n</contexto_rag>`
}

export async function analyzeText(materialContent, ragContext, opts = {}) {
  const config = await getActiveProviderConfig()
  const model = config.model_analysis
  // Checklist de auditoria: lista esperada da fase e anexada ao system prompt quando opts.fase e um slug conhecido.
  const checklistInstruction = opts.fase ? buildChecklistInstruction(opts.fase) : ''
  const systemPrompt = (opts.systemPrompt || ANALYSIS_SYSTEM_PROMPT) + checklistInstruction
  // Catalogo real da V4 injetado APENAS na analise individual (nao no final report que ja tem catalogos Kommo).
  const catalogoBloco = opts.systemPrompt ? '' : `\n\n<catalogo_produtos_v4>\n${getCatalogoProdutosTexto()}\n</catalogo_produtos_v4>`
  const userPrompt = opts.systemPrompt
    ? materialContent // final report ja envia o prompt completo como userPrompt
    : `${materialContent}\n\n${ragContextToXml(ragContext)}${catalogoBloco}`

  const data = await chatCompletion(config.provider, {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3
  })

  const content = data.choices?.[0]?.message?.content || '{}'
  let parsed
  try {
    parsed = JSON.parse(content)
  } catch (err) {
    const e = new Error(`IA retornou JSON invalido: ${err.message}. Primeiros 200 chars: ${content.slice(0, 200)}`)
    e.status = 502
    throw e
  }

  return {
    ...parsed,
    _provider: config.provider,
    _model: model,
    tokens_input: data.usage?.prompt_tokens,
    tokens_output: data.usage?.completion_tokens
  }
}

/**
 * Gera nota curta (pt-BR) para o CRM Kommo. Usa model_note (mais barato).
 */
export async function generateNote(analysisData) {
  const config = await getActiveProviderConfig()
  const model = config.model_note || config.model_analysis
  const prompt = `Gere uma nota formatada para o CRM Kommo baseada nesta analise. Seja conciso, profissional, em portugues.
Inclua: score, resumo, principais dores (com gravidade) e recomendacoes prioritarias.
Maximo 800 caracteres.

${JSON.stringify(analysisData)}`

  const data = await chatCompletion(config.provider, {
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.4
  })
  return data.choices?.[0]?.message?.content || ''
}

/**
 * Analise de colaborador (usada pelo cron semanal). Usa model_coordinator se definido,
 * senao model_analysis. Permite override via COLLAB_ANALYSIS_MODEL env (legado).
 */
export async function analyzeCollaborator(userData) {
  const config = await getActiveProviderConfig()
  const model = process.env.COLLAB_ANALYSIS_MODEL
    || config.model_coordinator
    || config.model_analysis
  const prompt = `Analise o desempenho deste colaborador e retorne JSON com:
- pontos_fortes (array de strings)
- pontos_atencao (array de strings)
- recomendacoes (array de strings)
- distribuicao (objeto com contagens por faixa de score ex: {"0-3": 2, "4-6": 5, "7-10": 3}).

Dados:
${JSON.stringify(userData)}`

  const data = await chatCompletion(config.provider, {
    model,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.3
  })
  return JSON.parse(data.choices?.[0]?.message?.content || '{}')
}

/**
 * Pinga o provider com uma mensagem curta — usado pelo admin para validar API key/modelo.
 * Retorna { ok, latency_ms, model, provider } ou lanca erro.
 */
export async function pingProvider(provider, model) {
  const t0 = Date.now()
  // Modelos modernos da OpenAI (gpt-5.4, o3/o4) rejeitam `max_tokens` — usam `max_completion_tokens`.
  // Modelos legados (gpt-4o) e OpenRouter aceitam ambos. Usar max_completion_tokens como canonical.
  const body = {
    model,
    messages: [{ role: 'user', content: 'ping' }],
    temperature: 0
  }
  // Apenas aplica limite de output quando o provider e OpenAI. OpenRouter passa-through — deixa
  // o modelo decidir (alguns free models rejeitam max_*_tokens tambem).
  if (provider === 'openai') body.max_completion_tokens = 5

  const data = await chatCompletion(provider, body)
  return {
    ok: true,
    latency_ms: Date.now() - t0,
    provider,
    model,
    response: data.choices?.[0]?.message?.content?.slice(0, 50) || ''
  }
}
