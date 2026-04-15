<template>
  <div class="funnel-table-wrap">
    <div class="table-scroll">
      <table class="funnel-table">
        <thead>
          <tr>
            <th class="col-tier col-sticky">Tier <span class="th-hint" data-tip="Porte da empresa prospectada">?</span></th>
            <th class="col-center">Investimento <span class="th-hint" data-tip="Investimento no período">?</span></th>
            <th class="col-center">CPL <span class="th-hint" :data-tip="cplTooltip">?</span></th>
            <th class="col-num">Prospects <span class="th-hint" data-tip="Total de leads captados">?</span></th>
            <th class="col-cr">CR1% <span class="th-hint" data-tip="Conversão de Prospect para MQL">?</span></th>
            <th class="col-num">MQL <span class="th-hint" data-tip="Leads qualificados pelo marketing">?</span></th>
            <th class="col-cr">CR2% <span class="th-hint" data-tip="Conversão de MQL para SQL">?</span></th>
            <th class="col-num">SQL <span class="th-hint" data-tip="Leads com reunião agendada">?</span></th>
            <th class="col-cr">CR3% <span class="th-hint" data-tip="Conversão de SQL para SAL">?</span></th>
            <th class="col-num">SAL <span class="th-hint" data-tip="Reuniões efetivamente realizadas">?</span></th>
            <th class="col-cr">CR4% <span class="th-hint" data-tip="Conversão de SAL para Commit">?</span></th>
            <th class="col-num">Commit <span class="th-hint" data-tip="Contratos assinados">?</span></th>
            <th class="col-cr">Hit Rate <span class="th-hint" data-tip="Conversão direta de MQL para contrato fechado">?</span></th>
            <th class="col-money">Avg Ticket <span class="th-hint th-hint--right" data-tip="Valor médio por contrato (Fee Rec + Fee OT) / Commits">?</span></th>
            <th class="col-money">Fee <span class="th-hint th-hint--right" data-tip="Fee Recorrente + Fee One Time">?</span></th>
            <th class="col-money">Avg Booking <span class="th-hint th-hint--right" data-tip="Booking médio por contrato (TCV / Commits)">?</span></th>
            <th class="col-money">Booking <span class="th-hint th-hint--right" data-tip="Receita total contratada (TCV)">?</span></th>
            <th class="col-center">ROAS Booking <span class="th-hint th-hint--right" data-tip="TCV / Investimento">?</span></th>
            <th class="col-center">ROAS Direto <span class="th-hint th-hint--right" data-tip="Fee / Investimento">?</span></th>
            <th class="col-num">LT Médio <span class="th-hint th-hint--right" data-tip="Lead Time médio em meses">?</span></th>
            <th class="col-money">LTV <span class="th-hint th-hint--right" data-tip="Lifetime Value (Fee médio × LT em meses)">?</span></th>
            <th class="col-num">AQL Mon. <span class="th-hint th-hint--right" data-tip="Account Qualified Lead — Oportunidades mapeadas de monetização">?</span></th>
            <th class="col-cr">CR5% <span class="th-hint th-hint--right" data-tip="Conversão AQL → SQL Monetização">?</span></th>
            <th class="col-num">SQL Mon. <span class="th-hint th-hint--right" data-tip="Reunião Agendada — Reuniões agendadas de monetização">?</span></th>
            <th class="col-cr">CR6% <span class="th-hint th-hint--right" data-tip="Conversão SQL → SAL Monetização">?</span></th>
            <th class="col-num">SAL Mon. <span class="th-hint th-hint--right" data-tip="Reunião Realizada — Reuniões realizadas de monetização">?</span></th>
            <th class="col-cr">CR7% <span class="th-hint th-hint--right" data-tip="Conversão SAL → Commit Monetização">?</span></th>
            <th class="col-num">Commit Mon. <span class="th-hint th-hint--right" data-tip="Venda concretizada de monetização">?</span></th>
            <th class="col-cr">Hit Rate Mon. <span class="th-hint th-hint--right" data-tip="Conversão direta de AQL para venda concretizada de monetização">?</span></th>
            <th class="col-money">Avg Ticket Mon. <span class="th-hint th-hint--right" data-tip="Ticket médio de monetização (Fee Rec Mon + Fee OT Mon) / Commits Mon">?</span></th>
            <th class="col-money">Fee Mon. <span class="th-hint th-hint--right" data-tip="Fee Recorrente Mon + Fee One Time Mon">?</span></th>
            <th class="col-money">Avg Booking Mon. <span class="th-hint th-hint--right" data-tip="Booking médio monetização (Booking Monet. / Commits Mon.)">?</span></th>
            <th class="col-money">Booking Monet. <span class="th-hint th-hint--right" data-tip="Booking de monetização (TCV)">?</span></th>
          </tr>
        </thead>
        <tbody v-if="loading">
          <tr v-for="i in 6" :key="i" class="skeleton-row">
            <td v-for="j in 33" :key="j"><div class="skeleton-cell"></div></td>
          </tr>
        </tbody>
        <tbody v-else>
          <template v-for="row in tiers" :key="row.tier">
            <!-- Empty row (Sem mapeamento) -->
            <tr v-if="row.isEmptyRow" class="tier-row empty-row">
              <td class="col-tier col-sticky">
                <span class="expand-placeholder"></span>
                {{ row.tier }}
              </td>
              <td class="col-center">{{ fmtMoney(row.investimento) }}</td>
              <td class="col-center">{{ fmtCpl(row.investimento, row.leads) }}</td>
              <td class="col-num">{{ formatNumber(row.leads) }}</td>
              <td class="col-cr">—</td>
              <td class="col-num">{{ formatNumber(row.mql) }}</td>
              <td class="col-cr">—</td>
              <td class="col-num">—</td>
              <td class="col-cr">—</td>
              <td class="col-num">—</td>
              <td class="col-cr">—</td>
              <td class="col-num">—</td>
              <td class="col-cr">—</td>
              <td class="col-money">—</td>
              <td class="col-money">—</td>
              <td class="col-money">—</td>
              <td class="col-money">—</td>
              <td class="col-center">{{ fmtRoas(row.roas_booking) }}</td>
              <td class="col-center">{{ fmtRoas(row.roas_fee) }}</td>
              <td class="col-num">{{ fmtLt(row.LT_medio) }}</td>
              <td class="col-money">{{ fmtLtv(row) }}</td>
              <td class="col-num">{{ formatNumber(row.aql_monetizacao) }}</td>
              <td class="col-cr">—</td>
              <td class="col-num">{{ formatNumber(row.sql_monetizacao) }}</td>
              <td class="col-cr">—</td>
              <td class="col-num">{{ formatNumber(row.sal_monetizacao) }}</td>
              <td class="col-cr">—</td>
              <td class="col-num">{{ formatNumber(row.commit_monetizacao) }}</td>
              <td class="col-cr">—</td>
              <td class="col-money">—</td>
              <td class="col-money">—</td>
              <td class="col-money">—</td>
              <td class="col-money">{{ fmtMoney(row.booking_monetizacao) }}</td>
            </tr>

            <!-- Total row -->
            <tr v-else-if="row.isTotal" class="tier-row total-row" :class="{ 'has-steps': hasSteps(row) }">
              <td class="col-tier col-sticky total-label">
                <button
                  v-if="hasSteps(row)"
                  class="expand-btn"
                  :class="{ expanded: expandedTiers.has(row.tier) }"
                  @click="toggleTier(row.tier)"
                  :aria-label="expandedTiers.has(row.tier) ? 'Recolher' : 'Expandir'"
                >
                  <svg v-if="expandedTiers.has(row.tier)" width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/>
                    <line x1="3.5" y1="7" x2="10.5" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                  <svg v-else width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/>
                    <line x1="7" y1="3.5" x2="7" y2="10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <line x1="3.5" y1="7" x2="10.5" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                </button>
                <span v-else class="expand-placeholder"></span>
                {{ row.tier }}
              </td>
              <td class="col-center total-val">{{ fmtMoney(row.investimento) }}</td>
              <td class="col-center total-val">{{ fmtCpl(row.investimento, row.leads) }}</td>
              <td class="col-num total-val">{{ formatNumber(row.leads) }}</td>
              <td class="col-cr"><span :class="crClass(row.cr1?.color)">{{ fmtCr(row.cr1?.val) }}</span></td>
              <td class="col-num total-val">{{ formatNumber(row.mql) }}</td>
              <td class="col-cr"><span :class="crClass(row.cr2?.color)">{{ fmtCr(row.cr2?.val) }}</span></td>
              <td class="col-num total-val">{{ formatNumber(row.sql) }}</td>
              <td class="col-cr"><span :class="crClass(row.cr3?.color)">{{ fmtCr(row.cr3?.val) }}</span></td>
              <td class="col-num total-val">{{ formatNumber(row.sal) }}</td>
              <td class="col-cr"><span :class="crClass(row.cr4?.color)">{{ fmtCr(row.cr4?.val) }}</span></td>
              <td class="col-num total-val">{{ formatNumber(row.commit) }}</td>
              <td class="col-cr"><span :class="crClass(row.mqlWon?.color)">{{ fmtCr(row.mqlWon?.val) }}</span></td>
              <td class="col-money total-val">{{ fmtMoney(calcAvgTicket(row)) }}</td>
              <td class="col-money total-val fee-hover" @mouseenter="showFeePopup($event, row)" @mouseleave="hideFeePopup">{{ fmtMoney((row.fee_rec ?? 0) + (row.fee_ot ?? 0)) }}</td>
              <td class="col-money total-val">{{ fmtMoney(calcAvgBooking(row)) }}</td>
              <td class="col-money total-val">{{ formatCurrency(row.booking) }}</td>
              <td class="col-center total-val">{{ fmtRoas(row.roas_booking) }}</td>
              <td class="col-center total-val">{{ fmtRoas(row.roas_fee) }}</td>
              <td class="col-num total-val">{{ fmtLt(row.LT_medio) }}</td>
              <td class="col-money total-val">{{ fmtLtv(row) }}</td>
              <td class="col-num total-val">{{ formatNumber(row.aql_monetizacao) }}</td>
              <td class="col-cr"><span :class="crClass(row.cr5?.color)">{{ fmtCr(row.cr5?.val) }}</span></td>
              <td class="col-num total-val">{{ formatNumber(row.sql_monetizacao) }}</td>
              <td class="col-cr"><span :class="crClass(row.cr6?.color)">{{ fmtCr(row.cr6?.val) }}</span></td>
              <td class="col-num total-val">{{ formatNumber(row.sal_monetizacao) }}</td>
              <td class="col-cr"><span :class="crClass(row.cr7?.color)">{{ fmtCr(row.cr7?.val) }}</span></td>
              <td class="col-num total-val">{{ formatNumber(row.commit_monetizacao) }}</td>
              <td class="col-cr"><span :class="crClass(row.mqlWonMon?.color)">{{ fmtCr(row.mqlWonMon?.val) }}</span></td>
              <td class="col-money total-val">{{ fmtMoney(calcAvgTicketMon(row)) }}</td>
              <td class="col-money total-val fee-hover" @mouseenter="showFeeMonPopup($event, row)" @mouseleave="hideFeePopup">{{ fmtMoney((row.fee_rec_mon ?? 0) + (row.fee_ot_mon ?? 0)) }}</td>
              <td class="col-money total-val">{{ fmtMoney(calcAvgBookingMon(row)) }}</td>
              <td class="col-money total-val">{{ fmtMoney(row.booking_monetizacao) }}</td>
            </tr>

            <!-- Normal tier row -->
            <tr v-else class="tier-row" :class="{ 'has-steps': hasSteps(row) }">
              <td class="col-tier col-sticky">
                <button
                  v-if="hasSteps(row)"
                  class="expand-btn"
                  :class="{ expanded: expandedTiers.has(row.tier) }"
                  @click="toggleTier(row.tier)"
                  :aria-label="expandedTiers.has(row.tier) ? 'Recolher' : 'Expandir'"
                >
                  <svg v-if="expandedTiers.has(row.tier)" width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/>
                    <line x1="3.5" y1="7" x2="10.5" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                  <svg v-else width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/>
                    <line x1="7" y1="3.5" x2="7" y2="10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <line x1="3.5" y1="7" x2="10.5" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                </button>
                <span v-else class="expand-placeholder"></span>
                {{ row.tier }}
              </td>
              <td class="col-center">{{ fmtMoney(row.investimento) }}</td>
              <td class="col-center">{{ fmtCpl(row.investimento, row.leads) }}</td>
              <td class="col-num">{{ formatNumber(row.leads) }}</td>
              <td class="col-cr"><span :class="crClass(row.cr1?.color)">{{ fmtCr(row.cr1?.val) }}</span></td>
              <td class="col-num">{{ formatNumber(row.mql) }}</td>
              <td class="col-cr"><span :class="crClass(row.cr2?.color)">{{ fmtCr(row.cr2?.val) }}</span></td>
              <td class="col-num">{{ formatNumber(row.sql) }}</td>
              <td class="col-cr"><span :class="crClass(row.cr3?.color)">{{ fmtCr(row.cr3?.val) }}</span></td>
              <td class="col-num">{{ formatNumber(row.sal) }}</td>
              <td class="col-cr"><span :class="crClass(row.cr4?.color)">{{ fmtCr(row.cr4?.val) }}</span></td>
              <td class="col-num">{{ formatNumber(row.commit) }}</td>
              <td class="col-cr"><span :class="crClass(row.mqlWon?.color)">{{ fmtCr(row.mqlWon?.val) }}</span></td>
              <td class="col-money">{{ fmtMoney(calcAvgTicket(row)) }}</td>
              <td class="col-money fee-hover" @mouseenter="showFeePopup($event, row)" @mouseleave="hideFeePopup">{{ fmtMoney((row.fee_rec ?? 0) + (row.fee_ot ?? 0)) }}</td>
              <td class="col-money">{{ fmtMoney(calcAvgBooking(row)) }}</td>
              <td class="col-money booking-val">{{ formatCurrency(row.booking) }}</td>
              <td class="col-center">{{ fmtRoas(row.roas_booking) }}</td>
              <td class="col-center">{{ fmtRoas(row.roas_fee) }}</td>
              <td class="col-num">{{ fmtLt(row.LT_medio) }}</td>
              <td class="col-money">{{ fmtLtv(row) }}</td>
              <td class="col-num">{{ formatNumber(row.aql_monetizacao) }}</td>
              <td class="col-cr"><span :class="crClass(row.cr5?.color)">{{ fmtCr(row.cr5?.val) }}</span></td>
              <td class="col-num">{{ formatNumber(row.sql_monetizacao) }}</td>
              <td class="col-cr"><span :class="crClass(row.cr6?.color)">{{ fmtCr(row.cr6?.val) }}</span></td>
              <td class="col-num">{{ formatNumber(row.sal_monetizacao) }}</td>
              <td class="col-cr"><span :class="crClass(row.cr7?.color)">{{ fmtCr(row.cr7?.val) }}</span></td>
              <td class="col-num">{{ formatNumber(row.commit_monetizacao) }}</td>
              <td class="col-cr"><span :class="crClass(row.mqlWonMon?.color)">{{ fmtCr(row.mqlWonMon?.val) }}</span></td>
              <td class="col-money">{{ fmtMoney(calcAvgTicketMon(row)) }}</td>
              <td class="col-money fee-hover" @mouseenter="showFeeMonPopup($event, row)" @mouseleave="hideFeePopup">{{ fmtMoney((row.fee_rec_mon ?? 0) + (row.fee_ot_mon ?? 0)) }}</td>
              <td class="col-money">{{ fmtMoney(calcAvgBookingMon(row)) }}</td>
              <td class="col-money">{{ fmtMoney(row.booking_monetizacao) }}</td>
            </tr>

            <!-- MoM delta sub-row (only when steps NOT expanded — avoids breaking tier→step hierarchy) -->
            <tr v-if="momEnabled && !row.isEmptyRow && !(hasSteps(row) && expandedTiers.has(row.tier))"
                class="mom-row" :class="{ 'mom-row--total': row.isTotal }">
              <td class="col-tier col-sticky mom-label">
                <span class="expand-placeholder"></span>
                Δ
              </td>
              <td v-for="(col, ci) in momCols" :key="'mom-'+ci" :class="col.cls + ' mom-cell'">
                <span :class="col.delta(row, compMap[row.tier] ?? {}).cls">
                  {{ col.delta(row, compMap[row.tier] ?? {}).text }}
                </span>
              </td>
            </tr>

            <!-- Step rows + per-step MoM deltas -->
            <template v-if="hasSteps(row) && expandedTiers.has(row.tier)">
              <template v-for="step in row.steps" :key="step.name">
                <tr class="step-row">
                  <td class="col-tier col-sticky step-name">
                    <span class="step-indent">↳</span>
                    {{ step.name }}
                  </td>
                  <td class="col-center step-val">{{ fmtMoney(step.investimento) }}</td>
                  <td class="col-center step-val">{{ fmtCpl(step.investimento, stepCplDenominator(step)) }}</td>
                  <td class="col-num step-val">{{ drilldown === 'sdr' || drilldown === 'canal' ? formatNumber(Math.round(step.leads)) : '' }}</td>
                  <td class="col-cr">{{ drilldown === 'sdr' || drilldown === 'canal' ? fmtCalcCr(step.mql, step.leads) : '' }}</td>
                  <td class="col-num step-val">{{ drilldown === 'sdr' || drilldown === 'canal' ? formatNumber(Math.round(step.mql)) : '' }}</td>
                  <td class="col-cr">{{ drilldown === 'sdr' || drilldown === 'canal' ? fmtCalcCr(step.sql, step.mql) : '' }}</td>
                  <td class="col-num step-val">{{ drilldown === 'sdr' || drilldown === 'closer' || drilldown === 'canal' ? formatNumber(Math.round(step.sql)) : '' }}</td>
                  <td class="col-cr">{{ drilldown === 'sdr' || drilldown === 'closer' || drilldown === 'canal' ? fmtCalcCr(step.sal, step.sql) : '' }}</td>
                  <td class="col-num step-val">{{ formatNumber(Math.round(step.sal)) }}</td>
                  <td class="col-cr"><span :class="'cr-' + calcCrColor(step.commit, step.sal, 20, 12)">{{ fmtCalcCr(step.commit, step.sal) }}</span></td>
                  <td class="col-num step-val">{{ formatNumber(Math.round(step.commit)) }}</td>
                  <td class="col-cr"><span :class="'cr-' + calcCrColor(step.commit, step.mql, 5, 3)">{{ fmtCalcCr(step.commit, step.mql) }}</span></td>
                  <td class="col-money step-val">{{ fmtMoney(calcAvgTicket(step)) }}</td>
                  <td class="col-money step-val fee-hover" @mouseenter="showFeePopup($event, step)" @mouseleave="hideFeePopup">{{ fmtMoney((step.fee_rec ?? 0) + (step.fee_ot ?? 0)) }}</td>
                  <td class="col-money step-val">{{ fmtMoney(calcAvgBooking(step)) }}</td>
                  <td class="col-money step-val">{{ step.booking > 0 ? formatCurrency(step.booking) : '—' }}</td>
                  <td class="col-center step-val">{{ fmtRoas(step.roas_booking) }}</td>
                  <td class="col-center step-val">{{ fmtRoas(step.roas_fee) }}</td>
                  <td class="col-num step-val">{{ fmtLt(step.LT_medio) }}</td>
                  <td class="col-money step-val">{{ fmtLtv(step) }}</td>
                  <td class="col-num step-val">{{ formatNumber(Math.round(step.aql_monetizacao)) }}</td>
                  <td class="col-cr step-val"><span :class="'cr-' + calcCrColor(step.sql_monetizacao, step.aql_monetizacao, 25, 15)">{{ fmtCalcCr(step.sql_monetizacao, step.aql_monetizacao) }}</span></td>
                  <td class="col-num step-val">{{ formatNumber(Math.round(step.sql_monetizacao)) }}</td>
                  <td class="col-cr step-val"><span :class="'cr-' + calcCrColor(step.sal_monetizacao, step.sql_monetizacao, 80, 65)">{{ fmtCalcCr(step.sal_monetizacao, step.sql_monetizacao) }}</span></td>
                  <td class="col-num step-val">{{ formatNumber(Math.round(step.sal_monetizacao)) }}</td>
                  <td class="col-cr step-val"><span :class="'cr-' + calcCrColor(step.commit_monetizacao, step.sal_monetizacao, 20, 12)">{{ fmtCalcCr(step.commit_monetizacao, step.sal_monetizacao) }}</span></td>
                  <td class="col-num step-val">{{ formatNumber(Math.round(step.commit_monetizacao)) }}</td>
                  <td class="col-cr step-val"><span :class="'cr-' + calcCrColor(step.commit_monetizacao, step.aql_monetizacao, 5, 3)">{{ fmtCalcCr(step.commit_monetizacao, step.aql_monetizacao) }}</span></td>
                  <td class="col-money step-val">{{ fmtMoney(calcAvgTicketMon(step)) }}</td>
                  <td class="col-money step-val fee-hover" @mouseenter="showFeeMonPopup($event, step)" @mouseleave="hideFeePopup">{{ fmtMoney((step.fee_rec_mon ?? 0) + (step.fee_ot_mon ?? 0)) }}</td>
                  <td class="col-money step-val">{{ fmtMoney(calcAvgBookingMon(step)) }}</td>
                  <td class="col-money step-val">{{ fmtMoney(step.booking_monetizacao) }}</td>
                </tr>
                <!-- Per-step MoM delta (respects same column visibility as step row) -->
                <tr v-if="momEnabled"
                    class="mom-row mom-row--step">
                  <td class="col-tier col-sticky mom-label mom-label--step">
                    <span class="step-indent"></span>
                    Δ {{ step.name }}
                  </td>
                  <td v-for="(col, ci) in momCols" :key="'moms-'+ci" :class="col.cls + ' mom-cell'">
                    <span v-if="!col.stepVis || col.stepVis.includes(drilldown)" :class="col.delta(step, getCompStep(row.tier, step.name) ?? {}).cls">
                      {{ col.delta(step, getCompStep(row.tier, step.name) ?? {}).text }}
                    </span>
                  </td>
                </tr>
              </template>
            </template>
          </template>
        </tbody>
      </table>
    </div>
  </div>
  <!-- Fee breakdown popup (fixed to viewport, escapes overflow) -->
  <Teleport to="body">
    <div v-if="feePopup.visible" class="fee-popup" :style="{ top: feePopup.y + 'px', left: feePopup.x + 'px' }">
      <div class="fee-popup-item">
        <span class="fee-popup-label">Fee Recorrente</span>
        <span class="fee-popup-value">{{ feePopup.rec }}</span>
      </div>
      <div class="fee-popup-item">
        <span class="fee-popup-label">Fee One Time</span>
        <span class="fee-popup-value">{{ feePopup.ot }}</span>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed } from 'vue'
