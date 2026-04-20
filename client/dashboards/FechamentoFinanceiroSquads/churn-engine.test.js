/**
 * Testes do Revenue Churn Engine
 * Rodar: node client/dashboards/FechamentoFinanceiroSquads/churn-engine.test.js
 */

import assert from 'node:assert/strict'
import {
  buildClientTimeline,
  detectSquadTransitions,
  classifyEvents,
  aggregateByMonth,
  aggregateBySquad,
  processChurnData,
  EVENT_CHURN,
  EVENT_DOWNSELL,
  EVENT_ISENCAO_TOTAL,
  EVENT_ISENCAO_PARCIAL
} from './churn-engine.js'
import { MOCK_DATA } from './mock-data.js'

// ---------------------------------------------------------------------------
// Helpers de teste
// ---------------------------------------------------------------------------

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    passed++
    console.log(`  ✓ ${name}`)
  } catch (err) {
    failed++
    console.log(`  ✗ ${name}`)
    console.log(`    ${err.message}`)
  }
}

function suite(name, fn) {
  console.log(`\n${name}`)
  fn()
}

/** Cria uma linha de mock com renovacao */
function makeRow(mesAno, cliente, squad, renovacao, extras = {}) {
  return {
    'Mes/Ano': mesAno,
    'Nome do cliente': cliente,
    'Squad': squad,
    '1.2.01 Renovação | [Saber] BR': 0,
    '1.2.03 Renovação | [Executar] BR': renovacao,
    '1.2.07 Renovação | [Executar] USA': 0,
    ...extras
  }
}

/** Filtra eventos de um cliente especifico */
function eventsFor(events, clientePartial) {
  return events.filter(e => e.cliente.includes(clientePartial))
}

// ===========================================================================
// PARTE 1 — Validacao dos 5 casos de referencia (mock data real)
// ===========================================================================

