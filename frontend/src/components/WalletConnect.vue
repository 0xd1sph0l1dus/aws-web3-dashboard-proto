<template>
  <div class="wallet-connect">
    <div class="card">
      <h2>🔐 Connect Your Wallet</h2>
      <p class="description">
        Sign in with your Ethereum wallet using MetaMask.
        No password required - just sign a message to prove ownership.
      </p>

      <div v-if="error" class="error">
        {{ error }}
      </div>

      <button 
        @click="handleConnect" 
        :disabled="isLoading"
        class="btn-primary btn-large"
      >
        <span v-if="isLoading">Connecting...</span>
        <span v-else>🦊 Connect MetaMask</span>
      </button>

      <div class="info">
        <h3>How it works:</h3>
        <ol>
          <li>Click "Connect MetaMask"</li>
          <li>Approve the connection in MetaMask</li>
          <li>Sign a message to authenticate (no gas fees)</li>
          <li>Access your dashboard</li>
        </ol>
      </div>

      <div class="requirements">
        <p><strong>Requirements:</strong></p>
        <ul>
          <li>MetaMask browser extension installed</li>
          <li>Connected to Sepolia testnet</li>
          <li>An Ethereum wallet address</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useUserStore } from '@/stores/user.store';
import { useRouter } from 'vue-router';
import { web3Service } from '@/services/web3.service';

const userStore = useUserStore();
const router = useRouter();

const isLoading = ref(false);
const error = ref<string | null>(null);

const handleConnect = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    // Check if MetaMask is installed
    if (!web3Service.isMetaMaskInstalled()) {
      error.value = 'MetaMask is not installed. Please install MetaMask extension.';
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    // Switch to Sepolia network
    try {
      await web3Service.switchToSepolia();
    } catch (err) {
      console.warn('Could not switch to Sepolia:', err);
    }

    // Sign in with Web3 + Cognito
    await userStore.signIn();

    // Redirect to dashboard
    router.push('/dashboard');
  } catch (err: any) {
    console.error('Connection error:', err);
    error.value = err.message || 'Failed to connect wallet. Please try again.';
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.wallet-connect {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 200px);
}

.card {
  background: rgba(30, 41, 59, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 1rem;
  padding: 2rem;
  max-width: 500px;
  width: 100%;
}

h2 {
  font-size: 2rem;
  margin-bottom: 1rem;
  text-align: center;
  color: #60a5fa;
}

.description {
  text-align: center;
  color: #cbd5e1;
  margin-bottom: 2rem;
  line-height: 1.6;
}

.error {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;
  padding: 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
}

.btn-large {
  width: 100%;
  padding: 1rem;
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 2rem;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.info {
  background: rgba(96, 165, 250, 0.05);
  border: 1px solid rgba(96, 165, 250, 0.2);
  border-radius: 0.5rem;
  padding: 1.5rem;
  margin-bottom: 1rem;
}

.info h3 {
  color: #60a5fa;
  margin-bottom: 0.5rem;
  font-size: 1rem;
}

.info ol {
  margin-left: 1.5rem;
  color: #cbd5e1;
}

.info li {
  margin-bottom: 0.5rem;
}

.requirements {
  background: rgba(148, 163, 184, 0.05);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 0.5rem;
  padding: 1rem;
}

.requirements p {
  color: #94a3b8;
  margin-bottom: 0.5rem;
}

.requirements ul {
  margin-left: 1.5rem;
  color: #cbd5e1;
}

.requirements li {
  margin-bottom: 0.25rem;
}
</style>
