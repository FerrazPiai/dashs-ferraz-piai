<template>
  <div
    ref="rootEl"
    class="vs"
    :class="{ 'vs--open': open, 'vs--has-value': hasValue }"
  >
    <button
      type="button"
      class="vs-trigger"
      @click="toggleOpen"
      :aria-expanded="open"
      :aria-haspopup="true"
    >
      <span class="vs-label">{{ label }}</span>
      <span v-if="!hasValue" class="vs-placeholder">{{ placeholder }}</span>
      <span v-else class="vs-value">{{ selectedLabel }}</span>
      <svg class="vs-chevron" width="12" height="8" viewBox="0 0 12 8" fill="none">
        <path d="M1 1l5 5 5-5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <div v-if="open" class="vs-panel" role="listbox">
      <div v-if="showSearch" class="vs-search-wrap">
        <svg class="vs-search-icon" width="12" height="12" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2" />
          <path d="M20 20l-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        <input
          ref="searchEl"
          v-model="busca"
          class="vs-search"
          type="text"
          placeholder="Buscar..."
        />
      </div>

      <div class="vs-list">
        <div v-if="filtered.length === 0" class="vs-empty">Nada encontrado</div>
        <button
          v-for="o in filtered"
          :key="String(o.value)"
          type="button"
          class="vs-item"
          :class="{ 'vs-item--selected': isSelected(o.value) }"
          @click="selectOption(o.value)"
          role="option"
          :aria-selected="isSelected(o.value)"
        >
          <span class="vs-radio">
            <span v-if="isSelected(o.value)" class="vs-radio-dot"></span>
          </span>
          <span class="vs-item-label">{{ o.label }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

const props = defineProps({
  label: { type: String, required: true },
  options: { type: Array, default: () => [] },
  modelValue: { type: [String, Number, null], default: null },
  placeholder: { type: String, default: 'Todos' },
  allValue: { type: [String, Number, null], default: null },
  searchable: { type: Boolean, default: true },
  searchMinOptions: { type: Number, default: 6 }
})
const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const rootEl = ref(null)
const searchEl = ref(null)
const busca = ref('')

const normalized = computed(() =>
  props.options.map(o =>
    typeof o === 'object' && o !== null
      ? { value: o.value, label: String(o.label ?? o.value) }
      : { value: o, label: String(o) }
  )
)

const filtered = computed(() => {
  const q = busca.value.trim().toLowerCase()
  if (!q) return normalized.value
  return normalized.value.filter(o => o.label.toLowerCase().includes(q))
})

const hasValue = computed(() => {
  if (props.modelValue === null || props.modelValue === undefined) return false
  if (props.allValue !== null && props.modelValue === props.allValue) return false
  return true
})

const selectedLabel = computed(() => {
  const found = normalized.value.find(o => o.value === props.modelValue)
  return found?.label ?? String(props.modelValue)
})

const showSearch = computed(() =>
  props.searchable && normalized.value.length > props.searchMinOptions
)

function isSelected(value) {
  return value === props.modelValue
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

function selectOption(value) {
  emit('update:modelValue', value)
  closeDropdown()
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

<style scoped>
.vs {
  position: relative;
  display: inline-flex;
  font-family: inherit;
  min-width: 150px;
}

.vs-trigger {
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

.vs-trigger:hover {
  border-color: #333;
  background: #1c1c1c;
}

.vs--open .vs-trigger {
  border-color: #ff0000;
  background: #1c1c1c;
}

.vs--has-value .vs-trigger {
  border-color: #2a2a2a;
}

.vs-label {
  font-size: 11px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  white-space: nowrap;
  flex-shrink: 0;
}

.vs-placeholder {
  color: #555;
  font-size: 13px;
  flex: 1;
  text-align: left;
}

.vs-value {
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  flex: 1;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.vs-chevron {
  margin-left: auto;
  color: #666;
  transition: transform 180ms;
  flex-shrink: 0;
}

.vs--open .vs-chevron {
  transform: rotate(180deg);
  color: #fff;
}

.vs-panel {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 220px;
  max-width: 320px;
  background: #141414;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  z-index: 50;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 320px;
  animation: vs-in 140ms ease-out;
}

@keyframes vs-in {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}

.vs-search-wrap {
  position: relative;
  padding: 8px 10px 0;
}

.vs-search-icon {
  position: absolute;
  left: 18px;
  top: 50%;
  transform: translateY(-25%);
  color: #555;
  pointer-events: none;
}

.vs-search {
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

.vs-search:focus {
  border-color: #ff0000;
}

.vs-search::placeholder {
  color: #555;
}

.vs-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px 4px 6px 6px;
}

.vs-list::-webkit-scrollbar { width: 6px; }
.vs-list::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 3px; }

.vs-empty {
  padding: 16px 12px;
  text-align: center;
  color: #555;
  font-size: 12.5px;
}

.vs-item {
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

.vs-item:hover {
  background: rgba(255, 255, 255, 0.04);
  color: #fff;
}

.vs-item--selected {
  color: #fff;
}

.vs-item--selected:hover {
  background: rgba(255, 0, 0, 0.08);
}

.vs-radio {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1.5px solid #333;
  background: #0d0d0d;
  flex-shrink: 0;
  transition: all 120ms;
}

.vs-item:hover .vs-radio {
  border-color: #555;
}

.vs-item--selected .vs-radio {
  border-color: #ff0000;
}

.vs-radio-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff0000;
}

.vs-item-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
