<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="status-modal-backdrop" @click.self="close">
        <div class="status-modal" :class="`status-modal--${status}`">
          <div class="status-modal-header">
            <div class="status-modal-icon">
              <span class="status-modal-dot" :class="`status-dot--${status}`"></span>
            </div>
            <div class="status-modal-title">
              <p class="status-modal-label">{{ statusLabel }}</p>
              <h2 class="status-modal-dashboard">{{ dashboardTitle }}</h2>
            </div>
          </div>
          <p class="status-modal-message">{{ message }}</p>
          <button class="status-modal-btn" @click="close">Entendido</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  visible: Boolean,
  status: String,
  dashboardTitle: String,
  message: String
})

const emit = defineEmits(['close'])

const close = () => emit('close')

const statusLabel = computed(() => {
  const labels = {
    development: 'Em desenvolvimento',
    maintenance: 'Em manutenção'
  }
  return labels[props.status] || ''
})
</script>

<style scoped>
.status-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.status-modal {
  background: #141414;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  padding: 28px 32px;
  max-width: 440px;
  width: 90%;
  border-top: 3px solid transparent;
}

.status-modal--development {
  border-top-color: #f59e0b;
}

.status-modal--maintenance {
  border-top-color: #ef4444;
}

.status-modal-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
}

.status-modal-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #1a1a1a;
  flex-shrink: 0;
}

.status-modal-dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.status-dot--development {
  background-color: #f59e0b;
  box-shadow: 0 0 8px rgba(245, 158, 11, 0.7);
}

.status-dot--maintenance {
  background-color: #ef4444;
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.7);
}

.status-modal-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #888;
  margin: 0 0 2px;
}

.status-modal-dashboard {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  margin: 0;
}

.status-modal-message {
  font-size: 14px;
  color: #ccc;
  line-height: 1.6;
  margin: 0 0 24px;
}

.status-modal-btn {
  display: block;
  width: 100%;
  padding: 10px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 4px;
  color: #fff;
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s;
}

.status-modal-btn:hover {
  background: #222;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .status-modal,
.modal-leave-active .status-modal {
  transition: transform 0.2s ease;
}

.modal-enter-from .status-modal,
.modal-leave-to .status-modal {
  transform: scale(0.95) translateY(-8px);
}
</style>
