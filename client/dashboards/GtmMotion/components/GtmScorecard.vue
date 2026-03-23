<template>
  <div class="gtm-scorecard">
    <div class="scorecard-label">{{ label }}</div>

    <div v-if="loading" class="scorecard-value">
      <span class="spinner"></span>
    </div>
    <div v-else class="scorecard-value">
      {{ formattedValue }}
    </div>

    <div v-if="!loading" class="scorecard-sub">
      <div class="sub-row">
        <span class="sub-key">Meta</span>
        <span class="sub-val">{{ formattedMeta }}</span>
      </div>
      <div class="sub-row">
        <span class="sub-key">Delta</span>
        <span class="sub-val" :class="deltaClass">{{ formattedDelta }}</span>
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
  loading: {
    type: Boolean,
    default: false
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
  if (effectiveDelta.value >= 100) return 'delta-green'
  if (effectiveDelta.value >= 80)  return 'delta-yellow'
  return 'delta-red'
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
  overflow: hidden;
  text-overflow: ellipsis;
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
  color: #eab308;
}

.delta-red {
  color: #ef4444;
}

.delta-neutral {
  color: #888;
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
