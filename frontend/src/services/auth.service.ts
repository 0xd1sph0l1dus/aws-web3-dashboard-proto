import {
    CognitoUserPool,
    CognitoUser,
    AuthenticationDetails,
    CognitoUserSession,
} from 'amazon-cognito-identity-js';
import { configService } from './config.service';
import { web3Service } from './web3.service';

/**
 * Service pour gérer l'authentification Cognito avec Web3
 * 
 * Concept SAA-C03 :
 * - Custom Auth Flow : Cognito + Lambda triggers
 * - Pas de password : Signature ECDSA avec MetaMask
 * - JWT tokens : ID token, Access token, Refresh token
 */
class AuthService {
    private userPool: CognitoUserPool | null = null;
    private currentUser: CognitoUser | null = null;

    /**
     * Initialiser le User Pool
     */
    async initialize(): Promise<void> {
        const config = await configService.loadConfig();

        this.userPool = new CognitoUserPool({
            UserPoolId: config.cognito.userPoolId,
            ClientId: config.cognito.userPoolClientId,
        });
    }

    /**
     * Authentification Web3 avec MetaMask
     * 
     * Flow :
     * 1. Connecter MetaMask
     * 2. Initier custom auth avec Cognito
     * 3. Cognito appelle Lambda (create-auth-challenge) → génère nonce
     * 4. Signer le nonce avec MetaMask
     * 5. Envoyer la signature à Cognito
     * 6. Cognito appelle Lambda (verify-auth-challenge) → vérifie signature
     * 7. Recevoir JWT tokens
     */
    async signInWithWeb3(): Promise<CognitoUserSession> {
        if (!this.userPool) {
            await this.initialize();
        }

        try {
            // Step 1: Connect MetaMask
            const walletAddress = await web3Service.connect();
            console.log('Wallet connected:', walletAddress);

            // Step 2: Create Cognito user with wallet address as username
            const cognitoUser = new CognitoUser({
                Username: walletAddress.toLowerCase(),
                Pool: this.userPool!,
            });

            // Step 3: Initiate custom auth flow
            return new Promise((resolve, reject) => {
                cognitoUser.initiateAuth(
                    new AuthenticationDetails({
                        Username: walletAddress.toLowerCase(),
                    }),
                    {
                        customChallenge: async (challengeParameters) => {
                            console.log('Custom challenge received:', challengeParameters);

                            try {
                                // Step 4: Get nonce from challenge
                                const nonce = challengeParameters.nonce;

                                // Step 5: Sign nonce with MetaMask
                                const signature = await web3Service.signMessage(nonce);

                                // Step 6: Send signature to Cognito
                                cognitoUser.sendCustomChallengeAnswer(signature, this);
                            } catch (error) {
                                console.error('Error signing challenge:', error);
                                reject(error);
                            }
                        },
                        onSuccess: (session) => {
                            console.log('Authentication successful');
                            this.currentUser = cognitoUser;
                            resolve(session);
                        },
                        onFailure: (error) => {
                            console.error('Authentication failed:', error);
                            reject(error);
                        },
                    }
                );
            });
        } catch (error) {
            console.error('Error in signInWithWeb3:', error);
            throw error;
        }
    }

    /**
     * Obtenir la session actuelle
     */
    async getCurrentSession(): Promise<CognitoUserSession | null> {
        if (!this.userPool) {
            await this.initialize();
        }

        const cognitoUser = this.userPool!.getCurrentUser();
        if (!cognitoUser) {
            return null;
        }

        return new Promise((resolve, reject) => {
            cognitoUser.getSession((error: Error | null, session: CognitoUserSession | null) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(session);
                }
            });
        });
    }

    /**
     * Obtenir l'ID token (JWT)
     */
    async getIdToken(): Promise<string | null> {
        const session = await this.getCurrentSession();
        return session?.getIdToken().getJwtToken() || null;
    }

    /**
     * Obtenir l'Access token (JWT)
     */
    async getAccessToken(): Promise<string | null> {
        const session = await this.getCurrentSession();
        return session?.getAccessToken().getJwtToken() || null;
    }

    /**
     * Vérifier si l'utilisateur est authentifié
     */
    async isAuthenticated(): Promise<boolean> {
        try {
            const session = await this.getCurrentSession();
            return session?.isValid() || false;
        } catch {
            return false;
        }
    }

    /**
     * Déconnexion
     */
    signOut(): void {
        if (this.currentUser) {
            this.currentUser.signOut();
            this.currentUser = null;
        }
        web3Service.disconnect();
    }

    /**
     * Rafraîchir la session
     */
    async refreshSession(): Promise<CognitoUserSession> {
        if (!this.userPool) {
            await this.initialize();
        }

        const cognitoUser = this.userPool!.getCurrentUser();
        if (!cognitoUser) {
            throw new Error('No current user');
        }

        return new Promise((resolve, reject) => {
            cognitoUser.getSession((error: Error | null, session: CognitoUserSession | null) => {
                if (error) {
                    reject(error);
                    return;
                }

                if (!session) {
                    reject(new Error('No session'));
                    return;
                }

                const refreshToken = session.getRefreshToken();
                cognitoUser.refreshSession(refreshToken, (err, newSession) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(newSession);
                    }
                });
            });
        });
    }
}

export const authService = new AuthService();
