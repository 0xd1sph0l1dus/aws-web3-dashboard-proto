import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User, Transaction, Alert } from '@/types';
import { authService } from '@/services/auth.service';
import { apiService } from '@/services/api.service';
import { web3Service } from '@/services/web3.service';

/**
 * Store Pinia pour gérer l'état utilisateur
 * 
 * Concept :
 * - Centralise l'état de l'application
 * - Gère l'authentification et les données utilisateur
 */
export const useUserStore = defineStore('user', () => {
    // State
    const user = ref<User | null>(null);
    const walletAddress = ref<string | null>(null);
    const isAuthenticated = ref(false);
    const isLoading = ref(false);
    const error = ref<string | null>(null);
    const transactions = ref<Transaction[]>([]);
    const alerts = ref<Alert[]>([]);

    // Computed
    const walletShort = computed(() => {
        if (!walletAddress.value) return '';
        return `${walletAddress.value.slice(0, 6)}...${walletAddress.value.slice(-4)}`;
    });

    // Actions
    async function signIn() {
        isLoading.value = true;
        error.value = null;

        try {
            // Authentification Web3 + Cognito
            const session = await authService.signInWithWeb3();

            // Obtenir l'adresse du wallet
            walletAddress.value = await web3Service.getAddress();

            // Charger les préférences utilisateur
            const userData = await apiService.getPreferences();
            user.value = userData;

            isAuthenticated.value = true;
            console.log('User signed in successfully');
        } catch (err: any) {
            error.value = err.message || 'Authentication failed';
            console.error('Sign in error:', err);
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    async function signOut() {
        authService.signOut();
        user.value = null;
        walletAddress.value = null;
        isAuthenticated.value = false;
        transactions.value = [];
        alerts.value = [];
    }

    async function loadTransactions() {
        if (!walletAddress.value) {
            throw new Error('No wallet connected');
        }

        isLoading.value = true;
        error.value = null;

        try {
            transactions.value = await apiService.getTransactions(walletAddress.value);
        } catch (err: any) {
            error.value = err.message || 'Failed to load transactions';
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    async function createAlert(alertData: {
        condition: 'balance_above' | 'balance_below' | 'transaction_detected';
        threshold?: string;
    }) {
        if (!walletAddress.value) {
            throw new Error('No wallet connected');
        }

        isLoading.value = true;
        error.value = null;

        try {
            const newAlert = await apiService.createAlert({
                wallet_address: walletAddress.value,
                ...alertData,
            });
            alerts.value.push(newAlert);
            return newAlert;
        } catch (err: any) {
            error.value = err.message || 'Failed to create alert';
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    async function updatePreferences(preferences: Partial<User['preferences']>) {
        isLoading.value = true;
        error.value = null;

        try {
            const updatedUser = await apiService.updatePreferences(preferences);
            user.value = updatedUser;
        } catch (err: any) {
            error.value = err.message || 'Failed to update preferences';
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    async function checkAuth() {
        try {
            const authenticated = await authService.isAuthenticated();
            if (authenticated) {
                walletAddress.value = await web3Service.getAddress();
                const userData = await apiService.getPreferences();
                user.value = userData;
                isAuthenticated.value = true;
            }
        } catch (err) {
            console.error('Error checking auth:', err);
            isAuthenticated.value = false;
        }
    }

    return {
        // State
        user,
        walletAddress,
        isAuthenticated,
        isLoading,
        error,
        transactions,
        alerts,
        // Computed
        walletShort,
        // Actions
        signIn,
        signOut,
        loadTransactions,
        createAlert,
        updatePreferences,
        checkAuth,
    };
});