import { formatNumber, formatCurrency } from '../../../composables/useFormatters.js'

const props = defineProps({
  tiers: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  drilldown: {
    type: String,
    default: 'step'
  },
  momEnabled: {
    type: Boolean,
    default: false
  },
  comparisonTiers: {
    type: Array,
    default: () => []
  }
})

// ── MoM comparison helpers ─────────────────────────────────────────────────
const compMap = computed(() => {
  if (!props.momEnabled || !props.comparisonTiers?.length) return {}
  const map = {}
  for (const t of props.comparisonTiers) map[t.tier] = t
  return map
})

function pctDelta(cur, prev) {
  if (prev == null && cur == null) return { text: '—', cls: 'mom-neutral' }
  if (prev == null) return { text: '—', cls: 'mom-neutral' }
  if (cur == null) cur = 0
  if (cur === 0 && prev === 0) return { text: '0%', cls: 'mom-neutral' }
  if (prev === 0) return { text: '0%', cls: 'mom-neutral' }
  const pct = ((cur - prev) / Math.abs(prev)) * 100
  if (Math.abs(pct) < 0.5) return { text: '0%', cls: 'mom-neutral' }
  return {
    text: (pct > 0 ? '+' : '') + pct.toFixed(1).replace('.', ',') + '%',
    cls: pct > 0 ? 'mom-up' : 'mom-down'
  }
}

