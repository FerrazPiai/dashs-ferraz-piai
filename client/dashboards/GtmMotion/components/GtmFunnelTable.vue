<template>
  <div class="funnel-table-wrap">
    <div class="table-scroll">
      <table class="funnel-table">
        <thead>
          <tr>
            <th class="col-tier col-sticky">Tier <span class="th-hint" data-tip="Porte da empresa prospectada">?</span></th>
            <th class="col-center">Investimento <span class="th-hint" data-tip="Investimento no período">?</span></th>
            <th class="col-center">CPL <span class="th-hint" data-tip="Custo por Lead (Investimento / Prospects)">?</span></th>
            <th class="col-num">Prospects <span class="th-hint" data-tip="Total de leads captados">?</span></th>
            <th class="col-cr">CR1% <span class="th-hint" data-tip="Conversão de Prospect para MQL">?</span></th>
            <th class="col-num">MQL <span class="th-hint" data-tip="Leads qualificados pelo marketing">?</span></th>
            <th class="col-cr">CR2% <span class="th-hint" data-tip="Conversão de MQL para SQL">?</span></th>
            <th class="col-num">SQL <span class="th-hint" data-tip="Leads com reunião agendada">?</span></th>
            <th class="col-cr">CR3% <span class="th-hint" data-tip="Conversão de SQL para SAL">?</span></th>
            <th class="col-num">SAL <span class="th-hint" data-tip="Reuniões efetivamente realizadas">?</span></th>
            <th class="col-cr">CR4% <span class="th-hint" data-tip="Conversão de SAL para Commit">?</span></th>
            <th class="col-num">Commit <span class="th-hint" data-tip="Contratos assinados">?</span></th>
            <th class="col-cr">MQL&gt;Won% <span class="th-hint" data-tip="Conversão direta de MQL para contrato fechado">?</span></th>
            <th class="col-money">Avg Ticket <span class="th-hint th-hint--right" data-tip="Valor médio por contrato">?</span></th>
            <th class="col-money">TCV <span class="th-hint th-hint--right" data-tip="Receita total contratada">?</span></th>
            <th class="col-center">ROAS Booking <span class="th-hint th-hint--right" data-tip="TCV / Investimento">?</span></th>
            <th class="col-center">ROAS Fee <span class="th-hint th-hint--right" data-tip="Fee / Investimento">?</span></th>
          </tr>
        </thead>
        <tbody v-if="loading">
          <tr v-for="i in 6" :key="i" class="skeleton-row">
            <td v-for="j in 17" :key="j"><div class="skeleton-cell"></div></td>
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
              <td class="col-center">{{ fmtRoas(row.roas_booking) }}</td>
              <td class="col-center">{{ fmtRoas(row.roas_fee) }}</td>
            </tr>

            <!-- Total row -->
            <tr v-else-if="row.isTotal" class="tier-row total-row">
              <td class="col-tier col-sticky total-label">
                <span class="expand-placeholder"></span>
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
              <td class="col-money total-val">{{ formatCurrency(row.avgTicket) }}</td>
              <td class="col-money total-val">{{ formatCurrency(row.booking) }}</td>
              <td class="col-center total-val">{{ fmtRoas(row.roas_booking) }}</td>
              <td class="col-center total-val">{{ fmtRoas(row.roas_fee) }}</td>
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
              <td class="col-money">{{ formatCurrency(row.avgTicket) }}</td>
              <td class="col-money booking-val">{{ formatCurrency(row.booking) }}</td>
              <td class="col-center">{{ fmtRoas(row.roas_booking) }}</td>
              <td class="col-center">{{ fmtRoas(row.roas_fee) }}</td>
            </tr>

            <!-- Step rows -->
            <template v-if="hasSteps(row) && expandedTiers.has(row.tier)">
              <tr
                v-for="step in row.steps"
                :key="step.name"
                class="step-row"
              >
                <td class="col-tier col-sticky step-name">
                  <span class="step-indent">↳</span>
                  {{ step.name }}
                </td>
                <td class="col-center step-val">{{ fmtMoney(step.investimento) }}</td>
                <td class="col-center step-val">{{ fmtCpl(step.investimento, step.leads) }}</td>
                <td class="col-num step-val"></td>
                <td class="col-cr"></td>
                <td class="col-num step-val"></td>
                <td class="col-cr"></td>
                <td class="col-num step-val"></td>
                <td class="col-cr"></td>
                <td class="col-num step-val">{{ formatNumber(step.sal) }}</td>
                <td class="col-cr"><span :class="crClass(row.cr4?.color)">{{ fmtCalcCr(step.commit, step.sal) }}</span></td>
                <td class="col-num step-val">{{ formatNumber(step.commit) }}</td>
                <td class="col-cr"><span :class="crClass(row.mqlWon?.color)">{{ fmtCalcCr(step.commit, step.mql) }}</span></td>
                <td class="col-money step-val">{{ step.commit > 0 ? formatCurrency(Math.round(step.booking / step.commit)) : '—' }}</td>
                <td class="col-money step-val">{{ step.booking > 0 ? formatCurrency(step.booking) : '—' }}</td>
                <td class="col-center step-val">{{ fmtRoas(step.roas_booking) }}</td>
                <td class="col-center step-val">{{ fmtRoas(step.roas_fee) }}</td>
              </tr>
            </template>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { formatNumber, formatCurrency } from '../../../composables/useFormatters.js'

const props = defineProps({
  tiers: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

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
</script>

<style scoped>
.funnel-table-wrap {
  background: #141414;
  border: 1px solid #222;
  border-radius: 6px;
}

.table-scroll {
  overflow-x: auto;
  overflow-y: visible;
}

.funnel-table {
  width: 100%;
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

.col-tier { text-align: left; min-width: 130px; }
.col-num { text-align: center; min-width: 55px; }
.col-cr { text-align: center; min-width: 60px; }
.col-money { text-align: right; min-width: 90px; }
.col-center { text-align: center; min-width: 80px; }

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
</style>
