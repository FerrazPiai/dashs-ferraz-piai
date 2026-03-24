<template>
  <div class="section-card">
    <!-- Section Header -->
    <div class="section-header">
      <i :data-lucide="icon" class="section-icon"></i>
      <h3 class="section-title">{{ title }}</h3>
    </div>

    <!-- Table -->
    <div class="table-wrapper">
      <table class="mv-table">
        <thead>
          <tr>
            <th class="col-name">Segmento</th>
            <th>Leads</th>
            <th>Reuniões<br>Agendadas</th>
            <th>Reuniões<br>Realizadas</th>
            <th>Contratos<br>Assinados</th>
            <th>R$ Booking</th>
            <th>Avg. Ticket</th>
          </tr>
        </thead>
        <tbody>
          <!-- Loading skeleton -->
          <template v-if="loading">
            <tr v-for="i in 4" :key="i" class="skeleton-row">
              <td v-for="j in 7" :key="j"><span class="skeleton-bar"></span></td>
            </tr>
          </template>

          <!-- Data rows -->
          <template v-else>
            <tr v-for="row in rows" :key="row.name" class="data-row">
              <!-- Col 1: Name (conditional by type) -->
              <td class="col-name-cell">
                <!-- tier: plain text -->
                <span v-if="type === 'tier'" class="tier-name">{{ row.name }}</span>

                <!-- analyst: avatar circle + name -->
                <span v-else-if="type === 'analyst'" class="analyst-cell">
                  <span class="avatar">{{ row.avatar }}</span>
                  {{ row.name }}
                </span>

                <!-- canal: lucide icon + name -->
                <span v-else-if="type === 'canal'" class="canal-cell">
                  <i :data-lucide="row.icon" class="canal-icon" :style="{ color: row.iconColor }"></i>
                  {{ row.name }}
                </span>
              </td>

              <!-- Cols numeric -->
              <td>{{ formatNumber(row.leads) }}</td>
              <td>{{ formatNumber(row.agendadas) }}</td>
              <td>{{ formatNumber(row.realizadas) }}</td>
              <td>{{ formatNumber(row.contratos) }}</td>

              <!-- Col 8: Booking -->
              <td class="col-booking">{{ formatCurrency(row.booking) }}</td>

              <!-- Col 9: Avg Ticket + status dot -->
              <td class="col-currency">
                <span class="status-dot" :class="`dot-${row.avgTicketColor}`"></span>
                {{ formatCurrency(row.avgTicket) }}
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { onMounted, watch, nextTick } from 'vue'
import { formatNumber, formatCurrency } from '../../../composables/useFormatters.js'

const props = defineProps({
  title: { type: String, required: true },
  icon: { type: String, required: true },
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  type: {
    type: String,
    required: true,
    validator: (v) => ['tier', 'analyst', 'canal'].includes(v)
  }
})

async function initIcons() {
  await nextTick()
  if (window.lucide) window.lucide.createIcons()
}

onMounted(initIcons)
watch(() => props.rows, initIcons)
watch(() => props.loading, (val) => { if (!val) initIcons() })
</script>

<style scoped>
.section-card {
  background: #141414;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid #2a2a2a;
  position: relative;
}

.section-header::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: #ff0000;
}

.section-icon {
  width: 16px;
  height: 16px;
  color: #888;
  stroke-width: 1.5;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  margin: 0;
}

.table-wrapper {
  overflow-x: auto;
}

.mv-table {
  width: 100%;
  border-collapse: collapse;
  white-space: nowrap;
}

.mv-table thead th {
  padding: 10px 14px;
  color: #666;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #2a2a2a;
  text-align: left;
  line-height: 1.4;
}

.mv-table thead th:not(.col-name) {
  text-align: right;
}

.mv-table tbody td {
  padding: 10px 14px;
  color: #ccc;
  font-size: 12px;
  border-bottom: 1px solid #1f1f1f;
  text-align: right;
}

.mv-table tbody tr:last-child td {
  border-bottom: none;
}

.mv-table tbody tr.data-row:hover td {
  background: #1a1a1a;
}

/* Col 1 overrides */
.col-name { text-align: left !important; }
.col-name-cell {
  text-align: left !important;
  color: #fff !important;
  font-weight: 500;
}

/* Tier */
.tier-name {
  color: #fff;
  font-weight: 500;
}

/* Analyst */
.analyst-cell {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #2a2a2a;
  border: 1px solid #3a3a3a;
  color: #ccc;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.3px;
  flex-shrink: 0;
}

/* Canal */
.canal-cell {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.canal-icon {
  width: 14px;
  height: 14px;
  stroke-width: 1.5;
  flex-shrink: 0;
}

/* Booking */
.col-booking {
  font-weight: 600 !important;
  color: #fff !important;
}

/* Status dot */
.status-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 5px;
  flex-shrink: 0;
  vertical-align: middle;
}

.dot-green  { background: #22c55e; }
.dot-yellow { background: #eab308; }
.dot-orange { background: #f97316; }
.dot-red    { background: #ef4444; }

/* Loading skeleton */
.skeleton-row td {
  opacity: 0.3;
}

.skeleton-bar {
  display: inline-block;
  height: 10px;
  width: 60px;
  background: #2a2a2a;
  border-radius: 3px;
}
</style>
