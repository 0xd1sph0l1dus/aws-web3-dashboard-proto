import { VerifyAuthChallengeResponseTriggerHandler } from 'aws-lambda';
import * as ethers from 'ethers';

/**
 * Verify Auth Challenge Lambda
 * 
 * SAA-C03 Concepts:
 * - Lambda pour vérification cryptographique (Domaine 1: Sécurité)
 * - Error handling et retry logic (Domaine 2: Résilience)
 * - Performance optimisée avec ethers.js (Domaine 3: Performance)
 * 
 * Cette Lambda vérifie la signature ECDSA du message avec la clé publique
 */
export const handler: VerifyAuthChallengeResponseTriggerHandler = async (event) => {
  console.log('Verify Auth Challenge triggered:', JSON.stringify({
    challengeAnswer: event.request.challengeAnswer ? 'PROVIDED' : 'MISSING',
    walletAddress: event.request.privateChallengeParameters?.walletAddress
  }));

  try {
    // Récupère les paramètres du challenge
    const { privateChallengeParameters, challengeAnswer } = event.request;
    
    if (!privateChallengeParameters || !challengeAnswer) {
      console.error('Missing challenge parameters or answer');
      event.response.answerCorrect = false;
      return event;
    }

    const { message, walletAddress, timestamp } = privateChallengeParameters;
    
    // Vérifie que le challenge n'est pas expiré (5 minutes max)
    const challengeTime = new Date(timestamp).getTime();
    const currentTime = new Date().getTime();
    const timeDiff = currentTime - challengeTime;
    
    if (timeDiff > 5 * 60 * 1000) { // 5 minutes en millisecondes
      console.error('Challenge expired:', { timeDiff, maxAllowed: 300000 });
      event.response.answerCorrect = false;
      return event;
    }

    // Vérifie la signature ECDSA avec ethers.js
    try {
      // Récupère l'adresse du signataire depuis la signature
      const recoveredAddress = ethers.verifyMessage(message, challengeAnswer);
      
      // Compare avec l'adresse attendue (case insensitive)
      const isValid = recoveredAddress.toLowerCase() === walletAddress.toLowerCase();
      
      if (isValid) {
        console.log('Signature verified successfully for wallet:', walletAddress);
        event.response.answerCorrect = true;
      } else {
        console.error('Signature verification failed:', {
          expected: walletAddress.toLowerCase(),
          recovered: recoveredAddress.toLowerCase()
        });
        event.response.answerCorrect = false;
      }
    } catch (signatureError) {
      console.error('Error verifying signature:', signatureError);
      event.response.answerCorrect = false;
    }
    
  } catch (error) {
    console.error('Unexpected error in verify auth challenge:', error);
    event.response.answerCorrect = false;
  }

  return event;
};

/**
 * Points clés pour l'examen SAA-C03:
 * 
 * 1. SÉCURITÉ CRYPTOGRAPHIQUE (Domaine 1 - 30%):
 *    - ECDSA secp256k1 = standard Ethereum
 *    - Pas de stockage de clés privées
 *    - TTL 5 minutes = fenêtre d'attaque limitée
 *    - Case-insensitive comparison = UX friendly
 * 
 * 2. RÉSILIENCE (Domaine 2 - 26%):
 *    - Try-catch multiple niveaux
 *    - Logging détaillé pour debug
 *    - Lambda DLQ pour erreurs non gérées
 *    - CloudWatch Insights pour analyse
 * 
 * 3. PERFORMANCE (Domaine 3 - 24%):
 *    - ethers.js optimisé vs web3.js
 *    - Vérification locale (pas d'API call)
 *    - Lambda 256MB pour crypto ops
 *    - Cold start < 1s avec Layer
 * 
 * 4. MONITORING recommandé:
 *    - CloudWatch Metric: SignatureVerificationFailure
 *    - Alarm si > 10 échecs/minute (attaque possible)
 *    - X-Ray pour tracer latence ethers.js
 * 
 * 5. BEST PRACTICES Well-Architected:
 *    - Security: Zero-trust, signature verification
 *    - Reliability: Graceful error handling
 *    - Performance: Optimized crypto library
 *    - Cost: Minimal compute requirements
 *    - Operations: Structured logging
 * 
 * 6. QUESTIONS D'EXAMEN types:
 *    Q: "Comment sécuriser l'auth sans stocker de secrets?"
 *    R: Signature côté client + vérification côté serveur
 *    
 *    Q: "Quelle config Lambda pour crypto operations?"
 *    R: 256MB RAM minimum, timeout 10s, ARM Graviton2
 */
