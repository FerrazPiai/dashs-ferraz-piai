<script setup>
import { onMounted, nextTick } from 'vue'
import { RouterLink } from 'vue-router'
import TcPainelGeral from './components/TcPainelGeral.vue'

onMounted(async () => {
  await nextTick()
  if (window.lucide) window.lucide.createIcons()
})
</script>

<template>
  <div class="dashboard-container">
    <div class="sticky-header-wrap">
      <div class="main-header">
        <div class="header-title">
          <h1 class="main-title">Torre de Controle</h1>
          <span class="title-sep">|</span>
          <h2 class="main-subtitle">Painel Geral</h2>
        </div>
        <div class="main-actions">
          <RouterLink to="/torre-de-controle" class="btn btn-painel-geral active">
            <i data-lucide="arrow-left" class="btn-icon"></i>
            <span>Voltar a Matriz</span>
          </RouterLink>
        </div>
      </div>
    </div>

    <TcPainelGeral />
  </div>
</template>

<style scoped>
.sticky-header-wrap {
  position: sticky; top: -1px; z-index: 20;
  background: var(--bg-body); padding: 14px 0 12px;
  border-bottom: 1px solid var(--border-row);
  margin-bottom: var(--spacing-md);
}
.sticky-header-wrap .main-header {
  margin-bottom: 0; padding-bottom: 0; border-bottom: none;
  gap: 8px;
}
.header-title { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
.title-sep { font-size: 20px; color: var(--border-input); font-weight: 300; }
.main-subtitle {
  font-size: 18px; font-weight: var(--font-weight-normal);
  color: var(--text-muted); margin: 0;
}

.btn-painel-geral {
  display: inline-flex; align-items: center; gap: 6px;
  background: var(--color-primary); border: 1px solid var(--color-primary);
  color: var(--text-high); padding: 8px 14px;
  border-radius: var(--radius-md); font-family: inherit; font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  text-decoration: none;
  cursor: pointer; transition: all var(--transition-fast);
}
.btn-painel-geral:hover {
  background: var(--color-primary-dark);
  border-color: var(--color-primary-dark);
}
.btn-icon { width: 14px; height: 14px; }
</style>
