// scripts/verify-google-chat.js
// Diagnostico passo-a-passo da config Google Chat. Uso:
//   node scripts/verify-google-chat.js

import 'dotenv/config'
import { GoogleAuth } from 'google-auth-library'

function step(n, msg) { console.log(`\n[${n}] ${msg}`) }
function ok(msg) { console.log(`  ✓ ${msg}`) }
function fail(msg) { console.log(`  ✗ ${msg}`); process.exit(1) }

step(1, 'Variavel GOOGLE_CHAT_SERVICE_ACCOUNT_KEY presente?')
const b64 = process.env.GOOGLE_CHAT_SERVICE_ACCOUNT_KEY
if (!b64) fail('GOOGLE_CHAT_SERVICE_ACCOUNT_KEY vazia no .env')
ok(`encontrada (${b64.length} chars)`)
if (/\s/.test(b64)) console.log(`  ⚠️  contem whitespace (espaco/newline) — isso frequentemente quebra o parse. Regenere.`)
if (b64.startsWith('"') || b64.startsWith("'")) console.log(`  ⚠️  comeca com aspas — possivel problema de parse do dotenv.`)

step(2, 'Decodar base64 -> JSON')
let json
try {
  const decoded = Buffer.from(b64, 'base64').toString('utf8')
  json = JSON.parse(decoded)
  ok('base64 -> JSON OK')
} catch (err) {
  fail(`falha: ${err.message}\n  Dica: regenere com:\n    node -e "console.log(require('fs').readFileSync('caminho/do/arquivo.json').toString('base64'))"`)
}

step(3, 'Validar campos essenciais do JSON')
const required = ['type', 'project_id', 'private_key', 'client_email', 'private_key_id']
for (const f of required) if (!json[f]) fail(`campo "${f}" ausente`)
ok(`type=${json.type}`)
ok(`project_id=${json.project_id}`)
ok(`client_email=${json.client_email}`)
ok(`private_key_id=${json.private_key_id.slice(0, 8)}...`)

step(4, 'Validar formato da private_key (PEM)')
const pk = json.private_key
if (!pk.startsWith('-----BEGIN PRIVATE KEY-----')) fail('private_key NAO comeca com -----BEGIN PRIVATE KEY-----')
if (!pk.trimEnd().endsWith('-----END PRIVATE KEY-----')) fail('private_key NAO termina com -----END PRIVATE KEY-----')
if (pk.includes('\\n')) {
  console.log(`  ⚠️  private_key contem "\\n" literais em vez de newlines reais — ESTE e o erro 1E08010C`)
  fail('Regenere o base64 a partir do arquivo JSON original (sem editar).')
}
const lines = pk.split('\n').filter(Boolean)
if (lines.length < 10) fail(`private_key com poucas linhas (${lines.length}) — provavelmente truncada`)
ok(`formato PEM OK (${lines.length} linhas)`)

step(5, 'Autenticar via GoogleAuth + obter access_token')
try {
  const auth = new GoogleAuth({
    credentials: json,
    scopes: [
      'https://www.googleapis.com/auth/chat.spaces.readonly',
      'https://www.googleapis.com/auth/chat.messages.create',
      'https://www.googleapis.com/auth/chat.bot'
    ]
  })
  const client = await auth.getClient()
  const tokenRes = await client.getAccessToken()
  if (!tokenRes?.token) fail('getAccessToken retornou vazio')
  ok(`access_token obtido (${tokenRes.token.length} chars)`)

  step(6, 'Chamar Chat API: GET /v1/spaces')
  const res = await client.request({ url: 'https://chat.googleapis.com/v1/spaces?pageSize=10' })
  const spaces = res.data?.spaces || []
  ok(`listSpaces retornou ${spaces.length} space(s)`)
  if (spaces.length === 0) {
    console.log(`  ⚠️  nenhum space encontrado. O bot ainda nao foi ADICIONADO em nenhum space do Chat.`)
    console.log(`  Abra o Google Chat, entre em um space, "+ Adicionar pessoas e apps", busque pelo nome do seu app e adicione.`)
  } else {
    console.log('  Spaces encontrados:')
    for (const s of spaces.slice(0, 5)) console.log(`    - ${s.name}  (${s.displayName || s.spaceType})`)
  }
  console.log('\n✓ Configuracao do Google Chat esta VALIDA.')
} catch (err) {
  console.log(`\n✗ Autenticacao/API falhou: ${err.message}`)
  if (err.message?.includes('Chat API has not been used')) {
    console.log(`  Ative em: https://console.cloud.google.com/apis/library/chat.googleapis.com?project=${json.project_id}`)
  }
  if (err.message?.includes('DECODER')) {
    console.log(`  Erro de decode — private_key mal-formada. Regere o base64 do arquivo JSON sem editar.`)
  }
  process.exit(1)
}
