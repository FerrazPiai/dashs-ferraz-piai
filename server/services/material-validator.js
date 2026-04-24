// server/services/material-validator.js
//
// Valida se um lead tem materiais suficientes para ser analisado.
// Regras (decisao 2b da spec):
//   - Transcricao: obrigatoria em TODAS as fases. Sem ela -> nao analisa.
//   - Slides:      exigida em todas as fases. Sem -> analisa com warn.
//   - Miro/Figma:  exigidos APENAS em fase-3 e fase-5. Sem -> analisa com warn.

import { PHASE_FIELDS } from './kommo-client.js'

const FASES_ADVANCED_MATERIALS = new Set(['fase-3', 'fase-5'])

function getFieldValue(customFields, fieldId) {
  if (!Array.isArray(customFields)) return null
  const f = customFields.find((cf) => Number(cf.field_id) === Number(fieldId))
  if (!f) return null
  const v = Array.isArray(f.values) ? f.values[0]?.value : f.value
  if (v == null) return null
  const s = String(v).trim()
  return s.length > 0 ? s : null
}

/**
 * Valida materiais de um lead para uma fase especifica.
 * @param {object} params
 * @param {Array<{field_id:number|string, values?:Array, value?:any}>} params.customFields - custom_fields_values do Kommo
 * @param {string} params.faseSlug - 'kickoff' | 'fase-2' | 'fase-3' | 'fase-4' | 'fase-5'
 * @returns {{canAnalyze:boolean, missing:string[], severity:'block'|'warn'|'ok', reason?:string}}
 */
export function validateMaterials({ customFields, faseSlug }) {
  const mapping = PHASE_FIELDS[faseSlug]
  if (!mapping) {
    return { canAnalyze: false, missing: [], severity: 'block', reason: `fase desconhecida: ${faseSlug}` }
  }

  const missing = []
  const transcricao = mapping.transcricao ? getFieldValue(customFields, mapping.transcricao) : null
  const slides      = mapping.slides      ? getFieldValue(customFields, mapping.slides)      : null

  if (!transcricao) {
    return {
      canAnalyze: false,
      missing: ['transcricao'],
      severity: 'block',
      reason: 'sem transcricao (material obrigatorio)'
    }
  }

  if (!slides) missing.push('slides')

  if (FASES_ADVANCED_MATERIALS.has(faseSlug)) {
    const figma = mapping.figma ? getFieldValue(customFields, mapping.figma) : null
    const miro  = mapping.miro  ? getFieldValue(customFields, mapping.miro)  : null
    if (!figma) missing.push('figma')
    if (!miro) missing.push('miro')
  }

  if (missing.length === 0) {
    return { canAnalyze: true, missing: [], severity: 'ok' }
  }

  return {
    canAnalyze: true,
    missing,
    severity: 'warn',
    reason: `materiais opcionais ausentes: ${missing.join(', ')}`
  }
}

export default { validateMaterials }
