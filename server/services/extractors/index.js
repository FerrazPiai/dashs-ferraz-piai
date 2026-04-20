// server/services/extractors/index.js
// Dispatcher central de extratores com feature flag INTERNAL_EXTRACTORS.
//
// Rota por plataforma (chave semantica do Kommo):
//   transcricao -> extractGoogleDoc  (requer userId OAuth)
//   slides      -> extractGoogleSlides (requer userId)
//   reuniao     -> extractGoogleSlides (requer userId)
//   figma       -> extractFigma (token central .env)
//   miro        -> extractMiro (token central .env)
//
// INTERNAL_EXTRACTORS (.env): csv de keys de grupo. Valores aceitos:
//   - "all" — todos internos
//   - "google" — transcricao/slides/reuniao via interno (Google APIs)
//   - "figma" — figma via interno
//   - "miro" — miro via interno
//   - "transcricao" — apenas google-docs via interno (granularidade fina)
// Qualquer plataforma NAO habilitada cai no fallbackN8n injetado pelo caller
// (evita dependencia circular com tc-analyzer.js).

import extractGoogleDoc from './google-docs.js'
import extractGoogleSlides from './google-slides.js'
import extractFigma from './figma.js'
import extractMiro from './miro.js'

const INTERNAL_PLATFORM_ROUTES = {
  transcricao: { key: 'transcricao', fn: extractGoogleDoc, requiresUser: true },
  slides:      { key: 'google',      fn: extractGoogleSlides, requiresUser: true },
  reuniao:     { key: 'google',      fn: extractGoogleSlides, requiresUser: true },
  figma:       { key: 'figma',       fn: extractFigma, requiresUser: false },
  miro:        { key: 'miro',        fn: extractMiro, requiresUser: false }
}

export function getEnabledPlatforms() {
  return (process.env.INTERNAL_EXTRACTORS || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
}

export function isPlatformInternal(platform) {
  const route = INTERNAL_PLATFORM_ROUTES[platform]
  if (!route) return false
  const enabled = getEnabledPlatforms()
  if (enabled.includes('all')) return true
  if (enabled.includes(route.key)) return true
  // Tambem permite habilitar plataforma individualmente pelo nome exato
  if (enabled.includes(platform)) return true
  return false
}

export async function dispatchExtractor(platform, url, { userId, fallbackN8n } = {}) {
  const route = INTERNAL_PLATFORM_ROUTES[platform]
  if (route && isPlatformInternal(platform)) {
    if (route.requiresUser && !userId) {
      throw new Error(`dispatchExtractor: platform "${platform}" interno requer userId`)
    }
    return route.fn(url, { userId })
  }
  if (typeof fallbackN8n !== 'function') {
    throw new Error(`dispatchExtractor: sem rota para "${platform}" e fallbackN8n ausente`)
  }
  return fallbackN8n(url, platform)
}

export default { dispatchExtractor, isPlatformInternal, getEnabledPlatforms }
