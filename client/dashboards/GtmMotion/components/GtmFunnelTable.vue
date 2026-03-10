<template>
  <div class="funnel-table-wrap">
    <div class="table-scroll">
      <table class="funnel-table">
        <thead>
          <tr>
            <th class="col-tier">Tier</th>
            <th class="col-num">Leads</th>
            <th class="col-cr">CR1%</th>
            <th class="col-num">MQL</th>
            <th class="col-cr">CR2%</th>
            <th class="col-num">SQL</th>
            <th class="col-cr">CR3%</th>
            <th class="col-num">SAL</th>
            <th class="col-cr">CR4%</th>
            <th class="col-num">Commit</th>
            <th class="col-cr">MQL&gt;Won%</th>
            <th class="col-money">Avg Ticket</th>
            <th class="col-money">Booking</th>
          </tr>
        </thead>
        <tbody v-if="loading">
          <tr v-for="i in 6" :key="i" class="skeleton-row">
            <td v-for="j in 13" :key="j"><div class="skeleton-cell"></div></td>
          </tr>
        </tbody>
        <tbody v-else>
          <template v-for="row in tiers" :key="row.tier">
            <!-- Empty row (Sem mapeamento) -->
            <tr v-if="row.isEmptyRow" class="tier-row empty-row">
              <td class="col-tier">
                <span class="expand-placeholder"></span>
                {{ row.tier }}
              </td>
              <td class="col-num">{{ formatNumber(row.leads) }}</td>
              <td class="col-cr">—</td>
              <td class="col-num">—</td>
              <td class="col-cr">—</td>
              <td class="col-num">—</td>
              <td class="col-cr">—</td>
              <td class="col-num">—</td>
              <td class="col-cr">—</td>
              <td class="col-num">—</td>
              <td class="col-cr">—</td>
              <td class="col-money">—</td>
              <td class="col-money">—</td>
            </tr>

            <!-- Total row -->
            <tr v-else-if="row.isTotal" class="tier-row total-row">
              <td class="col-tier total-label">
                <span class="expand-placeholder"></span>
                {{ row.tier }}
              </td>
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
            </tr>

            <!-- Normal tier row -->
            <tr v-else class="tier-row" :class="{ 'has-sub': hasSubcategories(row) }">
              <td class="col-tier">
                <button
                  v-if="hasSubcategories(row)"
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
            </tr>

            <!-- Sub-rows -->
            <template v-if="hasSubcategories(row) && expandedTiers.has(row.tier)">
              <tr
                v-for="sub in row.subCategories"
                :key="sub.name"
                class="sub-row"
              >
                <td class="col-tier sub-name">
                  <span class="sub-indent">↳</span>
                  {{ sub.name }}
                </td>
                <td class="col-num sub-val">{{ formatNumber(sub.leads) }}</td>
                <td class="col-cr"><span :class="crClass(row.cr1?.color)">{{ fmtCalcCr(sub.mql, sub.leads) }}</span></td>
                <td class="col-num sub-val">{{ formatNumber(sub.mql) }}</td>
                <td class="col-cr"><span :class="crClass(row.cr2?.color)">{{ fmtCalcCr(sub.sql, sub.mql) }}</span></td>
                <td class="col-num sub-val">{{ formatNumber(sub.sql) }}</td>
                <td class="col-cr"><span :class="crClass(row.cr3?.color)">{{ fmtCalcCr(sub.sal, sub.sql) }}</span></td>
                <td class="col-num sub-val">{{ formatNumber(sub.sal) }}</td>
                <td class="col-cr"><span :class="crClass(row.cr4?.color)">{{ fmtCalcCr(sub.commit, sub.sal) }}</span></td>
                <td class="col-num sub-val">{{ formatNumber(sub.commit) }}</td>
                <td class="col-cr"><span :class="crClass(row.mqlWon?.color)">{{ fmtCalcCr(sub.commit, sub.mql) }}</span></td>
                <td class="col-money sub-val">{{ sub.commit > 0 ? formatCurrency(Math.round(sub.booking / sub.commit)) : '—' }}</td>
                <td class="col-money sub-val">{{ sub.booking > 0 ? formatCurrency(sub.booking) : '—' }}</td>
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

function hasSubcategories(row) {
  return row.subCategories && row.subCategories.length > 0
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
}

.funnel-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  white-space: nowrap;
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
}

.col-tier { text-align: left; min-width: 160px; }
.col-num { text-align: center; min-width: 72px; }
.col-cr { text-align: center; min-width: 72px; }
.col-money { text-align: right; min-width: 110px; }

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

/* Sub-rows */
.sub-row {
  background: #111;
}

.sub-row:hover {
  background: #161616;
}

.sub-row td {
  padding: 7px 12px;
  font-size: 12px;
}

.sub-row td.col-tier {
  display: flex;
  align-items: center;
}

.sub-name {
  padding-left: 32px !important;
  color: #777 !important;
}

.sub-indent {
  color: #444;
  margin-right: 4px;
}

.sub-val {
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
