import { DefineAuthChallengeTriggerHandler } from 'aws-lambda';

/**
 * Define Auth Challenge Lambda
 * 
 * SAA-C03 Concepts:
 * - Cognito Custom Authentication Flow (Domaine 1: Sécurité)
 * - Lambda Event-Driven Architecture (Domaine 3: Performance)
 * - Serverless compute (Domaine 4: Coût)
 * 
 * Cette Lambda définit la séquence d'authentification pour Web3:
 * 1. Pas de SRP (Secure Remote Password) - on utilise CUSTOM_CHALLENGE
 * 2. Un seul challenge: signature du message avec MetaMask
 * 3. Si signature valide -> authentification réussie
 */
export const handler: DefineAuthChallengeTriggerHandler = async (event) => {
  console.log('Define Auth Challenge triggered:', JSON.stringify(event.request));

  // Récupère l'état actuel de l'authentification
  const { session } = event.request;

  // Si pas de session, c'est la première tentative
  if (!session || session.length === 0) {
    // Initie un CUSTOM_CHALLENGE (signature Web3)
    event.response.issueTokens = false;
    event.response.failAuthentication = false;
    event.response.challengeName = 'CUSTOM_CHALLENGE';
  } else {
    // Session existe, vérifie le dernier challenge
    const lastChallenge = session[session.length - 1];
    
    if (
      lastChallenge.challengeName === 'CUSTOM_CHALLENGE' &&
      lastChallenge.challengeResult === true
    ) {
      // Challenge réussi -> émet les tokens JWT
      event.response.issueTokens = true;
      event.response.failAuthentication = false;
    } else if (
      lastChallenge.challengeName === 'CUSTOM_CHALLENGE' &&
      lastChallenge.challengeResult === false
    ) {
      // Challenge échoué mais on permet jusqu'à 3 tentatives
      const attempts = session.filter(
        (attempt) => attempt.challengeName === 'CUSTOM_CHALLENGE'
      ).length;

      if (attempts >= 3) {
        // Trop de tentatives -> échec définitif
        event.response.issueTokens = false;
        event.response.failAuthentication = true;
      } else {
        // Nouvelle tentative permise
        event.response.issueTokens = false;
        event.response.failAuthentication = false;
        event.response.challengeName = 'CUSTOM_CHALLENGE';
      }
    }
  }

  console.log('Define Auth Challenge response:', JSON.stringify(event.response));
  return event;
};

/**
 * Points clés pour l'examen SAA-C03:
 * 
 * 1. POURQUOI Lambda pour l'authentification ?
 *    - Serverless = pas d'infrastructure à gérer
 *    - Auto-scaling = supporte pics de connexions
 *    - Pay-per-use = économique pour auth sporadique
 * 
 * 2. SÉCURITÉ (Domaine 1 - 30%):
 *    - Pas de stockage de secrets (signature côté client)
 *    - Limite à 3 tentatives (anti brute-force)
 *    - JWT tokens avec expiration courte
 * 
 * 3. RÉSILIENCE (Domaine 2 - 26%):
 *    - Lambda retry automatique (2x)
 *    - Dead Letter Queue pour erreurs
 *    - CloudWatch Logs pour audit
 * 
 * 4. ALTERNATIVES moins adaptées:
 *    - EC2 + custom auth: sur-architecture, coût fixe
 *    - API Gateway Lambda Authorizer: pas d'intégration Cognito
 *    - Cognito standard flow: pas compatible Web3
 */
