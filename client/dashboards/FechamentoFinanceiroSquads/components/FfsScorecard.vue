<template>
  <div class="ffs-scorecard" :class="borderClass">
    <div class="ffs-scorecard-header">
      <i
        v-if="icon"
        :data-lucide="icon"
        class="ffs-scorecard-icon"
        :style="{ color: iconColor || '#fff' }"
      ></i>
      <span class="ffs-scorecard-label">{{ label }}</span>
    </div>

    <div v-if="loading" class="ffs-scorecard-value">
      <span class="spinner"></span>
    </div>
    <div
      v-else
      class="ffs-scorecard-value"
      :style="{ color: valueColor || '#fff' }"
      :title="fullValue"
    >
      {{ formattedValue }}
    </div>

    <div v-if="showDelta && !loading" class="ffs-scorecard-delta">
      <span class="delta-key">Δ M/M</span>
      <span class="delta-val" :class="deltaClass">{{ formattedDelta }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, watch, nextTick } from 'vue'

const props = defineProps({
  label: { type: String, required: true },
  icon: { type: String, default: null },
  iconColor: { type: String, default: null },
  value: { type: [Number, String], default: 0 },
  formatter: { type: Function, default: (v) => v },
  fullFormatter: { type: Function, default: null },
  valueColor: { type: String, default: null },
  delta: { type: Number, default: null },
  showDelta: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  borderColor: {
    type: String,
    default: 'neutral',
    validator: (v) => ['neutral', 'green', 'red', 'yellow', 'orange', 'white'].includes(v)
  }
})

const formattedValue = computed(() => props.formatter(props.value))
const fullValue = computed(() => {
  if (props.fullFormatter) return props.fullFormatter(props.value)
  return formattedValue.value
})

const formattedDelta = computed(() => {
  if (props.delta === null || props.delta === undefined) return '—'
  if (!isFinite(props.delta)) return '—'
  const abs = Math.abs(props.delta)
  if (abs > 9999) return props.delta > 0 ? '> 9999%' : '< -9999%'
  const sign = props.delta > 0 ? '+' : ''
  return `${sign}${props.delta.toFixed(1).replace('.', ',')}%`
})

const deltaClass = computed(() => {
  if (props.delta === null || props.delta === undefined) return 'delta-neutral'
  if (!isFinite(props.delta)) return 'delta-neutral'
  if (props.delta > 0.5) return 'delta-positive'
  if (props.delta < -0.5) return 'delta-negative'
  return 'delta-neutral'
})

const borderClass = computed(() => `ffs-scorecard--${props.borderColor}`)

function renderIcons() {
  if (window.lucide) window.lucide.createIcons()
}

onMounted(() => renderIcons())
watch(() => props.loading, () => nextTick(renderIcons))
watch(() => props.icon, () => nextTick(renderIcons))
</script>

<style scoped>
.ffs-scorecard {
  background: #141414;
  border: 1px solid #222;
  border-left: 3px solid #333;
  border-radius: 6px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.ffs-scorecard:hover {
  background: #161616;
}

.ffs-scorecard--green  { border-left-color: #22c55e; }
.ffs-scorecard--red    { border-left-color: #f87171; }
.ffs-scorecard--yellow { border-left-color: #fbbf24; }
.ffs-scorecard--orange { border-left-color: #b45309; }
.ffs-scorecard--white  { border-left-color: #fff; }
.ffs-scorecard--neutral { border-left-color: #333; }

.ffs-scorecard-header {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.ffs-scorecard-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.ffs-scorecard-label {
  font-size: 12px;
  font-weight: 500;
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.ffs-scorecard-value {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-height: 26px;
}

.ffs-scorecard-delta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  padding-top: 4px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.delta-key {
  font-size: 10px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.delta-val {
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.delta-positive { color: #22c55e; }
.delta-negative { color: #f87171; }
.delta-neutral  { color: #888; }

.spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid #333;
  border-top-color: #888;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>