function ppDelta(cur, prev) {
  if (prev == null || cur == null) return { text: '—', cls: 'mom-neutral' }
  const diff = cur - prev
  if (Math.abs(diff) < 0.01) return { text: '0,00pp', cls: 'mom-neutral' }
  return {
    text: (diff > 0 ? '+' : '') + diff.toFixed(2).replace('.', ',') + 'pp',
    cls: diff > 0 ? 'mom-up' : 'mom-down'
  }
}

function crVal(row, crField, numField, denField) {
  if (row[crField]?.val != null) return row[crField].val
  const num = row[numField] ?? 0
  const den = row[denField] ?? 0
  return den > 0 ? (num / den) * 100 : null
}

function getCompStep(tierName, stepName) {
  const compTier = compMap.value[tierName]
  if (!compTier?.steps) return null
  return compTier.steps.find(s => s.name === stepName) ?? null
}

// Column delta definitions — MUST match thead column order (columns 2–33, excluding Tier)
const momCols = [
  /* Investimento  */ { cls: 'col-center', delta: (c, p) => pctDelta(c.investimento, p.investimento) },
  /* CPL           */ { cls: 'col-center', delta: (c, p) => { const cd = c.leads > 0 ? c.investimento / c.leads : null; const pd = p.leads > 0 ? p.investimento / p.leads : null; return pctDelta(cd, pd) } },
  /* Prospects     */ { cls: 'col-num', stepVis: ['sdr', 'canal'], delta: (c, p) => pctDelta(c.leads, p.leads) },
  /* CR1%          */ { cls: 'col-cr', stepVis: ['sdr', 'canal'], delta: (c, p) => ppDelta(crVal(c, 'cr1', 'mql', 'leads'), crVal(p, 'cr1', 'mql', 'leads')) },
  /* MQL           */ { cls: 'col-num', stepVis: ['sdr', 'canal'], delta: (c, p) => pctDelta(c.mql, p.mql) },
  /* CR2%          */ { cls: 'col-cr', stepVis: ['sdr', 'canal'], delta: (c, p) => ppDelta(crVal(c, 'cr2', 'sql', 'mql'), crVal(p, 'cr2', 'sql', 'mql')) },
  /* SQL           */ { cls: 'col-num', stepVis: ['sdr', 'closer', 'canal'], delta: (c, p) => pctDelta(c.sql, p.sql) },
  /* CR3%          */ { cls: 'col-cr', stepVis: ['sdr', 'closer', 'canal'], delta: (c, p) => ppDelta(crVal(c, 'cr3', 'sal', 'sql'), crVal(p, 'cr3', 'sal', 'sql')) },
  /* SAL           */ { cls: 'col-num', delta: (c, p) => pctDelta(c.sal, p.sal) },
  /* CR4%          */ { cls: 'col-cr', delta: (c, p) => ppDelta(crVal(c, 'cr4', 'commit', 'sal'), crVal(p, 'cr4', 'commit', 'sal')) },
  /* Commit        */ { cls: 'col-num', delta: (c, p) => pctDelta(c.commit, p.commit) },
  /* Hit Rate      */ { cls: 'col-cr', delta: (c, p) => ppDelta(crVal(c, 'mqlWon', 'commit', 'mql'), crVal(p, 'mqlWon', 'commit', 'mql')) },
  /* Avg Ticket    */ { cls: 'col-money', delta: (c, p) => pctDelta(calcAvgTicket(c), calcAvgTicket(p)) },
  /* Fee           */ { cls: 'col-money', delta: (c, p) => pctDelta((c.fee_rec ?? 0) + (c.fee_ot ?? 0), (p.fee_rec ?? 0) + (p.fee_ot ?? 0)) },
  /* Avg Booking   */ { cls: 'col-money', delta: (c, p) => pctDelta(calcAvgBooking(c), calcAvgBooking(p)) },
  /* Booking       */ { cls: 'col-money', delta: (c, p) => pctDelta(c.booking, p.booking) },
  /* ROAS Booking  */ { cls: 'col-center', delta: (c, p) => pctDelta(c.roas_booking, p.roas_booking) },
  /* ROAS Direto   */ { cls: 'col-center', delta: (c, p) => pctDelta(c.roas_fee, p.roas_fee) },
  /* LT Médio      */ { cls: 'col-num', delta: (c, p) => pctDelta(c.LT_medio, p.LT_medio) },
  /* LTV           */ { cls: 'col-money', delta: (c, p) => { const cl = (c.fee_total ?? 0) > 0 && (c.LT_medio ?? 0) > 0 ? c.fee_total * c.LT_medio / 30 : null; const pl = (p.fee_total ?? 0) > 0 && (p.LT_medio ?? 0) > 0 ? p.fee_total * p.LT_medio / 30 : null; return pctDelta(cl, pl) } },
  /* AQL Mon.      */ { cls: 'col-num', delta: (c, p) => pctDelta(c.aql_monetizacao, p.aql_monetizacao) },
  /* CR5%          */ { cls: 'col-cr', delta: (c, p) => ppDelta(crVal(c, 'cr5', 'sql_monetizacao', 'aql_monetizacao'), crVal(p, 'cr5', 'sql_monetizacao', 'aql_monetizacao')) },
  /* SQL Mon.      */ { cls: 'col-num', delta: (c, p) => pctDelta(c.sql_monetizacao, p.sql_monetizacao) },
  /* CR6%          */ { cls: 'col-cr', delta: (c, p) => ppDelta(crVal(c, 'cr6', 'sal_monetizacao', 'sql_monetizacao'), crVal(p, 'cr6', 'sal_monetizacao', 'sql_monetizacao')) },
  /* SAL Mon.      */ { cls: 'col-num', delta: (c, p) => pctDelta(c.sal_monetizacao, p.sal_monetizacao) },
  /* CR7%          */ { cls: 'col-cr', delta: (c, p) => ppDelta(crVal(c, 'cr7', 'commit_monetizacao', 'sal_monetizacao'), crVal(p, 'cr7', 'commit_monetizacao', 'sal_monetizacao')) },
  /* Commit Mon.   */ { cls: 'col-num', delta: (c, p) => pctDelta(c.commit_monetizacao, p.commit_monetizacao) },
  /* Hit Rate Mon. */ { cls: 'col-cr', delta: (c, p) => ppDelta(crVal(c, 'mqlWonMon', 'commit_monetizacao', 'aql_monetizacao'), crVal(p, 'mqlWonMon', 'commit_monetizacao', 'aql_monetizacao')) },
  /* Avg Ticket M. */ { cls: 'col-money', delta: (c, p) => pctDelta(calcAvgTicketMon(c), calcAvgTicketMon(p)) },
  /* Fee Mon.      */ { cls: 'col-money', delta: (c, p) => pctDelta((c.fee_rec_mon ?? 0) + (c.fee_ot_mon ?? 0), (p.fee_rec_mon ?? 0) + (p.fee_ot_mon ?? 0)) },
  /* Avg Book. Mon.*/ { cls: 'col-money', delta: (c, p) => pctDelta(calcAvgBookingMon(c), calcAvgBookingMon(p)) },
  /* Booking Mon.  */ { cls: 'col-money', delta: (c, p) => pctDelta(c.booking_monetizacao, p.booking_monetizacao) },
]

