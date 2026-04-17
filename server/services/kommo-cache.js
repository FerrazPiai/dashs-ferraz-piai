// Shared cache dos leads Kommo — usado por torre-controle route E rag-engine.
// Evita dupla chamada a API para a mesma janela de 60s.

let _cache = null
let _at = 0
const TTL = 60_000

export function setKommoCache(data) {
  _cache = data
  _at = Date.now()
}

export function getKommoCache() {
  if (!_cache) return null
  if (Date.now() - _at > TTL) return null
  return _cache
}

export function isCacheFresh() {
  return _cache && Date.now() - _at <= TTL
}

export function getCachedLeadCustomFields(leadId) {
  const cache = getKommoCache()
  if (!cache) return null
  const lead = cache.leads?.find(l => String(l.id) === String(leadId))
  return lead?.custom_fields_values || null
}

export function invalidateKommoCache() {
  _cache = null
  _at = 0
}
