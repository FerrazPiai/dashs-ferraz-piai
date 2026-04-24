// server/services/google-chat-client.js
//
// Cliente minimalista pra Google Chat API v1.
// Auth: service account (JSON em GOOGLE_CHAT_SERVICE_ACCOUNT_KEY como base64).
// Escopos: chat.spaces.readonly (list), chat.messages.create (send).
//
// O bot precisa ser ADICIONADO manualmente em cada space do Google Chat para aparecer em listSpaces()
// e para conseguir enviar mensagens. Isso e uma restricao da API do Google.
//
// Docs:
//   https://developers.google.com/chat/api/reference/rest/v1/spaces/list
//   https://developers.google.com/chat/api/reference/rest/v1/spaces.messages/create

import { GoogleAuth } from 'google-auth-library'

const CHAT_SCOPES = [
  'https://www.googleapis.com/auth/chat.spaces.readonly',
  'https://www.googleapis.com/auth/chat.messages.create',
  'https://www.googleapis.com/auth/chat.bot'
]

const CHAT_BASE = 'https://chat.googleapis.com/v1'

let _auth = null
let _client = null

function getCredentials() {
  const b64 = process.env.GOOGLE_CHAT_SERVICE_ACCOUNT_KEY
  if (!b64) {
    throw new Error('GOOGLE_CHAT_SERVICE_ACCOUNT_KEY nao configurada')
  }
  try {
    const json = Buffer.from(b64, 'base64').toString('utf8')
    return JSON.parse(json)
  } catch (err) {
    throw new Error(`GOOGLE_CHAT_SERVICE_ACCOUNT_KEY invalida (esperado JSON base64): ${err.message}`)
  }
}

async function getAuthClient() {
  if (_client) return _client
  const credentials = getCredentials()
  _auth = new GoogleAuth({ credentials, scopes: CHAT_SCOPES })
  _client = await _auth.getClient()
  return _client
}

async function chatFetch(path, options = {}) {
  const client = await getAuthClient()
  const url = path.startsWith('http') ? path : `${CHAT_BASE}${path}`
  const res = await client.request({
    url,
    method: options.method || 'GET',
    data: options.body,
    headers: options.headers
  })
  return res.data
}

/**
 * Lista os spaces onde o bot foi adicionado.
 * @returns {Promise<Array<{ name: string, displayName: string, type: string }>>}
 */
export async function listSpaces() {
  const all = []
  let pageToken = null
  do {
    const qs = new URLSearchParams({ pageSize: '100' })
    if (pageToken) qs.set('pageToken', pageToken)
    const data = await chatFetch(`/spaces?${qs.toString()}`)
    const spaces = Array.isArray(data.spaces) ? data.spaces : []
    for (const s of spaces) {
      all.push({
        name: s.name,
        displayName: s.displayName || s.name,
        type: s.spaceType || s.type || 'UNKNOWN'
      })
    }
    pageToken = data.nextPageToken || null
  } while (pageToken)
  return all
}

/**
 * Envia mensagem (texto simples) em um space.
 * @param {string} spaceName  Ex: "spaces/AAAABBBB"
 * @param {string} text       Markdown-like (Google Chat aceita *bold* _italic_)
 * @returns {Promise<object>} Resposta da API (inclui name/createTime)
 */
export async function sendTextMessage(spaceName, text) {
  if (!spaceName || typeof spaceName !== 'string') {
    throw new Error('spaceName invalido')
  }
  if (!text || typeof text !== 'string') {
    throw new Error('text invalido')
  }
  return chatFetch(`/${spaceName}/messages`, {
    method: 'POST',
    body: { text }
  })
}

/**
 * Healthcheck rapido — tenta listar 1 space.
 * @returns {Promise<{ok: boolean, error?: string, count?: number}>}
 */
export async function healthcheck() {
  try {
    const spaces = await listSpaces()
    return { ok: true, count: spaces.length }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

export default { listSpaces, sendTextMessage, healthcheck }
