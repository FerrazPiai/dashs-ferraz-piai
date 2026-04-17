<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

const props = defineProps({
  label: { type: String, required: true },
  options: { type: Array, default: () => [] },        // [String] ou [{ value, label }]
  modelValue: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Todos' },
  searchable: { type: Boolean, default: true },
  searchMinOptions: { type: Number, default: 5 }       // mostra search se options.length > N
})
const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const rootEl = ref(null)
const searchEl = ref(null)
const busca = ref('')

// Normaliza options para { value, label } sempre
const normalized = computed(() =>
  props.options.map(o => typeof o === 'object' ? { value: o.value, label: String(o.label ?? o.value) } : { value: o, label: String(o) })
)

const filtered = computed(() => {
  const q = busca.value.trim().toLowerCase()
  if (!q) return normalized.value
  return normalized.value.filter(o => o.label.toLowerCase().includes(q))
})

const selectedSet = computed(() => new Set(props.modelValue))
const allSelected = computed(() => normalized.value.length > 0 && normalized.value.every(o => selectedSet.value.has(o.value)))
const someSelected = computed(() => props.modelValue.length > 0 && !allSelected.value)

const showSearch = computed(() => props.searchable && normalized.value.length > props.searchMinOptions)

function labelFor(value) {
  return normalized.value.find(o => o.value === value)?.label || String(value)
}

function toggleOpen() {
  open.value = !open.value
  if (open.value) {
    nextTick(() => searchEl.value?.focus())
  }
}

function closeDropdown() {
  open.value = false
  busca.value = ''
}

function toggleOption(value) {
  const set = new Set(props.modelValue)
  if (set.has(value)) set.delete(value)
  else set.add(value)
  emit('update:modelValue', [...set])
}

function selectAll() {
  emit('update:modelValue', normalized.value.map(o => o.value))
}

function clearAll() {
  emit('update:modelValue', [])
}

function removeChip(value, ev) {
  ev?.stopPropagation()
  emit('update:modelValue', props.modelValue.filter(v => v !== value))
}

function handleKeydown(ev) {
  if (ev.key === 'Escape') closeDropdown()
}

function handleClickOutside(ev) {
  if (!rootEl.value) return
  if (!rootEl.value.contains(ev.target)) closeDropdown()
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
  document.addEventListener('keydown', handleKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleClickOutside)
  document.removeEventListener('keydown', handleKeydown)
})

watch(open, (v) => {
  if (!v) busca.value = ''
})
</script>

<template>
  <div ref="rootEl" class="vms" :class="{ 'vms--open': open, 'vms--has-value': modelValue.length > 0 }">
    <button type="button" class="vms-trigger" @click="toggleOpen" :aria-expanded="open" :aria-haspopup="true">
      <span class="vms-label">{{ label }}</span>

      <template v-if="modelValue.length === 0">
        <span class="vms-placeholder">{{ placeholder }}</span>
      </template>

      <template v-else-if="modelValue.length <= 2">
        <span class="vms-chips">
          <span class="vms-chip" v-for="v in modelValue" :key="v">
            <span class="vms-chip-text">{{ labelFor(v) }}</span>
            <span class="vms-chip-remove" @click="removeChip(v, $event)" role="button" aria-label="Remover">×</span>
          </span>
        </span>
      </template>

      <template v-else>
        <span class="vms-count">{{ modelValue.length }} selecionados</span>
      </template>

      <svg class="vms-chevron" width="12" height="8" viewBox="0 0 12 8" aria-hidden="true">
        <path d="M1 1l5 5 5-5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" />
      </svg>
    </button>

    <div v-if="open" class="vms-panel" role="listbox">
      <div class="vms-panel-header">
        <button type="button" class="vms-action" @click="selectAll" :disabled="allSelected">Selecionar tudo</button>
        <button type="button" class="vms-action vms-action--ghost" @click="clearAll" :disabled="modelValue.length === 0">Limpar</button>
      </div>

      <div v-if="showSearch" class="vms-search-wrap">
        <svg class="vms-search-icon" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <circle cx="5" cy="5" r="3.5" stroke="currentColor" stroke-width="1.4" fill="none" />
          <path d="M8 8l2.5 2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
        </svg>
        <input ref="searchEl" v-model="busca" class="vms-search" type="text" placeholder="Buscar..." @keydown.esc.stop="closeDropdown" />
      </div>

      <div class="vms-list">
        <div v-if="filtered.length === 0" class="vms-empty">Nada encontrado</div>
        <button
          v-for="o in filtered"
          :key="o.value"
          type="button"
          class="vms-item"
          :class="{ 'vms-item--selected': selectedSet.has(o.value) }"
          @click="toggleOption(o.value)"
          role="option"
          :aria-selected="selectedSet.has(o.value)"
        >
          <span class="vms-check">
            <svg v-if="selectedSet.has(o.value)" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <path d="M1.5 5l2.5 2.5 4.5-5" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
          <span class="vms-item-label">{{ o.label }}</span>
        </button>
      </div>

      <div class="vms-panel-footer" v-if="modelValue.length > 0">
        <span class="vms-count-small">{{ modelValue.length }} / {{ normalized.length }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vms {
  position: relative;
  display: inline-flex;
  font-family: inherit;
  min-width: 150px;
}

.vms-trigger {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 36px;
  padding: 6px 12px;
  background: #1a1a1a;
  border: 1px solid #222;
  border-radius: 6px;
  color: #ccc;
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: border-color 150ms, background-color 150ms;
  width: 100%;
}
.vms-trigger:hover {
  border-color: #333;
  background: #1c1c1c;
}
.vms--open .vms-trigger {
  border-color: #ff0000;
  background: #1c1c1c;
}
.vms--has-value .vms-trigger {
  border-color: #2a2a2a;
}

.vms-label {
  font-size: 11px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  white-space: nowrap;
  flex-shrink: 0;
}
.vms-placeholder {
  color: #555;
  font-size: 13px;
}
.vms-count {
  color: #fff;
  font-weight: 500;
  font-size: 12.5px;
  background: #ff0000;
  padding: 2px 9px;
  border-radius: 10px;
  line-height: 1.4;
}

.vms-chips {
  display: inline-flex;
  gap: 4px;
  flex-wrap: nowrap;
  overflow: hidden;
  max-width: 220px;
}
.vms-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #2a2a2a;
  border-radius: 10px;
  padding: 2px 4px 2px 8px;
  font-size: 12px;
  color: #ddd;
  max-width: 120px;
  white-space: nowrap;
}
.vms-chip-text {
  overflow: hidden;
  text-overflow: ellipsis;
}
.vms-chip-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  color: #888;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  transition: background-color 120ms, color 120ms;
}
.vms-chip-remove:hover {
  background: #ff0000;
  color: #fff;
}

