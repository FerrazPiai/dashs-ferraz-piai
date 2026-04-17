<template>
  <div>
    <div class="tab-header">
      <div>
        <h2 class="tab-title">Provedor de IA</h2>
        <p class="tab-sub">
          Configuracao dos modelos usados pelas analises automaticas, notas do Kommo e coordenador.
          Embeddings continuam em OpenAI (text-embedding-3-small) para compatibilidade.
        </p>
      </div>
      <button
        class="btn-pri"
        @click="save"
        :disabled="!isOwner || saving || !dirty"
      >
        {{ saving ? 'Salvando...' : 'Salvar' }}
      </button>
    </div>

    <div v-if="!isOwner" class="owner-banner">
      <i data-lucide="lock" class="ob-icon"></i>
      <div>
        <strong>Somente o admin-owner pode alterar esta configuracao.</strong>
        <p>Os campos sao exibidos em modo leitura.</p>
      </div>
    </div>

    <div v-if="loading" class="loading">Carregando configuracao...</div>

    <div v-else class="grid">
      <section class="panel">
        <h3 class="ph">Provedor</h3>
        <div class="fg">
          <label class="fl">Provider</label>
          <select v-model="form.provider" class="fi" :disabled="!isOwner" @change="onProviderChange">
            <option v-for="p in providers" :key="p" :value="p">{{ labelProvider(p) }}</option>
          </select>
          <small class="fh">
            <template v-if="form.provider === 'openai'">
              Analises via OpenAI — requer OPENAI_API_KEY no .env.
            </template>
            <template v-else-if="form.provider === 'openrouter'">
              Analises via OpenRouter — requer OPENROUTER_API_KEY no .env. Sugestao:
              <code>deepseek/deepseek-v3.2-exp</code> (output $0.41/1M, contexto 164k).
            </template>
          </small>
        </div>

        <div class="fg">
          <label class="fl">Modelo — Analise (principal)</label>
          <input v-model="form.model_analysis" class="fi" :disabled="!isOwner" placeholder="ex: deepseek/deepseek-v3.2-exp" />
          <small class="fh">Modelo pesado — le materiais + RAG + produz JSON estruturado.</small>
        </div>

        <div class="fg">
          <label class="fl">Modelo — Nota Kommo (curta)</label>
          <input v-model="form.model_note" class="fi" :disabled="!isOwner" placeholder="ex: deepseek/deepseek-v3.2-exp" />
          <small class="fh">Modelo barato para geracao da nota breve postada no Kommo.</small>
        </div>

        <div class="fg">
          <label class="fl">Modelo — Coordenador (opcional)</label>
          <input v-model="form.model_coordinator" class="fi" :disabled="!isOwner" placeholder="Vazio = usa modelo de analise" />
          <small class="fh">Usado para analise semanal de colaboradores e tarefas de orquestracao.</small>
        </div>
      </section>

      <section class="panel">
        <h3 class="ph">Custos (USD por 1M tokens)</h3>
        <div class="row">
          <div class="fg">
            <label class="fl">Input</label>
            <input type="number" step="0.01" v-model.number="form.price_in_per_mtok" class="fi" :disabled="!isOwner" />
          </div>
          <div class="fg">
            <label class="fl">Output</label>
            <input type="number" step="0.01" v-model.number="form.price_out_per_mtok" class="fi" :disabled="!isOwner" />
          </div>
        </div>

        <div class="cost-preview">
          <div class="cp-line">
            <span class="cp-label">Analise tipica (50k in / 3k out)</span>
            <strong class="cp-val">${{ estimateCost(50000, 3000).toFixed(4) }}</strong>
          </div>
          <div class="cp-line">
            <span class="cp-label">1.000 analises/mes</span>
            <strong class="cp-val">${{ (estimateCost(50000, 3000) * 1000).toFixed(2) }}</strong>
          </div>
        </div>

        <h3 class="ph mt">Anotacoes</h3>
        <div class="fg">
          <textarea v-model="form.notes" class="fi fi-ta" rows="3" :disabled="!isOwner" placeholder="Motivo da escolha, restricoes, etc..."></textarea>
        </div>

        <h3 class="ph mt">Teste de conexao</h3>
        <div class="row">
          <button class="btn-sec" @click="testar" :disabled="testing">
            {{ testing ? 'Testando...' : 'Testar conexao' }}
          </button>
        </div>
        <div v-if="testResult" class="test-result" :class="{ ok: testResult.ok, fail: !testResult.ok }">
          <template v-if="testResult.ok">
            <strong>OK</strong> — {{ testResult.provider }} / {{ testResult.model }}
            — latencia {{ testResult.latency_ms }}ms
            <div v-if="testResult.response" class="tr-resp">resposta: {{ testResult.response }}</div>
          </template>
          <template v-else>
            <strong>Falhou</strong> — {{ testResult.error }}
          </template>
        </div>
      </section>

      <section class="panel panel-wide">
        <h3 class="ph">Metadados</h3>
        <div class="meta-grid">
          <div>
            <span class="meta-l">Provider ativo</span>
            <strong>{{ current?.provider || '-' }}</strong>
          </div>
          <div>
            <span class="meta-l">Atualizado em</span>
            <strong>{{ fmtDate(current?.updated_at) }}</strong>
          </div>
          <div>
            <span class="meta-l">Atualizado por</span>
            <strong>{{ current?.updated_by_name || current?.updated_by_email || '-' }}</strong>
          </div>
        </div>
      </section>
    </div>

    <p v-if="saveError" class="err-msg">{{ saveError }}</p>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick, watch } from 'vue'