// Fee popup state
const feePopup = ref({ visible: false, x: 0, y: 0, rec: '—', ot: '—' })

function showFeePopup(event, item) {
  const rect = event.target.getBoundingClientRect()
  feePopup.value = {
    visible: true,
    x: rect.left,
    y: rect.bottom + 4,
    rec: fmtMoney(item.fee_rec ?? 0),
    ot: fmtMoney(item.fee_ot ?? 0),
  }
}

function showFeeMonPopup(event, item) {
  const rect = event.target.getBoundingClientRect()
  feePopup.value = {
    visible: true,
    x: rect.left,
    y: rect.bottom + 4,
    rec: fmtMoney(item.fee_rec_mon ?? 0),
    ot: fmtMoney(item.fee_ot_mon ?? 0),
  }
}

function hideFeePopup() {
  feePopup.value.visible = false
}

const cplTooltip = computed(() => {
  const map = {
    step: 'Investimento / SAL (distribuído proporcionalmente por SAL)',
    closer: 'Investimento / SQL (distribuído proporcionalmente por SQL)',
    canal: 'Custo por Lead (Investimento / Prospects)',
    sdr: 'Custo por Lead (Investimento / Prospects)',
  }
  return map[props.drilldown] ?? map.canal
})

function stepCplDenominator(step) {
  if (props.drilldown === 'step') return step.sal
  if (props.drilldown === 'closer') return step.sql
  return step.leads
}