.vms-chevron {
  margin-left: auto;
  color: #666;
  transition: transform 180ms;
  flex-shrink: 0;
}
.vms--open .vms-chevron {
  transform: rotate(180deg);
  color: #fff;
}

.vms-panel {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 260px;
  max-width: 360px;
  background: #141414;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  z-index: 50;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 360px;
  animation: vms-in 140ms ease-out;
}
@keyframes vms-in {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}

.vms-panel-header {
  display: flex;
  gap: 6px;
  padding: 8px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.vms-action {
  flex: 1;
  background: transparent;
  border: 1px solid #2a2a2a;
  color: #ccc;
  padding: 5px 8px;
  border-radius: 4px;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms;
}
.vms-action:hover:not(:disabled) {
  background: #ff0000;
  border-color: #ff0000;
  color: #fff;
}
.vms-action:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.vms-action--ghost {
  color: #888;
}
.vms-action--ghost:hover:not(:disabled) {
  background: #2a2a2a;
  border-color: #2a2a2a;
  color: #fff;
}

.vms-search-wrap {
  position: relative;
  padding: 8px 10px 0;
}
.vms-search-icon {
  position: absolute;
  left: 18px;
  top: 50%;
  transform: translateY(-25%);
  color: #555;
  pointer-events: none;
}
.vms-search {
  width: 100%;
  background: #0d0d0d;
  border: 1px solid #2a2a2a;
  border-radius: 4px;
  padding: 6px 8px 6px 26px;
  color: #fff;
  font-size: 12.5px;
  font-family: inherit;
  outline: none;
  transition: border-color 150ms;
}
.vms-search:focus {
  border-color: #ff0000;
}
.vms-search::placeholder {
  color: #555;
}

.vms-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px 4px 6px 6px;
}
.vms-list::-webkit-scrollbar { width: 6px; }
.vms-list::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 3px; }

.vms-empty {
  padding: 16px 12px;
  text-align: center;
  color: #555;
  font-size: 12.5px;
}

.vms-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  background: transparent;
  border: none;
  padding: 7px 10px;
  border-radius: 4px;
  color: #ccc;
  font-family: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition: background-color 100ms;
}
.vms-item:hover {
  background: rgba(255, 255, 255, 0.04);
  color: #fff;
}
.vms-item--selected {
  color: #fff;
}
.vms-item--selected:hover {
  background: rgba(255, 0, 0, 0.08);
}

.vms-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: 1.5px solid #333;
  background: #0d0d0d;
  color: #fff;
  flex-shrink: 0;
  transition: all 120ms;
}
.vms-item--selected .vms-check {
  background: #ff0000;
  border-color: #ff0000;
}
.vms-item:hover .vms-check {
  border-color: #555;
}
.vms-item--selected:hover .vms-check {
  border-color: #ff0000;
}

.vms-item-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vms-panel-footer {
  padding: 6px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  text-align: right;
}
.vms-count-small {
  font-size: 11px;
  color: #666;
  letter-spacing: 0.3px;
}
</style>
