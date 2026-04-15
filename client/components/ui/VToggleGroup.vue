<template>
  <div class="toggle-group">
    <button
      v-for="option in options"
      :key="option.value"
      class="toggle-btn"
      :class="{ active: modelValue === option.value, disabled: option.disabled }"
      :disabled="option.disabled"
      @click="handleSelect(option)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  options: {
    type: Array,
    required: true,
    validator: (options) => {
      return options.every(
        (opt) =>
          typeof opt === 'object' &&
          'value' in opt &&
          'label' in opt
      )
    }
  },
  modelValue: {
    type: [String, Number],
    required: true
  }
})

const emit = defineEmits(['update:modelValue'])

const handleSelect = (option) => {
  if (option.disabled) return
  emit('update:modelValue', option.value)
}
</script>

<style scoped>
.toggle-group {
  display: inline-flex;
  gap: 0;
  background: var(--bg-inner, #1a1a1a);
  border-radius: var(--radius-md, 6px);
  padding: 4px;
}

.toggle-btn {
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  border: none;
  background: transparent;
  color: var(--text-muted, #999);
  border-radius: var(--radius-sm, 4px);
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.toggle-btn:hover:not(.disabled) {
  color: var(--text-primary, #fff);
  background: rgba(255, 255, 255, 0.05);
}

.toggle-btn.disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.toggle-btn.active {
  background: var(--color-primary, #ff0000);
  color: #fff;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(255, 0, 0, 0.3);
}
</style>
