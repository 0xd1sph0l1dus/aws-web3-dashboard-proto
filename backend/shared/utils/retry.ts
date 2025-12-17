/**
 * Retry utility for Lambda functions
 * 
 * SAA-C03 Concepts:
 * - Exponential backoff (Domaine 2: Résilience)
 * - Circuit breaker pattern (Domaine 2: Résilience)
 * - Error handling best practices (Domaine 2: Résilience)
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
}

/**
 * Retry with exponential backoff
 * 
 * Pattern AWS recommandé pour:
 * - DynamoDB throttling (ProvisionedThroughputExceededException)
 * - Lambda concurrency limits
 * - API Gateway rate limiting
 * - External API transient errors
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 100,
    maxDelayMs = 10000,
    backoffMultiplier = 2,
    retryableErrors = ['ThrottlingException', 'ServiceUnavailable', 'RequestTimeout']
  } = options;

  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Vérifier si l'erreur est retryable
      const isRetryable = retryableErrors.some(retryableError => 
        lastError?.message?.includes(retryableError) ||
        lastError?.name === retryableError
      );
      
      if (!isRetryable || attempt === maxAttempts) {
        throw lastError;
      }
      
      // Calculer le délai avec jitter (éviter thundering herd)
      const baseDelay = Math.min(
        initialDelayMs * Math.pow(backoffMultiplier, attempt - 1),
        maxDelayMs
      );
      const jitter = Math.random() * 0.3 * baseDelay; // 30% jitter
      const delay = baseDelay + jitter;
      
      console.log(`Retry attempt ${attempt}/${maxAttempts} after ${Math.round(delay)}ms`, {
        error: lastError.message,
        attempt,
        delay
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Circuit breaker pour éviter les cascading failures
 * 
 * SAA-C03: Pattern de résilience avancé
 * - OPEN: Toutes les requêtes échouent immédiatement
 * - HALF_OPEN: Test avec une requête
 * - CLOSED: Fonctionnement normal
 */
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000 // 1 minute
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await fn();
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failureCount = 0;
      }
      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      
      if (this.failureCount >= this.threshold) {
        this.state = 'OPEN';
      }
      
      throw error;
    }
  }
}
