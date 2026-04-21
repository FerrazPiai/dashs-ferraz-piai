/**
 * Revenue Churn Engine
 * Calcula churn, downsell e isencao a partir dos dados de renovacao.
 * Referencia: specs/revenue-churn/REGRAS-CALCULO.md
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MONTH_NAMES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
]

const RENOVATION_KEYS = [
  '1.2.01 Renovação | [Saber] BR',
  '1.2.03 Renovação | [Executar] BR',
  '1.2.07 Renovação | [Executar] USA'
]

/** Tipos de evento */
const EVENT_CHURN = 'churn'
const EVENT_DOWNSELL = 'downsell'
const EVENT_ISENCAO_TOTAL = 'isencao_total'
const EVENT_ISENCAO_PARCIAL = 'isencao_parcial'

/** Tolerancia para "mesmo valor" (±10%) */
const TOLERANCE = 0.10

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseMonth(mesAno) {
  if (!mesAno) return { month: 0, year: 0, sortKey: 0 }
  const parts = mesAno.split('/')
  const monthName = parts[0]?.toLowerCase().trim()
  const year = parseInt(parts[1], 10) || 0
  const month = MONTH_NAMES.indexOf(monthName) + 1
  return { month, year, sortKey: year * 100 + month }
}

function monthLabel(sortKey) {
  const year = Math.floor(sortKey / 100)
  const month = sortKey % 100
  return `${MONTH_NAMES[month - 1]}/${year}`
}

function nextMonthKey(sortKey) {
  const year = Math.floor(sortKey / 100)
  const month = sortKey % 100
  return month === 12 ? (year + 1) * 100 + 1 : sortKey + 1
}

function monthDiff(sortKeyA, sortKeyB) {
  const yA = Math.floor(sortKeyA / 100), mA = sortKeyA % 100
  const yB = Math.floor(sortKeyB / 100), mB = sortKeyB % 100
  return (yB - yA) * 12 + (mB - mA)
}

function round2(v) {
  return Math.round(v * 100) / 100
}

function getRenovationValue(row) {
  let sum = 0
  for (const key of RENOVATION_KEYS) {
    const val = row[key]
    if (typeof val === 'number') sum += val
  }
  return sum
}

/** Retorna o squad com maior valor de renovacao no mes */
function getPrimarySquad(squads) {
  if (!squads || squads.size === 0) return null
  let best = null, bestVal = -Infinity
  for (const [squad, val] of squads) {
    if (val > bestVal) { bestVal = val; best = squad }
  }
  return best
}

// ---------------------------------------------------------------------------
// 1. buildClientTimeline
// ---------------------------------------------------------------------------

/**
 * Agrupa dados por cliente + mes, soma campos de renovacao, ordena cronologicamente.
 * Preenche gaps entre o primeiro mes com renovacao do cliente e o ultimo mes do dataset.
 *
 * @param {Array<Object>} rawRows - Dados brutos da API (linhas por cliente/mes)
 * @returns {Map<string, Array<{mes: string, sortKey: number, totalValue: number, squads: Map<string, number>}>>}
 */
function buildClientTimeline(rawRows) {
  const allMonthKeys = new Set()
  // clientName -> Map<sortKey, {totalValue, squads}>
  const clientMap = new Map()

  for (const row of rawRows) {
    const clientName = row['Nome do cliente']
    const squad = row['Squad'] || '(sem squad)'
    const mes = row['Mes/Ano']
    if (!clientName || !mes) continue

    const { sortKey } = parseMonth(mes)
    allMonthKeys.add(sortKey)

    const renovationValue = getRenovationValue(row)
    if (renovationValue === 0) continue

    if (!clientMap.has(clientName)) clientMap.set(clientName, new Map())
    const monthMap = clientMap.get(clientName)

    if (!monthMap.has(sortKey)) {
      monthMap.set(sortKey, { totalValue: 0, squads: new Map() })
    }
    const entry = monthMap.get(sortKey)
    entry.totalValue += renovationValue
    entry.squads.set(squad, (entry.squads.get(squad) || 0) + renovationValue)
  }

  const maxMonth = Math.max(...allMonthKeys)
  const timeline = new Map()

  for (const [clientName, monthMap] of clientMap) {
    const firstMonth = Math.min(...monthMap.keys())
    const entries = []

    let sk = firstMonth
    while (sk <= maxMonth) {
      const data = monthMap.get(sk)
      entries.push({
        mes: monthLabel(sk),
        sortKey: sk,
        totalValue: data ? round2(data.totalValue) : 0,
        squads: data ? data.squads : new Map()
      })
      sk = nextMonthKey(sk)
    }
    timeline.set(clientName, entries)
  }

  return timeline
}