const expandedTiers = ref(new Set())

function hasSteps(row) {
  return row.steps && row.steps.length > 0
}

function toggleTier(tierName) {
  const set = new Set(expandedTiers.value)
  if (set.has(tierName)) {
    set.delete(tierName)
  } else {
    set.add(tierName)
  }
  expandedTiers.value = set
}

function fmtCr(val) {
  if (val == null) return '—'
  return val.toFixed(2).replace('.', ',') + '%'
}

function fmtCalcCr(parte, todo) {
  if (!todo || todo === 0) return '0,00%'
  return ((parte / todo) * 100).toFixed(2).replace('.', ',') + '%'
}

// Calcula cor do CR baseado nos thresholds (para steps que calculam CR próprio)
function calcCrColor(num, den, green, yellow) {
  if (!den || den === 0) return 'neutral'
  const val = (num / den) * 100
  return val >= green ? 'green' : val >= yellow ? 'yellow' : 'red'
}

function crClass(color) {
  if (!color) return 'cr-neutral'
  if (color.includes('green')) return 'cr-green'
  if (color.includes('red')) return 'cr-red'
  if (color.includes('yellow')) return 'cr-yellow'
  return 'cr-neutral'
}

function fmtMoney(val) {
  if (!val || val === 0) return '—'
  return formatCurrency(val)
}

