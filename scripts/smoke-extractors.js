// scripts/smoke-extractors.js
// Parity check dos extratores internos (Phase 04). Rodar fora do servidor.
//
// Uso:
//   node scripts/smoke-extractors.js --platform all --user-id 42 --urls tests/fixtures/urls.json
//   node scripts/smoke-extractors.js --platform figma,miro --urls tests/fixtures/urls.json
//
// Saida:
//   - scripts/smoke-output/<timestamp>-<platform>.json
//   - tabela final no stdout
//   - exit 0 (tudo ok) ou 1 (alguma plataforma falhou)

import 'dotenv/config'
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { dispatchExtractor } from '../server/services/extractors/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const OUT_DIR = join(__dirname, 'smoke-output')

function parseArgs(argv) {
  const args = { platform: 'all', userId: null, urls: null }
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i]
    const v = argv[i + 1]
    if (k === '--platform') { args.platform = v; i++ }
    else if (k === '--user-id') { args.userId = Number(v); i++ }
    else if (k === '--urls') { args.urls = v; i++ }
  }
  return args
}

function sha256(s) {
  return createHash('sha256').update(String(s || '')).digest('hex').slice(0, 16)
}

function ts() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

function needsUserId(platform) {
  return platform === 'transcricao' || platform === 'slides' || platform === 'reuniao'
}

async function runOne(platform, url, userId) {
  const started = Date.now()
  try {
    const res = await dispatchExtractor(platform, url, { userId })
    const ms = Date.now() - started
    const texto = res?.texto || ''
    return {
      platform,
      url,
      status: 'ok',
      ms,
      texto_len: texto.length,
      imagens_len: (res?.imagens || []).length,
      erros: (res?.erros || []).slice(0, 5),
      hash: sha256(texto),
      _meta: res?._meta || null
    }
  } catch (err) {
    return {
      platform,
      url,
      status: 'fail',
      ms: Date.now() - started,
      error: err.message || String(err),
      error_code: err.code || null
    }
  }
}

async function main() {
  const args = parseArgs(process.argv)
  if (!args.urls) {
    console.error('--urls <path> obrigatorio (JSON { platform: url })')
    process.exit(2)
  }
  if (!existsSync(args.urls)) {
    console.error(`arquivo nao encontrado: ${args.urls}`)
    process.exit(2)
  }
  const urlsMap = JSON.parse(readFileSync(args.urls, 'utf8'))
  const selected = args.platform === 'all'
    ? Object.keys(urlsMap)
    : String(args.platform).split(',').map(s => s.trim()).filter(Boolean)

  mkdirSync(OUT_DIR, { recursive: true })
  const stamp = ts()
  const results = []
  let anyFail = false

  for (const platform of selected) {
    const url = urlsMap[platform]
    if (!url) {
      console.warn(`[smoke] ${platform}: sem URL em ${args.urls} — pulando`)
      continue
    }
    if (needsUserId(platform) && !args.userId) {
      console.warn(`[smoke] ${platform}: requer --user-id (OAuth Google) — pulando`)
      results.push({ platform, url, status: 'skipped', reason: 'no_user_id' })
      continue
    }
    process.stdout.write(`[smoke] ${platform} ... `)
    const r = await runOne(platform, url, args.userId)
    if (r.status === 'ok') {
      console.log(`ok (${r.ms}ms, ${r.texto_len} chars, ${r.imagens_len} imgs, hash=${r.hash})`)
    } else {
      console.log(`FAIL (${r.ms}ms) — ${r.error}`)
      anyFail = true
    }
    const out = join(OUT_DIR, `${stamp}-${platform}.json`)
    writeFileSync(out, JSON.stringify(r, null, 2))
    results.push(r)
  }

  console.log('\n── Resumo ──')
  for (const r of results) {
    const status = r.status === 'ok' ? 'OK    ' : r.status === 'skipped' ? 'SKIP  ' : 'FAIL  '
    const extra = r.status === 'ok'
      ? `${r.ms}ms  ${r.texto_len}c  hash=${r.hash}`
      : r.error || r.reason || ''
    console.log(`${status} ${r.platform.padEnd(12)} ${extra}`)
  }

  process.exit(anyFail ? 1 : 0)
}

main().catch(err => {
  console.error('[smoke] erro fatal:', err)
  process.exit(1)
})
