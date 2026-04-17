<script setup>
import { computed } from 'vue'

const props = defineProps({
  size: {
    type: String,
    default: 'md',
    validator: v => ['sm', 'md', 'lg'].includes(v)
  }
})

const spinnerClass = computed(() => {
  if (props.size === 'sm') return 'spinner'
  if (props.size === 'md') return 'spinner spinner-lg'
  return 'spinner spinner-xl'
})
</script>

<template>
  <div class="loading-state">
    <span :class="spinnerClass"></span>
  </div>
</template>

<style scoped>
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
}
.spinner-xl {
  width: 48px;
  height: 48px;
  border-width: 4px;
}
</style>