suite('Validacao com mock data — 5 casos de referencia', () => {
  const { timeline, transitions, events } = processChurnData(MOCK_DATA)

  // 1. MEGA COFFE — isencao parcial em fev/2026
  // jan/2026: ROI EAGLES, R$ 2852.6
  // fev/2026: GROWTHX, R$ 1662.6 (transicao + queda)
  // mar/2026: GROWTHX, R$ 2852.6 (volta ao valor)
  test('MEGA COFFE: isencao parcial em fev/2026', () => {
    const megaEvents = eventsFor(events, 'MEGA COFFE')
    const fevEvent = megaEvents.find(e => e.mes === 'fevereiro/2026')
    assert.ok(fevEvent, 'Deve ter evento em fev/2026')
    assert.equal(fevEvent.tipo, EVENT_ISENCAO_PARCIAL)
    assert.equal(fevEvent.valor, 1190)
    assert.equal(fevEvent.squad, '8 - ROI EAGLES')
  })

  // 2. EXTINSETO — downsell em mar/2026
  // fev/2026: ASSEMBLE, R$ 6800
  // mar/2026: ASSEMBLE, R$ 3145 (reducao permanente)
  test('EXTINSETO: downsell em mar/2026', () => {
    const extEvents = eventsFor(events, 'EXTINSETO')
    const marEvent = extEvents.find(e => e.mes === 'março/2026' && e.tipo === EVENT_DOWNSELL)
    assert.ok(marEvent, 'Deve ter downsell em mar/2026')
    assert.equal(marEvent.valor, 3655)
    assert.equal(marEvent.squad, 'ASSEMBLE')
  })

  // 3. EXTINSETO — downsell em abr/2026 (transicao ASSEMBLE → (sem squad))
  // mar/2026: ASSEMBLE, R$ 3145
  // abr/2026: (sem squad), R$ 467.5 (transicao + queda)
  test('EXTINSETO: downsell em abr/2026 (transicao)', () => {
    const extEvents = eventsFor(events, 'EXTINSETO')
    const abrEvent = extEvents.find(e => e.mes === 'abril/2026' && e.tipo === EVENT_DOWNSELL)
    assert.ok(abrEvent, 'Deve ter downsell em abr/2026')
    assert.equal(abrEvent.valor, 2677.5)
    assert.equal(abrEvent.squad, 'ASSEMBLE')
  })

  // 4. CAVICON — isencao total em dez/2025
  // nov/2025: ASSEMBLE, R$ 5950
  // dez/2025: R$ 0 (gap)
  // jan/2026: ASSEMBLE, R$ 5950 (volta)
  test('CAVICON: isencao total em dez/2025', () => {
    const cavEvents = eventsFor(events, 'CAVICON')
    const dezEvent = cavEvents.find(e => e.mes === 'dezembro/2025')
    assert.ok(dezEvent, 'Deve ter evento em dez/2025')
    assert.equal(dezEvent.tipo, EVENT_ISENCAO_TOTAL)
    assert.equal(dezEvent.valor, 5950)
    assert.equal(dezEvent.squad, 'ASSEMBLE')
  })

  // 5. AGROMANN — transicao neutra em fev/2026 (sem evento)
  // jan/2026: ROI EAGLES, R$ 4250
  // fev/2026: GROWTHX, R$ 4250 (mesmo valor, squad diferente)
  test('AGROMANN: transicao neutra (sem evento de churn)', () => {
    const agroEvents = eventsFor(events, 'AGROMANN')
    const fevEvent = agroEvents.find(e => e.mes === 'fevereiro/2026')
    assert.equal(fevEvent, undefined, 'Nao deve ter evento em fev/2026')
  })

  // 6. HIDRAUCAMBIO — transicao + churn absorve downsell (valor cheio)
  // jan/2026: ROI EAGLES, R$ 6800
  // fev/2026: GROWTHX, R$ 1360 (transicao + queda → downsell absorvido)
  // mar/2026+: R$ 0 (churn com valor cheio = 6800)
  test('HIDRAUCAMBIO: churn R$ 6800 (downsell absorvido no churn)', () => {
    const hidraEvents = eventsFor(events, 'HIDRAUCAMBIO')
    // Downsell foi absorvido — nao deve existir mais
    const fevDownsell = hidraEvents.find(e => e.mes === 'fevereiro/2026' && e.tipo === EVENT_DOWNSELL)
    assert.equal(fevDownsell, undefined, 'Downsell deve ser absorvido pelo churn')
    // Churn com valor cheio
    const churnEvt = hidraEvents.find(e => e.tipo === EVENT_CHURN)
    assert.ok(churnEvt, 'Deve ter evento de churn')
    assert.equal(churnEvt.valor, 6800, 'Churn deve ser o valor cheio (5440 + 1360)')
    assert.equal(churnEvt.squad, '8 - ROI EAGLES')
  })
})

// ===========================================================================
// PARTE 2 — Testes unitarios com dados sinteticos
// ===========================================================================

suite('Cliente estavel (mesmo valor todos os meses)', () => {
  const rows = [
    makeRow('janeiro/2026', 'ESTAVEL LTDA', 'SQUAD A', 5000),
    makeRow('fevereiro/2026', 'ESTAVEL LTDA', 'SQUAD A', 5000),
    makeRow('março/2026', 'ESTAVEL LTDA', 'SQUAD A', 5000),
    makeRow('abril/2026', 'ESTAVEL LTDA', 'SQUAD A', 5000)
  ]

  test('nenhum evento gerado', () => {
    const { events } = processChurnData(rows)
    assert.equal(events.length, 0)
  })
})

suite('Cliente estavel com variacao dentro da tolerancia (±10%)', () => {
  const rows = [
    makeRow('janeiro/2026', 'TOLERANCIA LTDA', 'SQUAD A', 5000),
    makeRow('fevereiro/2026', 'TOLERANCIA LTDA', 'SQUAD A', 4600), // -8%, dentro da tolerancia
    makeRow('março/2026', 'TOLERANCIA LTDA', 'SQUAD A', 5400),     // +17% vs jan, mas +17% vs fev
    makeRow('abril/2026', 'TOLERANCIA LTDA', 'SQUAD A', 5000)
  ]

  test('nenhum evento gerado (dentro de ±10%)', () => {
    const { events } = processChurnData(rows)
    assert.equal(events.length, 0)
  })
})

