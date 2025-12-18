import axios, { AxiosInstance } from 'axios';
import type { Transaction, Alert, UserPreferences, User } from '@/types';
import { authService } from './auth.service';
import { configService } from './config.service';

/**
 * Service pour gérer les appels API vers API Gateway
 * 
 * Concept SAA-C03 :
 * - API Gateway avec Cognito Authorizer
 * - JWT token dans Authorization header
 * - Retry logic pour résilience
 */
class ApiService {
    private client: AxiosInstance | null = null;

    /**
     * Initialiser le client Axios
     */
    async initialize(): Promise<void> {
        const config = await configService.loadConfig();

        this.client = axios.create({
            baseURL: config.apiUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Interceptor pour ajouter le token JWT
        this.client.interceptors.request.use(
            async (config) => {
                const token = await authService.getIdToken();
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );

        // Interceptor pour gérer les erreurs
        this.client.interceptors.response.use(
            (response) => response,
            async (error) => {
                if (error.response?.status === 401) {
                    // Token expiré, essayer de rafraîchir
                    try {
                        await authService.refreshSession();
                        // Retry la requête
                        return this.client!.request(error.config);
                    } catch {
                        // Échec du refresh, déconnecter
                        authService.signOut();
                        window.location.href = '/';
                    }
                }
                return Promise.reject(error);
            }
        );
    }

    /**
     * Obtenir les transactions d'un wallet
     */
    async getTransactions(walletAddress: string): Promise<Transaction[]> {
        if (!this.client) {
            await this.initialize();
        }

        try {
            const response = await this.client!.get('/transactions', {
                params: { wallet: walletAddress },
            });

            return response.data.transactions || [];
        } catch (error) {
            console.error('Error fetching transactions:', error);
            throw error;
        }
    }

    /**
     * Créer une alerte
     */
    async createAlert(alert: {
        wallet_address: string;
        condition: 'balance_above' | 'balance_below' | 'transaction_detected';
        threshold?: string;
        notification_email?: string;
    }): Promise<Alert> {
        if (!this.client) {
            await this.initialize();
        }

        try {
            const response = await this.client!.post('/alerts', alert);
            return response.data;
        } catch (error) {
            console.error('Error creating alert:', error);
            throw error;
        }
    }

    /**
     * Obtenir les préférences utilisateur
     */
    async getPreferences(): Promise<User> {
        if (!this.client) {
            await this.initialize();
        }

        try {
            const response = await this.client!.get('/preferences');
            return response.data;
        } catch (error) {
            console.error('Error fetching preferences:', error);
            throw error;
        }
    }

    /**
     * Mettre à jour les préférences utilisateur
     */
    async updatePreferences(preferences: Partial<UserPreferences>): Promise<User> {
        if (!this.client) {
            await this.initialize();
        }

        try {
            const response = await this.client!.put('/preferences', preferences);
            return response.data;
        } catch (error) {
            console.error('Error updating preferences:', error);
            throw error;
        }
    }
}

export const apiService = new ApiService();
