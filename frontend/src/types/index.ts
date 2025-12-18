/**
 * Types pour l'application Web3 Transaction Dashboard
 */

export interface Transaction {
    hash: string;
    from: string;
    to: string;
    value: string;
    blockNumber: string;
    timeStamp: string;
    gasUsed: string;
    gasPrice: string;
}

export interface Alert {
    alert_id: string;
    user_id: string;
    wallet_address: string;
    condition: 'balance_above' | 'balance_below' | 'transaction_detected';
    threshold?: string;
    status: 'active' | 'triggered' | 'disabled';
    created_at: string;
    updated_at?: string;
}

export interface UserPreferences {
    theme: 'light' | 'dark' | 'auto';
    notifications: boolean;
    language: string;
    timezone: string;
}

export interface User {
    user_id: string;
    wallet_address?: string;
    email?: string;
    preferences: UserPreferences;
    created_at?: string;
    updated_at?: string;
}

export interface AppConfig {
    apiUrl: string;
    cognito: {
        userPoolId: string;
        userPoolClientId: string;
        region: string;
    };
    etherscan: {
        network: string;
        apiUrl: string;
    };
}
