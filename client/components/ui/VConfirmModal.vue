<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="confirm-modal-backdrop" @click.self="cancel">
        <div class="confirm-modal" :class="`confirm-modal--${type}`">
          <div class="confirm-modal-header">
            <div class="confirm-modal-icon">
              <span class="confirm-modal-dot" :class="`confirm-dot--${type}`"></span>
            </div>
            <div class="confirm-modal-title">
              <p class="confirm-modal-label">{{ typeLabel }}</p>
              <h2 class="confirm-modal-heading">{{ title }}</h2>
            </div>
          </div>
          <p class="confirm-modal-message">{{ message }}</p>
          <div class="confirm-modal-actions">
            <button class="confirm-modal-btn confirm-modal-btn--secondary" @click="cancel">
              {{ cancelText }}
            </button>
            <button class="confirm-modal-btn confirm-modal-btn--primary" :class="`confirm-modal-btn--${type}`" @click="confirm">
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  visible: Boolean,
  title: { type: String, default: '' },
  message: { type: String, default: '' },
  confirmText: { type: String, default: 'Confirmar' },
  cancelText: { type: String, default: 'Cancelar' },
  type: { type: String, default: 'warning' }
})

const emit = defineEmits(['confirm', 'cancel'])

const confirm = () => emit('confirm')
const cancel = () => emit('cancel')

const typeLabel = computed(() => {
  const labels = {
    warning: 'Atenção',
    info: 'Informação',
    error: 'Erro'
  }
  return labels[props.type] || ''
})
</script>

<style scoped>
.confirm-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.confirm-modal {
  background: #141414;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  padding: 28px 32px;
  max-width: 480px;
  width: 90%;
  border-top: 3px solid transparent;
}

.confirm-modal--warning {
  border-top-color: #f59e0b;
}

.confirm-modal--info {
  border-top-color: #3b82f6;
}

.confirm-modal--error {
  border-top-color: #ef4444;
}

.confirm-modal-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
}

.confirm-modal-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #1a1a1a;
  flex-shrink: 0;
}

.confirm-modal-dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.confirm-dot--warning {
  background-color: #f59e0b;
  box-shadow: 0 0 8px rgba(245, 158, 11, 0.7);
}

.confirm-dot--info {
  background-color: #3b82f6;
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.7);
}

.confirm-dot--error {
  background-color: #ef4444;
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.7);
}

.confirm-modal-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #888;
  margin: 0 0 2px;
}

.confirm-modal-heading {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  margin: 0;
}

.confirm-modal-message {
  font-size: 14px;
  color: #ccc;
  line-height: 1.6;
  margin: 0 0 24px;
  white-space: pre-line;
}

.confirm-modal-actions {
  display: flex;
  gap: 12px;
}

.confirm-modal-btn {
  flex: 1;
  padding: 10px;
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s;
  border: 1px solid #333;
}

.confirm-modal-btn--secondary {
  background: #1a1a1a;
  color: #fff;
}

.confirm-modal-btn--secondary:hover {
  background: #222;
}

.confirm-modal-btn--primary {
  color: #000;
  font-weight: 600;
  border-color: transparent;
}

.confirm-modal-btn--warning {
  background: #f59e0b;
}

.confirm-modal-btn--warning:hover {
  background: #d97706;
}

.confirm-modal-btn--info {
  background: #3b82f6;
}

.confirm-modal-btn--info:hover {
  background: #2563eb;
}

.confirm-modal-btn--error {
  background: #ef4444;
}

.confirm-modal-btn--error:hover {
  background: #dc2626;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .confirm-modal,
.modal-leave-active .confirm-modal {
  transition: transform 0.2s ease;
}

.modal-enter-from .confirm-modal,
.modal-leave-to .confirm-modal {
  transform: scale(0.95) translateY(-8px);
}
</style>
