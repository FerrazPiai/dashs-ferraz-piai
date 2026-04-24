// server/services/stage-detector.js
//
// Helper puro para comparar fases do Kommo.
// REGRA CANONICA: sempre comparar STAGE_TO_FASE[status_id].ordem, nunca status_id diretamente.
// IDs nao sao ordenaveis numericamente (ex: 100273444 > 99670920 mas tambem 99670916 e pre-projeto
// com id menor que 99670920). Ver spec em docs/superpowers/specs/2026-04-18-*.md

import { STAGE_TO_FASE, STAGE_PRE_PROJETO } from './kommo-client.js'

/**
 * Retorna a ordem da fase (1..6) ou null se pre-projeto / desconhecido.
 * @param {number|string|null|undefined} statusId
 * @returns {number|null}
 */
export function ordemOf(statusId) {
  if (statusId == null) return null
  const id = Number(statusId)
  if (STAGE_PRE_PROJETO.has(id)) return null
  return STAGE_TO_FASE[id]?.ordem ?? null
}

/**
 * Retorna info completa da fase ({ ordem, nome, slug }) ou null.
 * @param {number|string|null|undefined} statusId
 * @returns {{ordem:number, nome:string, slug:string}|null}
 */
export function faseInfo(statusId) {
  if (statusId == null) return null
  const id = Number(statusId)
  if (STAGE_PRE_PROJETO.has(id)) return null
  return STAGE_TO_FASE[id] ?? null
}

/**
 * Compara duas fases e retorna o tipo de transicao.
 * Retornos possiveis:
 *   - 'advanced'  : ordem subiu (ex: fase-2 -> fase-3)
 *   - 'regressed' : ordem desceu (ex: fase-3 -> fase-2)
 *   - 'same'     : mesma ordem (ou entrou em pipeline pela 1a vez com mesma fase)
 *   - 'entered'  : antes era null (pre-projeto/unknown) e agora tem ordem valida
 *   - 'exited'   : antes tinha ordem e agora e null (saiu do pipeline)
 *   - 'unknown'  : ambos null
 *
 * @param {number|string|null|undefined} oldStatusId
 * @param {number|string|null|undefined} newStatusId
 * @returns {'advanced'|'regressed'|'same'|'entered'|'exited'|'unknown'}
 */
export function compareStages(oldStatusId, newStatusId) {
  const oldOrd = ordemOf(oldStatusId)
  const newOrd = ordemOf(newStatusId)
  if (oldOrd == null && newOrd == null) return 'unknown'
  if (oldOrd == null && newOrd != null) return 'entered'
  if (oldOrd != null && newOrd == null) return 'exited'
  if (newOrd > oldOrd) return 'advanced'
  if (newOrd < oldOrd) return 'regressed'
  return 'same'
}
