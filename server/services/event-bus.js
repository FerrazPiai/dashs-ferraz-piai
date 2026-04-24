// server/services/event-bus.js
//
// EventEmitter singleton in-process para desacoplar emissores (kommo-sync, tc-analyzer)
// de consumidores (alert-dispatcher, auto-analyzer).
//
// Nao e persistido — se o processo reiniciar entre emit e handle, o evento se perde.
// A idempotencia de alerta vem do fingerprint UNIQUE em tc_alert_dispatch_log, nao daqui.
//
// Eventos definidos:
//   - 'lead.stage_advanced'             { leadId, oldStatusId, newStatusId, oldOrdem, newOrdem, faseInfo }
//   - 'lead.stage_regressed'            { leadId, oldStatusId, newStatusId, oldOrdem, newOrdem }
//   - 'analysis.bad_quality'            { leadId, faseSlug, analiseId, missing[], motivo }
//   - 'analysis.skipped_no_transcription' { leadId, faseSlug, missing[] }

import { EventEmitter } from 'node:events'

class AlertEventBus extends EventEmitter {
  constructor() {
    super()
    this.setMaxListeners(50)
  }
}

const bus = new AlertEventBus()

// Log basico de todos os eventos emitidos (util pra debug em dev)
if (process.env.NODE_ENV !== 'production') {
  bus.on('newListener', (evt) => {
    console.log(`[${new Date().toISOString()}] [event-bus] listener registrado: ${evt}`)
  })
}

// Wrapper com try/catch pra consumidores nao derrubarem a thread
bus.emitSafe = function (event, payload) {
  try {
    console.log(`[${new Date().toISOString()}] [event-bus] emit ${event}`, {
      leadId: payload?.leadId,
      faseSlug: payload?.faseSlug
    })
    this.emit(event, payload)
  } catch (err) {
    console.error(`[${new Date().toISOString()}] [event-bus] erro ao emitir ${event}:`, err.message)
  }
}

export default bus