suite('Churn (2+ meses sem cobranca)', () => {
  const rows = [
    makeRow('janeiro/2026', 'CHURN LTDA', 'SQUAD A', 5000),
    makeRow('fevereiro/2026', 'CHURN LTDA', 'SQUAD A', 5000),
    // marco e abril: sem dados (zerados pelo gap-fill)
    // Ultimo mes do dataset precisa existir para definir o range
    makeRow('abril/2026', 'OUTRO CLIENTE', 'SQUAD A', 1000)
  ]

  test('churn registrado no ultimo mes com cobranca', () => {
    const { events } = processChurnData(rows)
    const churnEvt = events.find(e => e.cliente === 'CHURN LTDA' && e.tipo === EVENT_CHURN)
    assert.ok(churnEvt, 'Deve ter evento de churn')
    assert.equal(churnEvt.mes, 'fevereiro/2026')
    assert.equal(churnEvt.valor, 5000)
    assert.equal(churnEvt.squad, 'SQUAD A')
  })
})

suite('Isencao total (1 mes sem, volta)', () => {
  const rows = [
    makeRow('janeiro/2026', 'ISENTO TOTAL LTDA', 'SQUAD A', 5000),
    // fevereiro: sem dados (R$ 0 por gap-fill)
    makeRow('março/2026', 'ISENTO TOTAL LTDA', 'SQUAD A', 5000),
    makeRow('abril/2026', 'ISENTO TOTAL LTDA', 'SQUAD A', 5000)
  ]

  test('isencao total registrada no mes sem cobranca', () => {
    const { events } = processChurnData(rows)
    const isencaoEvt = events.find(e => e.cliente === 'ISENTO TOTAL LTDA')
    assert.ok(isencaoEvt, 'Deve ter evento')
    assert.equal(isencaoEvt.tipo, EVENT_ISENCAO_TOTAL)
    assert.equal(isencaoEvt.mes, 'fevereiro/2026')
    assert.equal(isencaoEvt.valor, 5000)
  })
})

suite('Isencao parcial (1 mes reduzido, volta)', () => {
  const rows = [
    makeRow('janeiro/2026', 'ISENTO PARCIAL LTDA', 'SQUAD A', 5000),
    makeRow('fevereiro/2026', 'ISENTO PARCIAL LTDA', 'SQUAD A', 2000), // reducao
    makeRow('março/2026', 'ISENTO PARCIAL LTDA', 'SQUAD A', 5000),     // volta
    makeRow('abril/2026', 'ISENTO PARCIAL LTDA', 'SQUAD A', 5000)
  ]

  test('isencao parcial com valor correto', () => {
    const { events } = processChurnData(rows)
    const isencaoEvt = events.find(e => e.cliente === 'ISENTO PARCIAL LTDA')
    assert.ok(isencaoEvt, 'Deve ter evento')
    assert.equal(isencaoEvt.tipo, EVENT_ISENCAO_PARCIAL)
    assert.equal(isencaoEvt.mes, 'fevereiro/2026')
    assert.equal(isencaoEvt.valor, 3000) // 5000 - 2000
  })
})

suite('Downsell (reducao permanente)', () => {
  const rows = [
    makeRow('janeiro/2026', 'DOWNSELL LTDA', 'SQUAD A', 5000),
    makeRow('fevereiro/2026', 'DOWNSELL LTDA', 'SQUAD A', 2000), // reducao
    makeRow('março/2026', 'DOWNSELL LTDA', 'SQUAD A', 2000),     // mantem
    makeRow('abril/2026', 'DOWNSELL LTDA', 'SQUAD A', 2000)
  ]

  test('downsell com valor correto', () => {
    const { events } = processChurnData(rows)
    const downsellEvt = events.find(e => e.cliente === 'DOWNSELL LTDA')
    assert.ok(downsellEvt, 'Deve ter evento')
    assert.equal(downsellEvt.tipo, EVENT_DOWNSELL)
    assert.equal(downsellEvt.mes, 'fevereiro/2026')
    assert.equal(downsellEvt.valor, 3000) // 5000 - 2000
  })
})

