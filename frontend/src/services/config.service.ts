import type { AppConfig } from '@/types';

/**
 * Service pour charger la configuration de l'application
 * 
 * La configuration est stockée dans config.json (généré par CDK)
 */
class ConfigService {
    private config: AppConfig | null = null;

    async loadConfig(): Promise<AppConfig> {
        if (this.config) {
            return this.config;
        }

        try {
            const response = await fetch('/config.json');
            if (!response.ok) {
                throw new Error('Failed to load config');
            }
            this.config = await response.json();
            return this.config;
        } catch (error) {
            console.error('Error loading config:', error);
            // Fallback to environment variables (dev only)
            this.config = {
                apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',
                cognito: {
                    userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
                    userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '',
                    region: import.meta.env.VITE_AWS_REGION || 'eu-west-3',
                },
                etherscan: {
                    network: 'sepolia',
                    apiUrl: 'https://api-sepolia.etherscan.io/api',
                },
            };
            return this.config;
        }
    }

    getConfig(): AppConfig | null {
        return this.config;
    }
}

export const configService = new ConfigService();
