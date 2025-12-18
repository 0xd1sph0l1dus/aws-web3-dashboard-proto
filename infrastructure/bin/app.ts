#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AuthStack } from '../lib/stacks/auth-stack';
import { DatabaseStack } from '../lib/stacks/database-stack';
import { ApiStack } from '../lib/stacks/api-stack';
import { FrontendStack } from '../lib/stacks/frontend-stack';
// TODO: Uncomment when stack is implemented
// import { MonitoringStack } from '../lib/stacks/monitoring-stack';
import * as dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const app = new cdk.App();

// Configuration de l'environnement AWS
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'eu-west-3', // Paris (proximité utilisateur)
};

// Tags communs pour tous les stacks (bonne pratique SAA-C03)
const commonTags = {
  Project: 'Web3TransactionDashboard',
  Environment: process.env.ENVIRONMENT || 'dev',
  ManagedBy: 'CDK',
  CostCenter: 'SAA-C03-Certification',
  Owner: process.env.OWNER || 'student',
};

/**
 * ÉTAPE 1 : Authentication Stack
 * 
 * Services AWS :
 * - Amazon Cognito User Pool (authentification)
 * - Lambda triggers (Custom Auth Flow pour Web3)
 * 
 * Concepts SAA-C03 :
 * - Sécurité : Cognito vs IAM Users (séparation des responsabilités)
 * - Sécurité : Custom authentication flow
 * - Résilience : Service managé Multi-AZ
 */
const authStack = new AuthStack(app, 'Web3DashboardAuthStack', {
  env,
  description: 'Authentication stack with Cognito and Web3 support (SAA-C03)',
  tags: commonTags,
});

/**
 * ÉTAPE 2 : Database Stack
 * 
 * Services AWS :
 * - Amazon DynamoDB (NoSQL, serverless)
 * - DynamoDB GSI (Global Secondary Index)
 * 
 * Concepts SAA-C03 :
 * - Performance : DynamoDB vs RDS (latence < 10ms)
 * - Coût : On-Demand vs Provisioned billing
 * - Résilience : Multi-AZ automatique, PITR
 */
const databaseStack = new DatabaseStack(app, 'Web3DashboardDatabaseStack', {
  env,
  description: 'DynamoDB tables with GSI for user data (SAA-C03)',
  tags: commonTags,
});

/**
 * ÉTAPE 3 : API Stack
 * 
 * Services AWS :
 * - Amazon API Gateway (REST API)
 * - AWS Lambda (compute serverless)
 * - AWS Secrets Manager (API keys)
 * 
 * Concepts SAA-C03 :
 * - Performance : API Gateway caching, Lambda ARM
 * - Sécurité : Cognito Authorizer, Secrets Manager
 * - Coût : Lambda ARM (Graviton2) = -20% coût
 */
const apiStack = new ApiStack(app, 'Web3DashboardApiStack', {
  env,
  description: 'API Gateway + Lambda functions with caching (SAA-C03)',
  tags: commonTags,
  userPool: authStack.userPool,
  usersTable: databaseStack.usersTable,
  alertsTable: databaseStack.alertsTable,
  transactionsCacheTable: databaseStack.transactionsCacheTable,
});

/**
 * ÉTAPE 4 : Frontend Stack
 * 
 * Services AWS :
 * - Amazon S3 (static hosting)
 * - Amazon CloudFront (CDN)
 * 
 * Concepts SAA-C03 :
 * - Performance : Edge caching (400+ locations)
 * - Sécurité : HTTPS obligatoire, OAI
 * - Coût : S3 + CloudFront < EC2
 */
const frontendStack = new FrontendStack(app, 'Web3DashboardFrontendStack', {
  env,
  description: 'S3 + CloudFront for Vue.js frontend (SAA-C03)',
  tags: commonTags,
  apiUrl: apiStack.apiUrl,
  userPoolId: authStack.userPool.userPoolId,
  userPoolClientId: authStack.userPoolClient.userPoolClientId,
});

// TODO: Uncomment when stack is implemented
/*
const monitoringStack = new MonitoringStack(app, 'Web3DashboardMonitoringStack', {
  env,
  description: 'CloudWatch monitoring and alarms (SAA-C03)',
  tags: commonTags,
  apiGateway: apiStack.api,
  lambdaFunctions: apiStack.lambdaFunctions,
  distribution: frontendStack.distribution,
});
*/

// Dépendances entre stacks (ordre de déploiement)
databaseStack.addDependency(authStack);
apiStack.addDependency(databaseStack);
frontendStack.addDependency(apiStack);
// monitoringStack.addDependency(frontendStack);

// Outputs globaux (affichés après déploiement)
// Note: CfnOutput must be created within a Stack scope
new cdk.CfnOutput(authStack, 'ProjectName', {
  value: 'Web3 Transaction Dashboard',
  description: 'AWS SAA-C03 Certification Project',
});

new cdk.CfnOutput(authStack, 'DeploymentRegion', {
  value: env.region || 'eu-west-3',
  description: 'AWS Region (Paris for low latency)',
});

new cdk.CfnOutput(authStack, 'EstimatedMonthlyCost', {
  value: '$19 USD (1000 users, Free Tier included)',
  description: 'Estimated cost based on Well-Architected Review',
});

app.synth();