suite('Transicao de squad sem mudanca de valor', () => {
  const rows = [
    makeRow('janeiro/2026', 'TRANSICAO NEUTRA LTDA', 'SQUAD A', 4250),
    makeRow('fevereiro/2026', 'TRANSICAO NEUTRA LTDA', 'SQUAD B', 4250),
    makeRow('março/2026', 'TRANSICAO NEUTRA LTDA', 'SQUAD B', 4250),
    makeRow('abril/2026', 'TRANSICAO NEUTRA LTDA', 'SQUAD B', 4250)
  ]

  test('nenhum evento gerado (transicao neutra)', () => {
    const { events } = processChurnData(rows)
    const clientEvents = eventsFor(events, 'TRANSICAO NEUTRA')
    assert.equal(clientEvents.length, 0)
  })

  test('transicao detectada', () => {
    const { transitions } = processChurnData(rows)
    const t = transitions.find(t => t.cliente.includes('TRANSICAO NEUTRA'))
    assert.ok(t, 'Deve detectar transicao')
    assert.equal(t.squadAnterior, 'SQUAD A')
    assert.equal(t.squadAtual, 'SQUAD B')
    assert.equal(t.mesTransicao, 'fevereiro/2026')
  })
})

suite('Transicao de squad com downsell', () => {
  const rows = [
    makeRow('janeiro/2026', 'TRANSICAO DOWNSELL LTDA', 'SQUAD A', 6800),
    makeRow('fevereiro/2026', 'TRANSICAO DOWNSELL LTDA', 'SQUAD B', 1360),
    makeRow('março/2026', 'TRANSICAO DOWNSELL LTDA', 'SQUAD B', 1360),
    makeRow('abril/2026', 'TRANSICAO DOWNSELL LTDA', 'SQUAD B', 1360)
  ]

  test('downsell atribuido ao squad anterior', () => {
    const { events } = processChurnData(rows)
    const downsellEvt = events.find(e => e.cliente.includes('TRANSICAO DOWNSELL'))
    assert.ok(downsellEvt, 'Deve ter evento de downsell')
    assert.equal(downsellEvt.tipo, EVENT_DOWNSELL)
    assert.equal(downsellEvt.valor, 5440) // 6800 - 1360
    assert.equal(downsellEvt.squad, 'SQUAD A')
    assert.equal(downsellEvt.mes, 'fevereiro/2026')
  })
})

suite('Churn pos-transicao (1 mes = squad anterior)', () => {
  const rows = [
    makeRow('janeiro/2026', 'CHURN POS TRANS 1 LTDA', 'SQUAD A', 5000),
    makeRow('fevereiro/2026', 'CHURN POS TRANS 1 LTDA', 'SQUAD B', 5000),
    // marco: sem cobranca (1 mes apos transicao)
    // abril: sem cobranca (confirma churn)
    makeRow('abril/2026', 'OUTRO ANCORA', 'SQUAD X', 100)
  ]

  test('churn 1 mes apos transicao → squad anterior', () => {
    const { events } = processChurnData(rows)
    const churnEvt = events.find(e =>
      e.cliente.includes('CHURN POS TRANS 1') && e.tipo === EVENT_CHURN
    )
    assert.ok(churnEvt, 'Deve ter evento de churn')
    assert.equal(churnEvt.mes, 'fevereiro/2026')
    assert.equal(churnEvt.squad, 'SQUAD A', 'Churn 1 mes apos transicao = squad anterior')
    assert.equal(churnEvt.valor, 5000)
  })
})

