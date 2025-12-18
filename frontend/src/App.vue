<template>
  <div id="app" :class="theme">
    <header class="header">
      <div class="container">
        <h1 class="logo">🔗 Web3 Dashboard</h1>
        <nav v-if="userStore.isAuthenticated">
          <span class="wallet-address">{{ userStore.walletShort }}</span>
          <button @click="handleSignOut" class="btn-secondary">Sign Out</button>
        </nav>
      </div>
    </header>

    <main class="main">
      <router-view />
    </main>

    <footer class="footer">
      <p>Web3 Transaction Dashboard - AWS SAA-C03 Project</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useUserStore } from '@/stores/user.store';
import { useRouter } from 'vue-router';

const userStore = useUserStore();
const router = useRouter();

const theme = computed(() => userStore.user?.preferences.theme || 'dark');

onMounted(async () => {
  await userStore.checkAuth();
});

const handleSignOut = async () => {
  await userStore.signOut();
  router.push('/');
};
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  line-height: 1.6;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

#app.dark {
  background: #0f172a;
  color: #e2e8f0;
}

#app.light {
  background: #f8fafc;
  color: #1e293b;
}

.header {
  background: rgba(30, 41, 59, 0.8);
  backdrop-filter: blur(10px);
  padding: 1rem 0;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
}

.header .container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  font-size: 1.5rem;
  font-weight: bold;
  color: #60a5fa;
}

nav {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.wallet-address {
  padding: 0.5rem 1rem;
  background: rgba(96, 165, 250, 0.1);
  border: 1px solid rgba(96, 165, 250, 0.3);
  border-radius: 0.5rem;
  font-family: monospace;
  color: #60a5fa;
}

.main {
  flex: 1;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.footer {
  background: rgba(30, 41, 59, 0.8);
  padding: 1rem;
  text-align: center;
  color: #94a3b8;
  font-size: 0.875rem;
  border-top: 1px solid rgba(148, 163, 184, 0.1);
}

button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #60a5fa;
  color: white;
}

.btn-primary:hover {
  background: #3b82f6;
}

.btn-secondary {
  background: rgba(148, 163, 184, 0.1);
  color: #e2e8f0;
  border: 1px solid rgba(148, 163, 184, 0.3);
}

.btn-secondary:hover {
  background: rgba(148, 163, 184, 0.2);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}
</style>