// ---------------------------------------------------------------------------
// 2. detectSquadTransitions
// ---------------------------------------------------------------------------

/**
 * Identifica transicoes de squad por cliente.
 * Uma transicao ocorre quando o squad principal muda de um mes para outro,
 * desde que ambos os meses tenham renovacao > 0.
 *
 * @param {Map} timeline - Output de buildClientTimeline
 * @returns {Array<{cliente: string, mesTransicao: string, sortKey: number, squadAnterior: string, squadAtual: string, valorAnterior: number, valorAtual: number}>}
 */
function detectSquadTransitions(timeline) {
  const transitions = []

  for (const [clientName, entries] of timeline) {
    for (let i = 1; i < entries.length; i++) {
      const prev = entries[i - 1]
      const curr = entries[i]

      // Transicao so e detectada quando ambos os meses tem valor
      if (prev.totalValue === 0 || curr.totalValue === 0) continue

      const prevSquad = getPrimarySquad(prev.squads)
      const currSquad = getPrimarySquad(curr.squads)

      if (prevSquad && currSquad && prevSquad !== currSquad) {
        transitions.push({
          cliente: clientName,
          mesTransicao: curr.mes,
          sortKey: curr.sortKey,
          squadAnterior: prevSquad,
          squadAtual: currSquad,
          valorAnterior: prev.totalValue,
          valorAtual: curr.totalValue
        })
      }
    }
  }

  return transitions
}

// ---------------------------------------------------------------------------
// 3. classifyEvents
// ---------------------------------------------------------------------------

/**
 * Aplica arvore de decisao (churn, downsell, isencao parcial, isencao total, estavel)
 * para cada cliente/mes.
 *
 * Regras:
 * - Valor N == 0 por 1 mes e volta → isencao total
 * - Valor N == 0 por 2+ meses → churn
 * - Valor N < N-1 (>10%) por 1 mes e volta → isencao parcial
 * - Valor N < N-1 (>10%) permanente → downsell
 * - Transicao de squad nao e churn; se valor caiu na transicao → downsell do squad anterior
 * - Churn pos-transicao: 1 mes → squad anterior, 2+ meses → squad atual
 *
 * @param {Map} timeline - Output de buildClientTimeline
 * @param {Array} transitions - Output de detectSquadTransitions
 * @returns {Array<{cliente: string, mes: string, sortKey: number, tipo: string, valor: number, squad: string}>}
 */
