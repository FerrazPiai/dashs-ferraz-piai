<template>
  <div class="denied-page">
    <div class="denied-card">
      <div class="denied-icon">
        <i data-lucide="shield-off"></i>
      </div>
      <h1 class="denied-title">Acesso Negado</h1>
      <p class="denied-text">Você não tem permissão para acessar esta página.</p>
      <button class="denied-btn" @click="goBack">Voltar</button>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

onMounted(() => {
  if (window.lucide) lucide.createIcons()
})

function goBack() {
  router.push('/')
}
</script>

<style scoped>
.denied-page {
  min-height: 100vh;
  background: #0d0d0d;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  font-family: 'Ubuntu', 'Segoe UI', sans-serif;
}

.denied-card {
  text-align: center;
  max-width: 380px;
}

.denied-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  background: rgba(255, 0, 0, 0.1);
  border-radius: 50%;
  margin-bottom: 20px;
  color: #ff0000;
}

.denied-icon svg {
  width: 28px;
  height: 28px;
}

.denied-title {
  font-size: 22px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 8px;
}

.denied-text {
  font-size: 14px;
  color: #888;
  margin: 0 0 24px;
}

.denied-btn {
  background: rgba(255, 255, 255, 0.06);
  color: #ccc;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 10px 24px;
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s;
}

.denied-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}
</style>