suite('Churn pos-transicao (2+ meses = squad atual)', () => {
  const rows = [
    makeRow('janeiro/2026', 'CHURN POS TRANS 2 LTDA', 'SQUAD A', 5000),
    makeRow('fevereiro/2026', 'CHURN POS TRANS 2 LTDA', 'SQUAD B', 5000),
    makeRow('março/2026', 'CHURN POS TRANS 2 LTDA', 'SQUAD B', 5000),
    // abril: sem cobranca (2 meses apos transicao)
    // maio: sem cobranca (confirma churn)
    makeRow('maio/2026', 'OUTRO ANCORA 2', 'SQUAD X', 100)
  ]

  test('churn 2+ meses apos transicao → squad atual', () => {
    const { events } = processChurnData(rows)
    const churnEvt = events.find(e =>
      e.cliente.includes('CHURN POS TRANS 2') && e.tipo === EVENT_CHURN
    )
    assert.ok(churnEvt, 'Deve ter evento de churn')
    assert.equal(churnEvt.mes, 'março/2026')
    assert.equal(churnEvt.squad, 'SQUAD B', 'Churn 2+ meses apos transicao = squad atual')
    assert.equal(churnEvt.valor, 5000)
  })
})

suite('Cobranca proporcional no ultimo mes → churn com valor cheio', () => {
  const rows = [
    makeRow('janeiro/2026', 'PRORATED LTDA', 'SQUAD A', 5000),
    makeRow('fevereiro/2026', 'PRORATED LTDA', 'SQUAD A', 5000),
    makeRow('março/2026', 'PRORATED LTDA', 'SQUAD A', 1800), // proporcional
    // abril e maio: sem dados (churn confirmado)
    makeRow('maio/2026', 'OUTRO ANCORA', 'SQUAD X', 100)
  ]

  test('churn registrado com valor cheio (nao proporcional)', () => {
    const { events } = processChurnData(rows)
    const clientEvents = eventsFor(events, 'PRORATED')
    // Nao deve ter downsell (absorvido)
    const downsell = clientEvents.find(e => e.tipo === EVENT_DOWNSELL)
    assert.equal(downsell, undefined, 'Downsell deve ser absorvido pelo churn')
    // Churn com valor cheio
    const churn = clientEvents.find(e => e.tipo === EVENT_CHURN)
    assert.ok(churn, 'Deve ter evento de churn')
    assert.equal(churn.mes, 'março/2026')
    assert.equal(churn.valor, 5000, 'Churn deve ser 5000 (3200 downsell + 1800 churn)')
    assert.equal(churn.squad, 'SQUAD A')
  })
})

suite('Downsell permanente NAO e absorvido (sem churn depois)', () => {
  const rows = [
    makeRow('janeiro/2026', 'DOWNSELL PURO LTDA', 'SQUAD A', 5000),
    makeRow('fevereiro/2026', 'DOWNSELL PURO LTDA', 'SQUAD A', 2000),
    makeRow('março/2026', 'DOWNSELL PURO LTDA', 'SQUAD A', 2000),
    makeRow('abril/2026', 'DOWNSELL PURO LTDA', 'SQUAD A', 2000)
  ]

  test('downsell permanece quando nao ha churn', () => {
    const { events } = processChurnData(rows)
    const clientEvents = eventsFor(events, 'DOWNSELL PURO')
    assert.equal(clientEvents.length, 1)
    assert.equal(clientEvents[0].tipo, EVENT_DOWNSELL)
    assert.equal(clientEvents[0].valor, 3000)
  })
})

suite('Cliente em multiplos squads no mesmo mes', () => {
  const rows = [
    makeRow('janeiro/2026', 'MULTI SQUAD LTDA', 'SQUAD A', 3000),
    makeRow('janeiro/2026', 'MULTI SQUAD LTDA', 'SQUAD B', 2000),
    makeRow('fevereiro/2026', 'MULTI SQUAD LTDA', 'SQUAD A', 3000),
    makeRow('fevereiro/2026', 'MULTI SQUAD LTDA', 'SQUAD B', 2000),
    makeRow('março/2026', 'MULTI SQUAD LTDA', 'SQUAD A', 3000),
    makeRow('março/2026', 'MULTI SQUAD LTDA', 'SQUAD B', 2000)
  ]

  test('valores somados corretamente (5000 total por mes)', () => {
    const timeline = buildClientTimeline(rows)
    const entries = timeline.get('MULTI SQUAD LTDA')
    assert.ok(entries, 'Deve ter timeline')
    entries.forEach(e => {
      assert.equal(e.totalValue, 5000, `Mes ${e.mes} deve ter totalValue 5000`)
    })
  })

  test('squad primario e o de maior valor (SQUAD A)', () => {
    const timeline = buildClientTimeline(rows)
    const entries = timeline.get('MULTI SQUAD LTDA')
    entries.forEach(e => {
      assert.equal(e.squads.size, 2)
      assert.equal(e.squads.get('SQUAD A'), 3000)
      assert.equal(e.squads.get('SQUAD B'), 2000)
    })
  })

  test('nenhum evento de churn (estavel)', () => {
    const { events } = processChurnData(rows)
    const multiEvents = eventsFor(events, 'MULTI SQUAD')
    assert.equal(multiEvents.length, 0)
  })
})