function classifyEvents(timeline, transitions) {
  // Lookup: clientName -> Map<sortKey, transition>
  const transitionMap = new Map()
  for (const t of transitions) {
    if (!transitionMap.has(t.cliente)) transitionMap.set(t.cliente, new Map())
    transitionMap.get(t.cliente).set(t.sortKey, t)
  }

  const events = []

  for (const [clientName, entries] of timeline) {
    const clientTransitions = transitionMap.get(clientName) || new Map()
    let lastTransition = null

    for (let i = 1; i < entries.length; i++) {
      const prev = entries[i - 1]
      const curr = entries[i]
      const next = i < entries.length - 1 ? entries[i + 1] : null

      // Atualiza tracking de ultima transicao
      if (clientTransitions.has(curr.sortKey)) {
        lastTransition = clientTransitions.get(curr.sortKey)
      }

      // Sem valor anterior → sem referencia, ignorar
      if (prev.totalValue === 0) continue

      const isTransition = clientTransitions.has(curr.sortKey)

      // --- Mes de transicao ---
      if (isTransition) {
        const t = clientTransitions.get(curr.sortKey)

        // Transicao com queda de valor → downsell ou isencao parcial
        if (curr.totalValue < prev.totalValue * (1 - TOLERANCE)) {
          const returnsNextMonth = next && next.totalValue >= prev.totalValue * (1 - TOLERANCE)
          events.push({
            cliente: clientName,
            mes: curr.mes,
            sortKey: curr.sortKey,
            tipo: returnsNextMonth ? EVENT_ISENCAO_PARCIAL : EVENT_DOWNSELL,
            valor: round2(prev.totalValue - curr.totalValue),
            squad: t.squadAnterior
          })
        }
        // Transicao com mesmo valor ou aumento → neutro, sem evento
        continue
      }

      // --- Mes normal (sem transicao) ---
      const prevSquad = getPrimarySquad(prev.squads)

      if (curr.totalValue === 0) {
        // Valor zerou
        const returnsNextMonth = next && next.totalValue > 0
        const tipo = returnsNextMonth ? EVENT_ISENCAO_TOTAL : EVENT_CHURN

        // Atribuicao de churn pos-transicao (regra 3.3)
        let squad = prevSquad
        if (lastTransition) {
          const meses = monthDiff(lastTransition.sortKey, curr.sortKey)
          squad = meses <= 1 ? lastTransition.squadAnterior : lastTransition.squadAtual
        }

        // Churn e atribuido ao ultimo mes com valor (prev)
        // Isencao total e atribuida ao mes da lacuna (curr)
        const isChurn = tipo === EVENT_CHURN

        events.push({
          cliente: clientName,
          mes: isChurn ? prev.mes : curr.mes,
          sortKey: isChurn ? prev.sortKey : curr.sortKey,
          tipo,
          valor: round2(prev.totalValue),
          squad
        })
      } else if (curr.totalValue < prev.totalValue * (1 - TOLERANCE)) {
        // Reducao > 10%
        const returnsNextMonth = next && next.totalValue >= prev.totalValue * (1 - TOLERANCE)

        events.push({
          cliente: clientName,
          mes: curr.mes,
          sortKey: curr.sortKey,
          tipo: returnsNextMonth ? EVENT_ISENCAO_PARCIAL : EVENT_DOWNSELL,
          valor: round2(prev.totalValue - curr.totalValue),
          squad: prevSquad
        })
      }
      // Estavel (±10%) ou upsell → sem evento de churn
    }
  }

  return events
}

// ---------------------------------------------------------------------------
// 4. aggregateByMonth
// ---------------------------------------------------------------------------

/**
 * Agrega eventos por mes, opcionalmente filtrado por squad.
 * Retorna totais de churn/downsell/isencao e detalhamento por cliente.
 *
 * @param {Array} events - Output de classifyEvents
 * @param {string} [squad] - Filtrar por squad (undefined = consolidado)
 * @returns {Map<string, {churn: number, downsell: number, isencao_total: number, isencao_parcial: number, clients: Object}>}
 */
function aggregateByMonth(events, squad) {
  const map = new Map()

  for (const evt of events) {
    if (squad && evt.squad !== squad) continue

    if (!map.has(evt.mes)) {
      map.set(evt.mes, {
        churn: 0,
        downsell: 0,
        isencao_total: 0,
        isencao_parcial: 0,
        clients: { churn: [], downsell: [], isencao_total: [], isencao_parcial: [] }
      })
    }

    const entry = map.get(evt.mes)
    entry[evt.tipo] += evt.valor
    entry.clients[evt.tipo].push({
      cliente: evt.cliente,
      valor: evt.valor,
      squad: evt.squad
    })
  }

  // Arredondar e ordenar clientes por valor (decrescente)
  for (const [, entry] of map) {
    entry.churn = round2(entry.churn)
    entry.downsell = round2(entry.downsell)
    entry.isencao_total = round2(entry.isencao_total)
    entry.isencao_parcial = round2(entry.isencao_parcial)
    for (const tipo of Object.keys(entry.clients)) {
      entry.clients[tipo].sort((a, b) => b.valor - a.valor)
    }
  }

  return map
}

// ---------------------------------------------------------------------------
// 5. aggregateBySquad
// ---------------------------------------------------------------------------

/**
 * Agrega eventos por squad, opcionalmente filtrado por periodo.
 *
 * @param {Array} events - Output de classifyEvents
 * @param {Array<number>} [meses] - Filtrar por sortKeys de meses (undefined = todos)
 * @returns {Map<string, {churn: number, downsell: number, isencao_total: number, isencao_parcial: number}>}
 */
