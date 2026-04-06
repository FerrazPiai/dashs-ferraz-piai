<template>
  <div class="gtm-scorecard" :class="statusBorderClass">
    <div class="scorecard-label">
      {{ label }}
      <span v-if="tooltip" class="info-hint" :data-tip="tooltip">?</span>
    </div>

    <div v-if="loading" class="scorecard-value">
      <span class="spinner"></span>
    </div>
    <div v-else class="scorecard-value">
      {{ formattedValue }}
    </div>

    <div v-if="!loading" class="scorecard-sub">
      <template v-if="!hideMeta">
        <div class="sub-row">
          <span class="sub-key">Meta</span>
          <span class="sub-val">{{ formattedMeta }}</span>
        </div>
        <div class="sub-row">
          <span class="sub-key">Δ Meta</span>
          <span class="sub-val" :class="deltaClass">{{ formattedDelta }}</span>
        </div>
      </template>
      <div v-if="previousDelta !== null && previousDelta !== undefined" class="sub-row">
        <span class="sub-key">Δ Período Anterior</span>
        <span class="sub-val" :class="previousDeltaClass">{{ formattedPreviousDelta }}</span>
      </div>
    </div>
    <div v-else class="scorecard-sub skeleton-sub">
      <div class="skeleton-line"></div>
      <div class="skeleton-line"></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: {
    type: String,
    required: true
  },
  value: {
    type: [Number, String],
    default: null
  },
  formatter: {
    type: Function,
    default: (val) => val ?? '--'
  },
  provisionado: {
    type: [Number, String],
    default: null
  },
  meta: {
    type: [Number, String],
    default: null
  },
  delta: {
    type: Number,
    default: null
  },
  previousDelta: {
    type: Number,
    default: null
  },
  tooltip: {
    type: String,
    default: null
  },
  hideMeta: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  },
  greenThreshold: {
    type: Number,
    default: 100
  },
  yellowThreshold: {
    type: Number,
    default: 85
  }
})

const formattedValue = computed(() => props.formatter(props.value))

const formattedProvisionado = computed(() =>
  props.provisionado != null ? props.formatter(props.provisionado) : '--'
)

const formattedMeta = computed(() =>
  props.meta != null ? props.formatter(props.meta) : '--'
)

// Auto-compute delta from value/meta if not provided
const effectiveDelta = computed(() => {
  if (props.delta != null) return props.delta
  if (props.value != null && props.meta != null && props.meta !== 0) {
    return (props.value / props.meta) * 100
  }
  return null
})

const formattedDelta = computed(() => {
  if (effectiveDelta.value == null) return '--'
  return effectiveDelta.value.toFixed(2).replace('.', ',') + '%'
})

const deltaClass = computed(() => {
  if (effectiveDelta.value == null) return 'delta-neutral'
  if (effectiveDelta.value >= props.greenThreshold) return 'delta-green'
  if (effectiveDelta.value >= props.yellowThreshold) return 'delta-yellow'
  return 'delta-red'
})

const formattedPreviousDelta = computed(() => {
  if (props.previousDelta == null) return '--'
  const sign = props.previousDelta > 0 ? '+' : ''
  return sign + props.previousDelta.toFixed(1).replace('.', ',') + '%'
})

const previousDeltaClass = computed(() => {
  if (props.previousDelta == null) return 'delta-neutral'
  if (props.previousDelta > 0) return 'delta-green'
  if (props.previousDelta < 0) return 'delta-red'
  return 'delta-neutral'
})

const statusBorderClass = computed(() => {
  if (effectiveDelta.value == null) return ''
  if (effectiveDelta.value >= props.greenThreshold) return 'border-green'
  if (effectiveDelta.value >= props.yellowThreshold) return 'border-yellow'
  return 'border-red'
})
</script>

<style scoped>
.gtm-scorecard {
  background: #141414;
  border: 1px solid #222;
  border-radius: 6px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.scorecard-label {
  font-size: 12px;
  color: #888;
  font-weight: 500;
  white-space: nowrap;
  overflow: visible;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 4px;
}

.info-hint {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  font-size: 9px;
  font-weight: 700;
  color: #555;
  border: 1px solid #333;
  cursor: help;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.info-hint:hover {
  color: #ccc;
  border-color: #555;
  background: #1a1a1a;
}

.info-hint:hover::after {
  content: attr(data-tip);
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  background: #1a1a1a;
  border: 1px solid #333;
  color: #ccc;
  font-size: 11px;
  font-weight: 400;
  padding: 6px 10px;
  border-radius: 4px;
  white-space: normal;
  width: max-content;
  max-width: 220px;
  line-height: 1.4;
  z-index: 50;
  pointer-events: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.info-hint:hover::before {
  content: '';
  position: absolute;
  bottom: calc(100% + 2px);
  left: 50%;
  transform: translateX(-50%);
  border: 4px solid transparent;
  border-top-color: #333;
  z-index: 51;
}

.scorecard-value {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  line-height: 1.1;
  min-height: 28px;
  display: flex;
  align-items: center;
}

.scorecard-sub {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 2px;
}

.sub-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 4px;
}

.sub-key {
  font-size: 10px;
  color: #555;
}

.sub-val {
  font-size: 10px;
  color: #888;
  font-weight: 500;
}

.delta-green {
  color: #22c55e;
}

.delta-yellow {
  color: #fbbf24;
}

.delta-red {
  color: #ef4444;
}

.delta-neutral {
  color: #888;
}

.gtm-scorecard.border-green {
  border-left: 3px solid #22c55e;
}

.gtm-scorecard.border-yellow {
  border-left: 3px solid #fbbf24;
}

.gtm-scorecard.border-red {
  border-left: 3px solid #ef4444;
}

/* Loading */
.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid #333;
  border-top-color: #ff0000;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.skeleton-sub {
  gap: 4px;
}

.skeleton-line {
  height: 10px;
  background: #1a1a1a;
  border-radius: 3px;
  animation: pulse 1.2s ease-in-out infinite;
}

.skeleton-line:nth-child(2) { animation-delay: 0.2s; }
.skeleton-line:nth-child(3) { animation-delay: 0.4s; }

@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}
</style>