// ===========================================================================
// PARTE 3 — Validacao consolidado vs squad
// ===========================================================================

suite('Consolidado vs por squad — totais consistentes', () => {
  const { events } = processChurnData(MOCK_DATA)

  test('soma por squad == consolidado para cada tipo de evento', () => {
    const consolidado = aggregateByMonth(events)
    const bySquad = aggregateBySquad(events)

    // Somar todos os squads
    let totalChurnSquads = 0, totalDownsellSquads = 0
    let totalIsencaoTotalSquads = 0, totalIsencaoParcialSquads = 0
    for (const [, entry] of bySquad) {
      totalChurnSquads += entry.churn
      totalDownsellSquads += entry.downsell
      totalIsencaoTotalSquads += entry.isencao_total
      totalIsencaoParcialSquads += entry.isencao_parcial
    }

    // Somar consolidado de todos os meses
    let totalChurnConsolidado = 0, totalDownsellConsolidado = 0
    let totalIsencaoTotalConsolidado = 0, totalIsencaoParcialConsolidado = 0
    for (const [, entry] of consolidado) {
      totalChurnConsolidado += entry.churn
      totalDownsellConsolidado += entry.downsell
      totalIsencaoTotalConsolidado += entry.isencao_total
      totalIsencaoParcialConsolidado += entry.isencao_parcial
    }

    // Arredondar para evitar floating point
    const r = v => Math.round(v * 100) / 100

    assert.equal(r(totalChurnSquads), r(totalChurnConsolidado),
      `Churn: squads(${r(totalChurnSquads)}) == consolidado(${r(totalChurnConsolidado)})`)
    assert.equal(r(totalDownsellSquads), r(totalDownsellConsolidado),
      `Downsell: squads(${r(totalDownsellSquads)}) == consolidado(${r(totalDownsellConsolidado)})`)
    assert.equal(r(totalIsencaoTotalSquads), r(totalIsencaoTotalConsolidado),
      `Isencao total: squads(${r(totalIsencaoTotalSquads)}) == consolidado(${r(totalIsencaoTotalConsolidado)})`)
    assert.equal(r(totalIsencaoParcialSquads), r(totalIsencaoParcialConsolidado),
      `Isencao parcial: squads(${r(totalIsencaoParcialSquads)}) == consolidado(${r(totalIsencaoParcialConsolidado)})`)
  })

  test('aggregateByMonth filtrado por squad == aggregateBySquad por squad', () => {
    const bySquad = aggregateBySquad(events)

    for (const [squad] of bySquad) {
      const byMonthFiltered = aggregateByMonth(events, squad)
      let churnSum = 0, downsellSum = 0
      for (const [, entry] of byMonthFiltered) {
        churnSum += entry.churn
        downsellSum += entry.downsell
      }

      const squadEntry = bySquad.get(squad)
      const r = v => Math.round(v * 100) / 100
      assert.equal(r(churnSum), r(squadEntry.churn),
        `Squad ${squad}: churn by month == by squad`)
      assert.equal(r(downsellSum), r(squadEntry.downsell),
        `Squad ${squad}: downsell by month == by squad`)
    }
  })
})

// ===========================================================================
// Resultado
// ===========================================================================

console.log(`\n${'='.repeat(50)}`)
console.log(`Resultado: ${passed} passed, ${failed} failed`)
console.log('='.repeat(50))
process.exit(failed > 0 ? 1 : 0)