function aggregateBySquad(events, meses) {
  const mesSet = meses ? new Set(meses) : null
  const map = new Map()

  for (const evt of events) {
    if (mesSet && !mesSet.has(evt.sortKey)) continue

    const squad = evt.squad || '(sem squad)'
    if (!map.has(squad)) {
      map.set(squad, { churn: 0, downsell: 0, isencao_total: 0, isencao_parcial: 0 })
    }

    map.get(squad)[evt.tipo] += evt.valor
  }

  for (const [, entry] of map) {
    entry.churn = round2(entry.churn)
    entry.downsell = round2(entry.downsell)
    entry.isencao_total = round2(entry.isencao_total)
    entry.isencao_parcial = round2(entry.isencao_parcial)
  }

  return map
}

// ---------------------------------------------------------------------------
// 6. mergeDownsellBeforeChurn
// ---------------------------------------------------------------------------

/**
 * Mescla downsells consecutivos seguidos de churn em um unico evento de churn.
 *
 * Quando o ultimo mes de servico tem cobranca proporcional (prorated), a engine
 * gera um downsell + churn. O valor real da perda e a soma dos dois (valor cheio).
 *
 * Condicoes para merge:
 * - Mesmo cliente
 * - Meses consecutivos (downsell em N, proximo evento em N+1)
 * - Mesmo squad de atribuicao
 * - Downsell imediatamente antes de churn (ou cadeia de downsells → churn)
 *
 * @param {Array} events - Output de classifyEvents
 * @returns {Array} Eventos com downsells absorvidos nos churns
 */
function mergeDownsellBeforeChurn(events) {
  const byClient = new Map()
  for (const evt of events) {
    if (!byClient.has(evt.cliente)) byClient.set(evt.cliente, [])
    byClient.get(evt.cliente).push(evt)
  }

  const toRemove = new Set()

  for (const [, clientEvents] of byClient) {
    clientEvents.sort((a, b) => a.sortKey - b.sortKey)

    for (let i = 0; i < clientEvents.length; i++) {
      if (clientEvents[i].tipo !== EVENT_CHURN) continue

      // Olhar para tras: downsells consecutivos antes do churn
      let j = i - 1
      while (j >= 0) {
        const prev = clientEvents[j]
        const next = clientEvents[j + 1]

        if (prev.tipo !== EVENT_DOWNSELL) break
        // Permite merge no mesmo mes (churn movido para prev) ou mes consecutivo
        if (prev.sortKey !== next.sortKey && nextMonthKey(prev.sortKey) !== next.sortKey) break
        if (prev.squad !== clientEvents[i].squad) break

        // Absorver downsell no churn
        clientEvents[i].valor = round2(clientEvents[i].valor + prev.valor)
        toRemove.add(prev)
        j--
      }
    }
  }

  return events.filter(evt => !toRemove.has(evt))
}

// ---------------------------------------------------------------------------
// Convenience: processa tudo de uma vez
// ---------------------------------------------------------------------------

/**
 * Processa dados brutos e retorna eventos classificados + agregacoes.
 *
 * @param {Array<Object>} rawRows - Dados brutos da API
 * @returns {{ timeline: Map, transitions: Array, events: Array }}
 */
function processChurnData(rawRows) {
  const timeline = buildClientTimeline(rawRows)
  const transitions = detectSquadTransitions(timeline)
  const events = classifyEvents(timeline, transitions)
  const mergedEvents = mergeDownsellBeforeChurn(events)
  return { timeline, transitions, events: mergedEvents }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  buildClientTimeline,
  detectSquadTransitions,
  classifyEvents,
  mergeDownsellBeforeChurn,
  aggregateByMonth,
  aggregateBySquad,
  processChurnData,
  parseMonth,
  monthLabel,
  nextMonthKey,
  monthDiff,
  getRenovationValue,
  RENOVATION_KEYS,
  EVENT_CHURN,
  EVENT_DOWNSELL,
  EVENT_ISENCAO_TOTAL,
  EVENT_ISENCAO_PARCIAL,
  TOLERANCE
}