import { useAuthStore } from '../../../stores/auth.js'

const ADMIN_OWNER_EMAIL = 'ferramenta.ferraz@v4company.com'

const auth = useAuthStore()
const isOwner = computed(() => String(auth.user?.email || '').toLowerCase() === ADMIN_OWNER_EMAIL)

const current = ref(null)
const providers = ref([])
const defaults = ref({})
const loading = ref(true)
const saving = ref(false)
const testing = ref(false)
const saveError = ref('')
const testResult = ref(null)

const form = reactive({
  provider: 'openai',
  model_analysis: '',
  model_note: '',
  model_coordinator: '',
  price_in_per_mtok: 0,
  price_out_per_mtok: 0,
  notes: ''
})

const initialSnapshot = ref('')
const dirty = computed(() => JSON.stringify(form) !== initialSnapshot.value)

function labelProvider(p) {
  if (p === 'openai') return 'OpenAI'
  if (p === 'openrouter') return 'OpenRouter (DeepSeek, Qwen, etc)'
  return p
}

function syncForm(cfg) {
  form.provider           = cfg.provider || 'openai'
  form.model_analysis     = cfg.model_analysis || ''
  form.model_note         = cfg.model_note || ''
  form.model_coordinator  = cfg.model_coordinator || ''
  form.price_in_per_mtok  = Number(cfg.price_in_per_mtok) || 0
  form.price_out_per_mtok = Number(cfg.price_out_per_mtok) || 0
  form.notes              = cfg.notes || ''
  initialSnapshot.value   = JSON.stringify(form)
}

async function load() {
  loading.value = true
  try {
    const res = await fetch('/api/admin/ai-provider')
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    current.value = data.config
    providers.value = data.providers || []
    defaults.value = data.defaults || {}
    syncForm(data.config)
  } catch (err) {
    saveError.value = 'Erro carregando config: ' + err.message
  } finally {
    loading.value = false
    await nextTick()
    if (window.lucide) window.lucide.createIcons()
  }
}

function onProviderChange() {
  const d = defaults.value[form.provider]
  if (!d) return
  // Auto-preenche modelos/precos com defaults do provider escolhido (mas so sugere — user pode sobrepor)
  form.model_analysis     = d.model_analysis || ''
  form.model_note         = d.model_note || ''
  form.price_in_per_mtok  = Number(d.price_in_per_mtok) || 0
  form.price_out_per_mtok = Number(d.price_out_per_mtok) || 0
}

function estimateCost(tokensIn, tokensOut) {
  const pin  = Number(form.price_in_per_mtok)  || 0
  const pout = Number(form.price_out_per_mtok) || 0
  return (tokensIn * pin + tokensOut * pout) / 1_000_000
}

async function save() {
  saving.value = true
  saveError.value = ''
  try {
    const res = await fetch('/api/admin/ai-provider', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: form.provider,
        model_analysis: form.model_analysis,
        model_note: form.model_note,
        model_coordinator: form.model_coordinator || null,
        price_in_per_mtok: form.price_in_per_mtok,
        price_out_per_mtok: form.price_out_per_mtok,
        notes: form.notes
      })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
    current.value = data.config
    syncForm(data.config)
  } catch (err) {
    saveError.value = 'Erro salvando: ' + err.message
  } finally {
    saving.value = false
  }
}

