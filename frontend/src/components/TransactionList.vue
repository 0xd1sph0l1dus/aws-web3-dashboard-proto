<template>
  <div class="transaction-list">
    <div class="header-section">
      <h2>📊 Recent Transactions</h2>
      <button @click="handleRefresh" :disabled="isLoading" class="btn-primary">
        {{ isLoading ? 'Loading...' : '🔄 Refresh' }}
      </button>
    </div>

    <div v-if="error" class="error">
      {{ error }}
    </div>

    <div v-if="isLoading && transactions.length === 0" class="loading">
      Loading transactions...
    </div>

    <div v-else-if="transactions.length === 0" class="empty">
      <p>No transactions found for this wallet.</p>
      <p class="hint">Make sure you're connected to Sepolia testnet.</p>
    </div>

    <div v-else class="transactions">
      <div v-for="tx in transactions" :key="tx.hash" class="transaction-card">
        <div class="tx-header">
          <span class="tx-hash">
            <a :href="`https://sepolia.etherscan.io/tx/${tx.hash}`" target="_blank">
              {{ formatHash(tx.hash) }}
            </a>
          </span>
          <span class="tx-time">{{ formatTime(tx.timeStamp) }}</span>
        </div>
        
        <div class="tx-details">
          <div class="tx-row">
            <span class="label">From:</span>
            <span class="address">{{ formatAddress(tx.from) }}</span>
          </div>
          <div class="tx-row">
            <span class="label">To:</span>
            <span class="address">{{ formatAddress(tx.to) }}</span>
          </div>
          <div class="tx-row">
            <span class="label">Value:</span>
            <span class="value">{{ formatValue(tx.value) }} ETH</span>
          </div>
          <div class="tx-row">
            <span class="label">Block:</span>
            <span>{{ tx.blockNumber }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useUserStore } from '@/stores/user.store';
import type { Transaction } from '@/types';
import { ethers } from 'ethers';

const userStore = useUserStore();

const transactions = ref<Transaction[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);

onMounted(async () => {
  await loadTransactions();
});

const loadTransactions = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    await userStore.loadTransactions();
    transactions.value = userStore.transactions;
  } catch (err: any) {
    error.value = err.message || 'Failed to load transactions';
  } finally {
    isLoading.value = false;
  }
};

const handleRefresh = async () => {
  await loadTransactions();
};

const formatHash = (hash: string): string => {
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
};

const formatAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const formatValue = (value: string): string => {
  try {
    return parseFloat(ethers.formatEther(value)).toFixed(4);
  } catch {
    return '0.0000';
  }
};

const formatTime = (timestamp: string): string => {
  const date = new Date(parseInt(timestamp) * 1000);
  return date.toLocaleString();
};
</script>

<style scoped>
.transaction-list {
  width: 100%;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

h2 {
  font-size: 1.5rem;
  color: #60a5fa;
}

.error {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;
  padding: 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
}

.loading, .empty {
  text-align: center;
  padding: 3rem;
  color: #94a3b8;
}

.empty .hint {
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.transactions {
  display: grid;
  gap: 1rem;
}

.transaction-card {
  background: rgba(30, 41, 59, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 0.75rem;
  padding: 1.5rem;
  transition: all 0.2s;
}

.transaction-card:hover {
  border-color: rgba(96, 165, 250, 0.4);
  transform: translateY(-2px);
}

.tx-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
}

.tx-hash a {
  color: #60a5fa;
  text-decoration: none;
  font-family: monospace;
  font-weight: 600;
}

.tx-hash a:hover {
  text-decoration: underline;
}

.tx-time {
  color: #94a3b8;
  font-size: 0.875rem;
}

.tx-details {
  display: grid;
  gap: 0.75rem;
}

.tx-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label {
  color: #94a3b8;
  font-size: 0.875rem;
  font-weight: 500;
}

.address {
  font-family: monospace;
  color: #cbd5e1;
}

.value {
  color: #34d399;
  font-weight: 600;
}
</style>
