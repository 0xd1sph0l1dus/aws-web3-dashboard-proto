import { ethers } from 'ethers';

/**
 * Service pour gérer les interactions Web3 (MetaMask)
 * 
 * Concept SAA-C03 :
 * - Frontend interagit avec MetaMask (pas de clés privées stockées)
 * - Signature ECDSA pour authentification (pas de password)
 */
class Web3Service {
    private provider: ethers.BrowserProvider | null = null;
    private signer: ethers.JsonRpcSigner | null = null;

    /**
     * Vérifier si MetaMask est installé
     */
    isMetaMaskInstalled(): boolean {
        return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
    }

    /**
     * Connecter MetaMask
     */
    async connect(): Promise<string> {
        if (!this.isMetaMaskInstalled()) {
            throw new Error('MetaMask is not installed. Please install MetaMask extension.');
        }

        try {
            // Request account access
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts',
            });

            if (!accounts || accounts.length === 0) {
                throw new Error('No accounts found');
            }

            // Create provider and signer
            this.provider = new ethers.BrowserProvider(window.ethereum);
            this.signer = await this.provider.getSigner();

            const address = await this.signer.getAddress();
            console.log('Connected to MetaMask:', address);

            return address;
        } catch (error) {
            console.error('Error connecting to MetaMask:', error);
            throw error;
        }
    }

    /**
     * Obtenir l'adresse du wallet connecté
     */
    async getAddress(): Promise<string | null> {
        if (!this.signer) {
            return null;
        }
        return await this.signer.getAddress();
    }

    /**
     * Signer un message (pour authentification Cognito)
     */
    async signMessage(message: string): Promise<string> {
        if (!this.signer) {
            throw new Error('Wallet not connected');
        }

        try {
            const signature = await this.signer.signMessage(message);
            console.log('Message signed:', signature);
            return signature;
        } catch (error) {
            console.error('Error signing message:', error);
            throw error;
        }
    }

    /**
     * Obtenir le solde du wallet
     */
    async getBalance(address: string): Promise<string> {
        if (!this.provider) {
            throw new Error('Provider not initialized');
        }

        try {
            const balance = await this.provider.getBalance(address);
            return ethers.formatEther(balance);
        } catch (error) {
            console.error('Error getting balance:', error);
            throw error;
        }
    }

    /**
     * Changer de réseau (Sepolia)
     */
    async switchToSepolia(): Promise<void> {
        if (!this.isMetaMaskInstalled()) {
            throw new Error('MetaMask not installed');
        }

        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0xaa36a7' }], // Sepolia chainId
            });
        } catch (error: any) {
            // Si le réseau n'existe pas, l'ajouter
            if (error.code === 4902) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [
                        {
                            chainId: '0xaa36a7',
                            chainName: 'Sepolia Test Network',
                            nativeCurrency: {
                                name: 'SepoliaETH',
                                symbol: 'ETH',
                                decimals: 18,
                            },
                            rpcUrls: ['https://sepolia.infura.io/v3/'],
                            blockExplorerUrls: ['https://sepolia.etherscan.io'],
                        },
                    ],
                });
            } else {
                throw error;
            }
        }
    }

    /**
     * Écouter les changements de compte
     */
    onAccountsChanged(callback: (accounts: string[]) => void): void {
        if (!this.isMetaMaskInstalled()) {
            return;
        }

        window.ethereum.on('accountsChanged', callback);
    }

    /**
     * Écouter les changements de réseau
     */
    onChainChanged(callback: (chainId: string) => void): void {
        if (!this.isMetaMaskInstalled()) {
            return;
        }

        window.ethereum.on('chainChanged', callback);
    }

    /**
     * Déconnecter
     */
    disconnect(): void {
        this.provider = null;
        this.signer = null;
    }
}

export const web3Service = new Web3Service();

// Type declarations for window.ethereum
declare global {
    interface Window {
        ethereum?: any;
    }
}
