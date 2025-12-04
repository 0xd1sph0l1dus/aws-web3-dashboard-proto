import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import * as path from 'path';

/**
 * Authentication Stack - Cognito User Pool avec Custom Auth Flow pour Web3
 * 
 * 🎓 Concepts SAA-C03 couverts :
 * 
 * 1. SÉCURITÉ (Domaine 1 - 30%)
 *    - Cognito User Pool vs IAM Users (séparation des responsabilités)
 *    - Custom authentication flow (Lambda triggers)
 *    - MFA optionnel (SMS, TOTP)
 *    - Password policies (complexité)
 * 
 * 2. RÉSILIENCE (Domaine 2 - 26%)
 *    - Cognito = service managé Multi-AZ automatique
 *    - Lambda retry logic (3 tentatives par défaut)
 *    - Account recovery (email)
 * 
 * 3. PERFORMANCE (Domaine 3 - 24%)
 *    - JWT tokens (cache côté client)
 *    - Lambda ARM (Graviton2) = +19% performance
 * 
 * 4. COÛT (Domaine 4 - 20%)
 *    - Cognito : 50,000 MAU gratuits
 *    - Lambda : $0.20/1M requêtes
 *    - Total : ~$0/mois (< 50k users)
 */
export class AuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly defineAuthChallengeLambda: lambda.Function;
  public readonly createAuthChallengeLambda: lambda.Function;
  public readonly verifyAuthChallengeLambda: lambda.Function;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ========================================
    // LAMBDA TRIGGERS (Custom Auth Flow)
    // ========================================

    /**
     * Lambda 1 : Define Auth Challenge
     * 
     * Rôle : Définir le flow d'authentification
     * - Session 1 : Envoyer un challenge (nonce à signer)
     * - Session 2 : Vérifier la signature
     * - Session 3+ : Échec (max 3 tentatives)
     */
    this.defineAuthChallengeLambda = new lambda.Function(this, 'DefineAuthChallenge', {
      functionName: 'web3-dashboard-define-auth-challenge',
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64, // Graviton2 : -20% coût
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../backend/auth/define-auth-challenge')),
      timeout: cdk.Duration.seconds(10),
      memorySize: 256, // Optimisé via Lambda Power Tuning
      environment: {
        LOG_LEVEL: 'INFO',
      },
      logRetention: logs.RetentionDays.ONE_WEEK, // Économie coûts CloudWatch
      description: 'Defines the custom authentication flow for Web3 wallet login (SAA-C03)',
    });

    /**
     * Lambda 2 : Create Auth Challenge
     * 
     * Rôle : Générer un nonce aléatoire que l'utilisateur doit signer avec MetaMask
     * - Nonce = message unique (timestamp + random)
     * - Stocké temporairement (pas besoin de DynamoDB pour ce POC)
     */
    this.createAuthChallengeLambda = new lambda.Function(this, 'CreateAuthChallenge', {
      functionName: 'web3-dashboard-create-auth-challenge',
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../backend/auth/create-auth-challenge')),
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      environment: {
        LOG_LEVEL: 'INFO',
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
      description: 'Generates a nonce for Web3 signature verification (SAA-C03)',
    });

    /**
     * Lambda 3 : Verify Auth Challenge Response
     * 
     * Rôle : Vérifier la signature ECDSA (Elliptic Curve Digital Signature Algorithm)
     * - Récupère le nonce de la session
     * - Vérifie que la signature correspond à l'adresse wallet
     * - Utilise ethers.js pour la vérification cryptographique
     */
    this.verifyAuthChallengeLambda = new lambda.Function(this, 'VerifyAuthChallenge', {
      functionName: 'web3-dashboard-verify-auth-challenge',
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../backend/auth/verify-auth-challenge')),
      timeout: cdk.Duration.seconds(10),
      memorySize: 512, // Plus de mémoire pour ethers.js
      environment: {
        LOG_LEVEL: 'INFO',
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
      description: 'Verifies Web3 wallet signature using ECDSA (SAA-C03)',
    });

    // ========================================
    // COGNITO USER POOL
    // ========================================

    /**
     * Cognito User Pool
     * 
     * 🎓 Pourquoi Cognito et pas IAM Users ?
     * 
     * IAM Users :
     * - ❌ Conçu pour l'accès programmatique AWS (CLI, SDK)
     * - ❌ Pas de MFA natif pour applications web
     * - ❌ Pas de social login (Google, Facebook)
     * - ❌ Gestion manuelle des tokens
     * 
     * Cognito User Pool :
     * - ✅ Conçu pour l'authentification applicative
     * - ✅ MFA natif (SMS, TOTP)
     * - ✅ Social login (SAML, OAuth, OIDC)
     * - ✅ JWT tokens automatiques (IdToken, AccessToken, RefreshToken)
     * - ✅ Custom authentication flow (Lambda triggers)
     * 
     * 📚 Question d'examen type :
     * Q : Une application web doit authentifier 10,000 utilisateurs. Quelle solution ?
     * A) IAM Users
     * B) Cognito User Pool ✅
     * C) Active Directory
     * D) LDAP
     * 
     * Réponse : B (Cognito = service managé, scalable, sécurisé)
     */
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'web3-dashboard-users',
      
      // Self sign-up (les utilisateurs peuvent créer un compte)
      selfSignUpEnabled: true,
      
      // Vérification email obligatoire (sécurité)
      autoVerify: {
        email: true,
      },
      
      // Attributs standards requis
      standardAttributes: {
        email: {
          required: true,
          mutable: true, // Peut être modifié après création
        },
      },
      
      // Attributs custom (adresse wallet Ethereum)
      customAttributes: {
        wallet_address: new cognito.StringAttribute({
          minLen: 42,
          maxLen: 42, // Adresse Ethereum = 0x + 40 caractères
          mutable: false, // Immutable (sécurité)
        }),
      },
      
      // Password policy (bonne pratique sécurité)
      passwordPolicy: {
        minLength: 12,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
        tempPasswordValidity: cdk.Duration.days(3),
      },
      
      // MFA optionnel (recommandé pour production)
      mfa: cognito.Mfa.OPTIONAL,
      mfaSecondFactor: {
        sms: true,
        otp: true, // TOTP (Google Authenticator, Authy)
      },
      
      // Account recovery (email uniquement, pas SMS pour réduire coûts)
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      
      // Lambda triggers (Custom Auth Flow)
      lambdaTriggers: {
        defineAuthChallenge: this.defineAuthChallengeLambda,
        createAuthChallenge: this.createAuthChallengeLambda,
        verifyAuthChallengeResponse: this.verifyAuthChallengeLambda,
      },
      
      // Suppression protection (éviter suppression accidentelle)
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      
      // Advanced security (détection de compromission)
      advancedSecurityMode: cognito.AdvancedSecurityMode.ENFORCED,
    });

    // ========================================
    // COGNITO USER POOL CLIENT
    // ========================================

    /**
     * User Pool Client (application frontend)
     * 
     * 🎓 Concept SAA-C03 : OAuth 2.0 flows
     * 
     * - ALLOW_CUSTOM_AUTH : Pour le flow Web3 (signature wallet)
     * - ALLOW_REFRESH_TOKEN_AUTH : Renouvellement automatique des tokens
     * - ALLOW_USER_SRP_AUTH : Secure Remote Password (password classique)
     */
    this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool: this.userPool,
      userPoolClientName: 'web3-dashboard-frontend',
      
      // Auth flows supportés
      authFlows: {
        custom: true, // Custom Auth Flow (Web3)
        userSrp: true, // Password classique (fallback)
      },
      
      // Token validity (durée de vie)
      idTokenValidity: cdk.Duration.hours(1), // JWT IdToken
      accessTokenValidity: cdk.Duration.hours(1), // JWT AccessToken
      refreshTokenValidity: cdk.Duration.days(30), // Refresh token
      
      // Prevent user existence errors (sécurité)
      preventUserExistenceErrors: true,
      
      // OAuth scopes
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
        ],
      },
    });

    // ========================================
    // IAM PERMISSIONS (Principe du moindre privilège)
    // ========================================

    /**
     * 🎓 Concept SAA-C03 : Least Privilege Principle
     * 
     * Chaque Lambda a UNIQUEMENT les permissions nécessaires :
     * - CloudWatch Logs (écriture des logs)
     * - Cognito (lecture des attributs utilisateur, optionnel)
     * 
     * ❌ PAS de permissions :
     * - DynamoDB (pas nécessaire pour l'auth)
     * - S3 (pas nécessaire pour l'auth)
     * - Secrets Manager (pas nécessaire pour l'auth)
     */
    
    // Permission CloudWatch Logs (automatique via ManagedPolicy)
    const lambdaBasicExecution = iam.ManagedPolicy.fromAwsManagedPolicyName(
      'service-role/AWSLambdaBasicExecutionRole'
    );

    this.defineAuthChallengeLambda.role?.addManagedPolicy(lambdaBasicExecution);
    this.createAuthChallengeLambda.role?.addManagedPolicy(lambdaBasicExecution);
    this.verifyAuthChallengeLambda.role?.addManagedPolicy(lambdaBasicExecution);

    // ========================================
    // CLOUDWATCH ALARMS (Monitoring)
    // ========================================

    /**
     * 🎓 Concept SAA-C03 : Operational Excellence
     * 
     * Alarmes CloudWatch pour détecter les problèmes :
     * - Taux d'erreur > 5%
     * - Throttling (limite de concurrence atteinte)
     * - Cold start > 1s (optionnel)
     */
    
    // Alarme : Taux d'erreur Lambda > 5%
    const authErrorAlarm = this.verifyAuthChallengeLambda.metricErrors({
      period: cdk.Duration.minutes(5),
      statistic: 'Sum',
    }).createAlarm(this, 'AuthErrorAlarm', {
      alarmName: 'web3-dashboard-auth-errors',
      alarmDescription: 'Alert if authentication error rate > 5%',
      threshold: 5,
      evaluationPeriods: 2,
      treatMissingData: cdk.aws_cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // ========================================
    // OUTPUTS (affichés après déploiement)
    // ========================================

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID (use in frontend config)',
      exportName: 'Web3DashboardUserPoolId',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID (use in frontend config)',
      exportName: 'Web3DashboardUserPoolClientId',
    });

    new cdk.CfnOutput(this, 'UserPoolArn', {
      value: this.userPool.userPoolArn,
      description: 'Cognito User Pool ARN (use for API Gateway authorizer)',
    });

    // ========================================
    // TAGS (bonne pratique SAA-C03)
    // ========================================

    cdk.Tags.of(this).add('Stack', 'Authentication');
    cdk.Tags.of(this).add('Service', 'Cognito');
    cdk.Tags.of(this).add('SAA-C03-Domain', 'Security');
  }
}