function fmtCpl(investimento, leads) {
  if (!investimento || !leads || leads === 0) return '—'
  const cpl = investimento / leads
  if (!isFinite(cpl) || isNaN(cpl)) return '—'
  return formatCurrency(Math.round(cpl))
}

function fmtRoas(val) {
  if (val == null || isNaN(val) || val === 0) return '—'
  return val.toFixed(2).replace('.', ',') + 'x'
}

function fmtLt(val) {
  if (val == null || isNaN(val) || val === 0) return '—'
  const meses = val / 30
  return meses.toFixed(2).replace('.', ',') + ' mês'
}

// Avg Ticket = Fee total / commit_for_fee (somente commits de rows com fee > 0)
// Fallback para (commit + commit_monetizacao) se commit_for_fee não disponível
function calcAvgTicket(item) {
  const fee = (item.fee_rec ?? 0) + (item.fee_ot ?? 0)
  const commits = (item.commit_for_fee ?? 0) > 0
    ? item.commit_for_fee
    : (item.commit ?? 0) + (item.commit_monetizacao ?? 0)
  if (commits <= 0 || fee <= 0) return 0
  return Math.round(fee / commits)
}

// Avg Booking = Booking / Commit (somente aquisição — booking exclui monetização)
function calcAvgBooking(item) {
  const booking = item.booking ?? 0
  const commits = item.commit ?? 0
  if (commits <= 0 || booking <= 0) return 0
  return Math.round(booking / commits)
}