async function testar() {
  testing.value = true
  testResult.value = null
  try {
    const res = await fetch('/api/admin/ai-provider/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: form.provider, model: form.model_analysis })
    })
    const data = await res.json()
    testResult.value = res.ok ? { ok: true, ...data } : { ok: false, error: data.error || 'Falha' }
  } catch (err) {
    testResult.value = { ok: false, error: err.message }
  } finally {
    testing.value = false
  }
}

function fmtDate(iso) {
  if (!iso) return '-'
  try { return new Date(iso).toLocaleString('pt-BR') } catch { return '-' }
}

watch(() => form.provider, () => {
  // quando muda provider, reinicializa test result
  testResult.value = null
})

onMounted(load)
</script>

<style scoped>
.tab-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; gap: 16px; flex-wrap: wrap; }
.tab-title { font-size: 18px; font-weight: 600; color: #fff; margin: 0 0 4px; }
.tab-sub { font-size: 13px; color: #888; margin: 0; max-width: 640px; line-height: 1.5; }

.owner-banner {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 14px 16px; margin-bottom: 20px;
  background: rgba(255,200,0,0.06);
  border: 1px solid rgba(255,200,0,0.2);
  border-left: 3px solid #ffcc00;
  border-radius: 4px;
}
.ob-icon { width: 20px; height: 20px; color: #ffcc00; flex-shrink: 0; margin-top: 2px; }
.owner-banner strong { color: #fff; font-size: 14px; display: block; }
.owner-banner p { color: #aaa; font-size: 12px; margin: 2px 0 0; }

.loading { color: #888; padding: 32px 0; text-align: center; }

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.panel {
  background: #141414;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 6px;
  padding: 20px;
}
.panel-wide { grid-column: 1 / -1; }
.ph { font-size: 12px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 14px; }
.ph.mt { margin-top: 20px; }

.fg { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.fl { font-size: 12px; font-weight: 500; color: #ccc; text-transform: uppercase; letter-spacing: 0.04em; }
.fi { background: #1a1a1a; border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; padding: 10px 12px; font-size: 13px; color: #fff; font-family: inherit; outline: none; transition: border-color 0.15s; }
.fi:focus { border-color: rgba(255,0,0,0.4); }
.fi:disabled { opacity: 0.5; cursor: not-allowed; }
.fi option { background: #1a1a1a; color: #fff; }
.fi-ta { resize: vertical; min-height: 70px; font-family: inherit; }
.fh { font-size: 11px; color: #777; line-height: 1.4; }
.fh code { background: rgba(255,255,255,0.06); padding: 1px 5px; border-radius: 2px; color: #ff8888; font-size: 10px; }

.row { display: flex; gap: 12px; align-items: flex-end; }
.row .fg { flex: 1; margin-bottom: 0; }

.cost-preview {
  background: #0f0f0f;
  border: 1px solid rgba(255,255,255,0.04);
  border-radius: 4px;
  padding: 12px 14px;
  margin: 14px 0 4px;
}
.cp-line { display: flex; justify-content: space-between; font-size: 12px; padding: 2px 0; }
.cp-label { color: #888; }
.cp-val { color: #4ade80; font-variant-numeric: tabular-nums; }

.btn-pri { background: #ff0000; color: #fff; border: none; border-radius: 4px; padding: 9px 18px; font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer; transition: background 0.15s; }
.btn-pri:hover:not(:disabled) { background: #cc0000; }
.btn-pri:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-sec { background: rgba(255,255,255,0.04); color: #ccc; border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 8px 16px; font-size: 12px; font-family: inherit; cursor: pointer; transition: background 0.15s; }
.btn-sec:hover:not(:disabled) { background: rgba(255,255,255,0.08); }

.test-result {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.5;
}
.test-result.ok { background: rgba(74,222,128,0.08); border: 1px solid rgba(74,222,128,0.2); color: #4ade80; }
.test-result.fail { background: rgba(255,0,0,0.08); border: 1px solid rgba(255,0,0,0.2); color: #ff6666; }
.tr-resp { margin-top: 4px; color: #888; font-family: ui-monospace, monospace; font-size: 11px; }

.meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
.meta-l { display: block; font-size: 11px; color: #666; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.04em; }
.meta-grid strong { color: #fff; font-size: 13px; }

.err-msg { margin-top: 16px; padding: 10px 12px; background: rgba(255,0,0,0.06); border: 1px solid rgba(255,0,0,0.15); border-radius: 4px; color: #ff6666; font-size: 12px; }

@media (max-width: 900px) {
  .grid { grid-template-columns: 1fr; }
}
</style>
