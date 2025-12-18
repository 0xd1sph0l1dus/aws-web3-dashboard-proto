<template>
  <div class="dashboard">
    <div class="welcome">
      <h1>Welcome to Your Dashboard</h1>
      <p>Connected wallet: <strong>{{ userStore.walletAddress }}</strong></p>
    </div>

    <TransactionList />
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from '@/stores/user.store';
import TransactionList from '@/components/TransactionList.vue';

const userStore = useUserStore();
</script>

<style scoped>
.dashboard {
  width: 100%;
}

.welcome {
  background: rgba(30, 41, 59, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 1rem;
  padding: 2rem;
  margin-bottom: 2rem;
  text-align: center;
}

.welcome h1 {
  font-size: 2rem;
  color: #60a5fa;
  margin-bottom: 1rem;
}

.welcome p {
  color: #cbd5e1;
  font-size: 1.125rem;
}

.welcome strong {
  color: #60a5fa;
  font-family: monospace;
}
</style>