// Avg Booking Mon = Booking Monetização / Commit Monetização
function calcAvgBookingMon(item) {
  const booking = item.booking_monetizacao ?? 0
  const commits = item.commit_monetizacao ?? 0
  if (commits <= 0 || booking <= 0) return 0
  return Math.round(booking / commits)
}

// Avg Ticket Mon = Fee Mon / Commit Monetização
function calcAvgTicketMon(item) {
  const fee = (item.fee_rec_mon ?? 0) + (item.fee_ot_mon ?? 0)
  const commits = item.commit_monetizacao ?? 0
  if (commits <= 0 || fee <= 0) return 0
  return Math.round(fee / commits)
}

function fmtLtv(row) {
  if (row.ltv != null) return formatCurrency(row.ltv)
  const fee = row.fee_total ?? 0
  const lt = row.LT_medio ?? 0
  if (lt <= 0 || fee <= 0) return '—'
  const ltMonths = lt / 30
  return formatCurrency(Math.round(fee * ltMonths))
}
</script>

<style scoped>
.funnel-table-wrap {
  background: #141414;
  border: 1px solid #222;
  border-radius: 6px;
  overflow: hidden;
}

.table-scroll {
  overflow-x: auto;
  overflow-y: visible;
  max-width: 100%;
}

.funnel-table {
  width: 100%;
  min-width: max-content;
  border-collapse: collapse;
  font-size: 13px;
  white-space: nowrap;
  table-layout: auto;
}

/* Header */
thead tr {
  border-bottom: 2px solid rgba(255, 255, 255, 0.06);
}

thead th {
  padding: 10px 12px;
  font-size: 11px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
  position: relative;
  overflow: visible;
}

.th-hint {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  font-size: 8px;
  font-weight: 700;
  color: #444;
  border: 1px solid #333;
  cursor: help;
  vertical-align: middle;
  margin-left: 2px;
  text-transform: none;
  letter-spacing: 0;
  transition: all 0.15s ease;
}

.th-hint:hover {
  color: #ccc;
  border-color: #555;
  background: #1a1a1a;
}

