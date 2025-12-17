/**
 * Types temporaires pour éviter les erreurs TypeScript
 * Ces types seront remplacés par les vrais types lors de l'installation des dépendances
 */

// Types simplifiés pour aws-lambda (Cognito triggers)
declare module 'aws-lambda' {
  export interface DefineAuthChallengeRequest {
    userAttributes: Record<string, string>;
    session: Array<{
      challengeName: string;
      challengeResult: boolean;
      challengeMetadata?: string;
    }>;
  }

  export interface DefineAuthChallengeResponse {
    challengeName?: string;
    issueTokens: boolean;
    failAuthentication: boolean;
  }

  export interface DefineAuthChallengeTriggerEvent {
    request: DefineAuthChallengeRequest;
    response: DefineAuthChallengeResponse;
  }

  export type DefineAuthChallengeTriggerHandler = (
    event: DefineAuthChallengeTriggerEvent
  ) => Promise<DefineAuthChallengeTriggerEvent>;

  export interface CreateAuthChallengeRequest {
    userAttributes: Record<string, string>;
    challengeName: string;
    session: Array<any>;
  }

  export interface CreateAuthChallengeResponse {
    publicChallengeParameters: Record<string, string>;
    privateChallengeParameters: Record<string, string>;
    challengeMetadata?: string;
  }

  export interface CreateAuthChallengeTriggerEvent {
    request: CreateAuthChallengeRequest;
    response: CreateAuthChallengeResponse;
  }

  export type CreateAuthChallengeTriggerHandler = (
    event: CreateAuthChallengeTriggerEvent
  ) => Promise<CreateAuthChallengeTriggerEvent>;

  export interface VerifyAuthChallengeRequest {
    userAttributes: Record<string, string>;
    privateChallengeParameters: Record<string, string>;
    challengeAnswer: string;
  }

  export interface VerifyAuthChallengeResponse {
    answerCorrect: boolean;
  }

  export interface VerifyAuthChallengeTriggerEvent {
    request: VerifyAuthChallengeRequest;
    response: VerifyAuthChallengeResponse;
  }

  export type VerifyAuthChallengeResponseTriggerHandler = (
    event: VerifyAuthChallengeTriggerEvent
  ) => Promise<VerifyAuthChallengeTriggerEvent>;
}

// Types simplifiés pour ethers
declare module 'ethers' {
  export function verifyMessage(message: string, signature: string): string;
}
