import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

/**
 * ApiStackProps - Props pour ApiStack
 */
export interface ApiStackProps extends cdk.StackProps {
    userPool: cognito.UserPool;
    usersTable: dynamodb.Table;
    alertsTable: dynamodb.Table;
    transactionsCacheTable: dynamodb.Table;
}

/**
 * ApiStack - API Gateway REST + Lambda functions
 * 
 * Services AWS :
 * - Amazon API Gateway (REST API)
 * - AWS Lambda (compute serverless)
 * - Amazon Cognito (Authorizer)
 * - AWS Secrets Manager (Etherscan API key)
 * 
 * Concepts SAA-C03 :
 * - Domaine 1 (Sécurité) : Cognito Authorizer, IAM policies
 * - Domaine 3 (Performance) : API Gateway caching, Lambda ARM
 * - Domaine 4 (Coût) : Pay-per-request, Lambda ARM (-20%)
 */
export class ApiStack extends cdk.Stack {
    public readonly api: apigateway.RestApi;
    public readonly apiUrl: string;
    public readonly lambdaFunctions: lambda.Function[];

    constructor(scope: Construct, id: string, props: ApiStackProps) {
        super(scope, id, props);

        this.lambdaFunctions = [];

        /**
         * API Gateway REST API
         * 
         * Concept SAA-C03 :
         * - REST API vs HTTP API : REST = plus de features (caching, WAF)
         * - Deploy stage = environnement (dev, prod)
         * - CloudWatch Logs pour debugging
         */
        this.api = new apigateway.RestApi(this, 'Web3DashboardApi', {
            restApiName: 'web3-dashboard-api',
            description: 'API for Web3 Transaction Dashboard (SAA-C03)',

            // CORS pour frontend Vue.js
            defaultCorsPreflightOptions: {
                allowOrigins: apigateway.Cors.ALL_ORIGINS, // TODO: Restreindre en prod
                allowMethods: apigateway.Cors.ALL_METHODS,
                allowHeaders: ['Content-Type', 'Authorization'],
            },

            // Deploy automatique
            deployOptions: {
                stageName: 'prod',

                // CloudWatch Logs
                loggingLevel: apigateway.MethodLoggingLevel.INFO,
                dataTraceEnabled: true,
                metricsEnabled: true,

                // Throttling (protection DDoS)
                throttlingBurstLimit: 100,
                throttlingRateLimit: 50,
            },

            // CloudWatch Log Group
            cloudWatchRole: true,
        });

        cdk.Tags.of(this.api).add('Stack', 'API');
        cdk.Tags.of(this.api).add('Service', 'APIGateway');
        cdk.Tags.of(this.api).add('SAA-C03-Domain', 'Security');

        /**
         * Cognito Authorizer
         * 
         * Concept SAA-C03 :
         * - Domaine 1 (Sécurité) : JWT token validation automatique
         * - Pas besoin de Lambda custom authorizer (service managé)
         * - Identity source = Authorization header
         */
        const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(
            this,
            'CognitoAuthorizer',
            {
                cognitoUserPools: [props.userPool],
                authorizerName: 'web3-dashboard-authorizer',
                identitySource: 'method.request.header.Authorization',
            }
        );

        /**
         * Lambda : Get Transactions
         * 
         * Endpoint : GET /transactions?wallet={address}
         * 
         * Flow :
         * 1. Check DynamoDB cache
         * 2. If miss, call Etherscan API
         * 3. Store in cache (TTL 30 min)
         * 4. Return transactions
         * 
         * Concept SAA-C03 :
         * - Domaine 3 (Performance) : Cache-aside pattern
         * - Domaine 4 (Coût) : Réduit appels Etherscan de 95%
         */
        const getTransactionsLambda = new lambda.Function(this, 'GetTransactionsLambda', {
            functionName: 'web3-dashboard-get-transactions',
            runtime: lambda.Runtime.NODEJS_20_X,
            architecture: lambda.Architecture.ARM_64, // Graviton2 (-20% coût)
            handler: 'index.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, '../../../backend/api/get-transactions')),
            timeout: cdk.Duration.seconds(30),
            memorySize: 512,

            environment: {
                USERS_TABLE_NAME: props.usersTable.tableName,
                CACHE_TABLE_NAME: props.transactionsCacheTable.tableName,
                ETHERSCAN_API_KEY_SECRET: 'web3-dashboard/etherscan-api-key',
                LOG_LEVEL: 'INFO',
            },

            // CloudWatch Logs
            logRetention: logs.RetentionDays.ONE_WEEK,
        });

        cdk.Tags.of(getTransactionsLambda).add('Stack', 'API');
        cdk.Tags.of(getTransactionsLambda).add('Service', 'Lambda');
        cdk.Tags.of(getTransactionsLambda).add('SAA-C03-Domain', 'Performance');

        // Permissions DynamoDB
        props.usersTable.grantReadData(getTransactionsLambda);
        props.transactionsCacheTable.grantReadWriteData(getTransactionsLambda);

        // Permission Secrets Manager (Etherscan API key)
        getTransactionsLambda.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['secretsmanager:GetSecretValue'],
            resources: [`arn:aws:secretsmanager:${this.region}:${this.account}:secret:web3-dashboard/etherscan-api-key-*`],
        }));

        this.lambdaFunctions.push(getTransactionsLambda);

        /**
         * Lambda : Set Alert
         * 
         * Endpoint : POST /alerts
         * Body : { wallet_address, condition, threshold }
         * 
         * Flow :
         * 1. Validate input
         * 2. Store alert in DynamoDB
         * 3. Return alert_id
         * 
         * Concept SAA-C03 :
         * - Domaine 1 (Sécurité) : Cognito Authorizer vérifie user_id
         * - Domaine 2 (Résilience) : DynamoDB Multi-AZ
         */
        const setAlertLambda = new lambda.Function(this, 'SetAlertLambda', {
            functionName: 'web3-dashboard-set-alert',
            runtime: lambda.Runtime.NODEJS_20_X,
            architecture: lambda.Architecture.ARM_64,
            handler: 'index.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, '../../../backend/api/set-alert')),
            timeout: cdk.Duration.seconds(10),
            memorySize: 256,

            environment: {
                ALERTS_TABLE_NAME: props.alertsTable.tableName,
                LOG_LEVEL: 'INFO',
            },

            logRetention: logs.RetentionDays.ONE_WEEK,
        });

        cdk.Tags.of(setAlertLambda).add('Stack', 'API');
        cdk.Tags.of(setAlertLambda).add('Service', 'Lambda');
        cdk.Tags.of(setAlertLambda).add('SAA-C03-Domain', 'Security');

        props.alertsTable.grantReadWriteData(setAlertLambda);
        this.lambdaFunctions.push(setAlertLambda);

        /**
         * Lambda : Get Preferences
         * 
         * Endpoint : GET /preferences
         * 
         * Flow :
         * 1. Get user_id from Cognito token
         * 2. Query DynamoDB users table
         * 3. Return preferences
         * 
         * Concept SAA-C03 :
         * - Domaine 3 (Performance) : DynamoDB < 10ms latency
         */
        const getPreferencesLambda = new lambda.Function(this, 'GetPreferencesLambda', {
            functionName: 'web3-dashboard-get-preferences',
            runtime: lambda.Runtime.NODEJS_20_X,
            architecture: lambda.Architecture.ARM_64,
            handler: 'index.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, '../../../backend/api/get-preferences')),
            timeout: cdk.Duration.seconds(10),
            memorySize: 256,

            environment: {
                USERS_TABLE_NAME: props.usersTable.tableName,
                LOG_LEVEL: 'INFO',
            },

            logRetention: logs.RetentionDays.ONE_WEEK,
        });

        cdk.Tags.of(getPreferencesLambda).add('Stack', 'API');
        cdk.Tags.of(getPreferencesLambda).add('Service', 'Lambda');
        cdk.Tags.of(getPreferencesLambda).add('SAA-C03-Domain', 'Performance');

        props.usersTable.grantReadData(getPreferencesLambda);
        this.lambdaFunctions.push(getPreferencesLambda);

        /**
         * Lambda : Update Preferences
         * 
         * Endpoint : PUT /preferences
         * Body : { theme, notifications, ... }
         */
        const updatePreferencesLambda = new lambda.Function(this, 'UpdatePreferencesLambda', {
            functionName: 'web3-dashboard-update-preferences',
            runtime: lambda.Runtime.NODEJS_20_X,
            architecture: lambda.Architecture.ARM_64,
            handler: 'index.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, '../../../backend/api/update-preferences')),
            timeout: cdk.Duration.seconds(10),
            memorySize: 256,

            environment: {
                USERS_TABLE_NAME: props.usersTable.tableName,
                LOG_LEVEL: 'INFO',
            },

            logRetention: logs.RetentionDays.ONE_WEEK,
        });

        cdk.Tags.of(updatePreferencesLambda).add('Stack', 'API');
        cdk.Tags.of(updatePreferencesLambda).add('Service', 'Lambda');
        cdk.Tags.of(updatePreferencesLambda).add('SAA-C03-Domain', 'Performance');

        props.usersTable.grantReadWriteData(updatePreferencesLambda);
        this.lambdaFunctions.push(updatePreferencesLambda);

        /**
         * API Routes
         * 
         * Structure :
         * /transactions (GET)
         * /alerts (POST, GET, DELETE)
         * /preferences (GET, PUT)
         */

        // Route : /transactions
        const transactionsResource = this.api.root.addResource('transactions');
        transactionsResource.addMethod('GET', new apigateway.LambdaIntegration(getTransactionsLambda), {
            authorizer: cognitoAuthorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
        });

        // Route : /alerts
        const alertsResource = this.api.root.addResource('alerts');
        alertsResource.addMethod('POST', new apigateway.LambdaIntegration(setAlertLambda), {
            authorizer: cognitoAuthorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
        });

        // Route : /preferences
        const preferencesResource = this.api.root.addResource('preferences');
        preferencesResource.addMethod('GET', new apigateway.LambdaIntegration(getPreferencesLambda), {
            authorizer: cognitoAuthorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
        });
        preferencesResource.addMethod('PUT', new apigateway.LambdaIntegration(updatePreferencesLambda), {
            authorizer: cognitoAuthorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
        });

        /**
         * CloudWatch Alarms
         * 
         * Concept SAA-C03 :
         * - Domaine 5 (Operational Excellence) : Monitoring proactif
         */
        const apiErrorAlarm = this.api.metricServerError({
            period: cdk.Duration.minutes(5),
        }).createAlarm(this, 'ApiErrorAlarm', {
            evaluationPeriods: 2,
            threshold: 10,
            alarmDescription: 'API Gateway 5xx errors (SAA-C03: Reliability)',
            alarmName: 'web3-dashboard-api-errors',
        });

        /**
         * Outputs
         */
        this.apiUrl = this.api.url;

        new cdk.CfnOutput(this, 'ApiUrl', {
            value: this.apiUrl,
            description: 'API Gateway URL (use in frontend)',
            exportName: 'Web3DashboardApiUrl',
        });

        new cdk.CfnOutput(this, 'ApiId', {
            value: this.api.restApiId,
            description: 'API Gateway REST API ID',
            exportName: 'Web3DashboardApiId',
        });
    }
}