.th-hint:hover::after {
  content: attr(data-tip);
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  background: #1a1a1a;
  border: 1px solid #333;
  color: #ccc;
  font-size: 11px;
  font-weight: 400;
  padding: 6px 10px;
  border-radius: 4px;
  white-space: normal;
  width: max-content;
  max-width: 200px;
  line-height: 1.4;
  z-index: 50;
  pointer-events: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.th-hint:hover::before {
  content: '';
  position: absolute;
  top: calc(100% + 2px);
  left: 5px;
  border: 4px solid transparent;
  border-bottom-color: #333;
  z-index: 51;
}

.th-hint--right:hover::after {
  left: auto;
  right: 0;
}

.th-hint--right:hover::before {
  left: auto;
  right: 5px;
}

.col-tier { text-align: left; min-width: 120px; }
.col-num { text-align: center; min-width: 50px; }
.col-cr { text-align: center; min-width: 55px; }
.col-money { text-align: center; min-width: 80px; }
.col-center { text-align: center; min-width: 70px; }

/* Sticky first column */
.col-sticky {
  position: sticky;
  left: 0;
  z-index: 2;
  background: #141414;
}

.tier-row:hover .col-sticky {
  background: #1a1a1a;
}

.total-row .col-sticky {
  background: #141414;
}

.step-row .col-sticky {
  background: #111;
}

.step-row:hover .col-sticky {
  background: #161616;
}

/* Body rows */
tbody tr {
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  transition: background 0.12s;
}

tbody tr:last-child {
  border-bottom: none;
}

.tier-row:hover {
  background: #1a1a1a;
}

tbody td {
  padding: 10px 12px;
  color: #ccc;
}

tbody td.col-tier {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #ccc;
}

/* Expand button */
.expand-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #555;
  display: flex;
  align-items: center;
  padding: 0;
  flex-shrink: 0;
  transition: color 0.12s;
}

.expand-btn:hover,
.expand-btn.expanded {
  color: #22c55e;
}

.expand-placeholder {
  display: inline-block;
  width: 14px;
  flex-shrink: 0;
}

/* Step rows */
.step-row {
  background: #111;
}

.step-row:hover {
  background: #161616;
}

.step-row td {
  padding: 7px 12px;
  font-size: 12px;
}

.step-row td.col-tier {
  display: flex;
  align-items: center;
}

.step-name {
  padding-left: 32px !important;
  color: #777 !important;
}

.step-indent {
  color: #444;
  margin-right: 4px;
}

.step-val {
  color: #888;
}

/* Total row */
.total-row {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.total-row:hover {
  background: #1a1a1a;
}

.total-label {
  font-weight: 700;
  color: #fff !important;
}

.total-val {
  font-weight: 700;
  color: #fff;
}

/* Empty row */
.empty-row td {
  color: #555;
  font-style: italic;
}

/* Booking value emphasis */
.booking-val {
  font-weight: 600;
  color: #fff;
}

/* CR% colors */
.cr-green { color: #22c55e; font-weight: 600; }
.cr-red { color: #ef4444; font-weight: 600; }
.cr-yellow { color: #eab308; font-weight: 600; }
.cr-neutral { color: #888; font-weight: 500; }

/* Loading skeleton */
.skeleton-row td {
  padding: 10px 12px;
}

.skeleton-cell {
  height: 14px;
  background: #1a1a1a;
  border-radius: 3px;
  animation: pulse 1.2s ease-in-out infinite;
}

.skeleton-row:nth-child(even) .skeleton-cell {
  animation-delay: 0.3s;
}

@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}

/* Scrollbar */
.table-scroll::-webkit-scrollbar {
  height: 4px;
}

.table-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.table-scroll::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 4px;
}

/* Fee hover + popup */
.fee-hover {
  cursor: pointer;
  transition: background 0.15s;
}
.fee-hover:hover {
  background: rgba(255, 255, 255, 0.06);
}

/* ── MoM delta sub-row ──────────────────────────────────────────────────── */
.mom-row {
  background: rgba(255, 255, 255, 0.015);
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
}

.mom-row .col-sticky {
  background: #131313;
}

.mom-row td {
  padding: 2px 12px 5px;
  font-size: 11px;
  color: #555;
}

.mom-label {
  font-weight: 500;
  font-size: 10px !important;
  letter-spacing: 0.5px;
  color: #444 !important;
}

.mom-cell {
  text-align: center;
}

.mom-up {
  color: #22c55e;
  font-weight: 600;
}

.mom-down {
  color: #ef4444;
  font-weight: 600;
}

.mom-neutral {
  color: #333;
  font-weight: 400;
}

.mom-row--total {
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 2px solid rgba(255, 255, 255, 0.06);
}

.mom-row--total .col-sticky {
  background: #151515;
}

.mom-row--total td {
  font-weight: 600;
}

/* Step-level MoM delta row — same background as step-row for visual continuity */
.mom-row--step {
  background: #111;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
}

.mom-row--step .col-sticky {
  background: #111;
}

.mom-row--step td {
  padding: 0 12px 5px;
  font-size: 10px;
}

.mom-row--step .mom-up,
.mom-row--step .mom-down {
  font-weight: 500;
}

/* Remove top-border between step and its delta to look like one block */
.mom-row--step td {
  border-top: none;
}

/* Fuse step row + its delta into one visual block */
.step-row:has(+ .mom-row--step) {
  border-bottom: none;
}

.mom-label--step {
  padding-left: 32px !important;
  font-size: 9px !important;
  color: #3a3a3a !important;
}
</style>

<style>
/* Fee popup — global (Teleported to body, scoped attrs won't reach it) */
.fee-popup {
  position: fixed;
  z-index: 9999;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 6px;
  padding: 10px 14px;
  min-width: 180px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  pointer-events: none;
}
.fee-popup-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 4px 0;
}
.fee-popup-item + .fee-popup-item {
  border-top: 1px solid #2a2a2a;
}
.fee-popup-label {
  color: #999;
  font-size: 0.8rem;
  white-space: nowrap;
}
.fee-popup-value {
  color: #fff;
  font-weight: 600;
  font-size: 0.85rem;
  white-space: nowrap;
}
</style>
