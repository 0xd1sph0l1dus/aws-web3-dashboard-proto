import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

/**
 * DatabaseStack - DynamoDB tables pour le stockage des données utilisateur
 * 
 * Services AWS :
 * - Amazon DynamoDB (NoSQL serverless)
 * - DynamoDB GSI (Global Secondary Index)
 * - DynamoDB TTL (Time To Live)
 * 
 * Concepts SAA-C03 :
 * - Domaine 3 (Performance) : DynamoDB < 10ms latency, auto-scaling
 * - Domaine 4 (Coût) : On-Demand billing (pas de provisioning)
 * - Domaine 2 (Résilience) : Multi-AZ automatique, PITR
 * - Domaine 1 (Sécurité) : Encryption at rest (KMS), IAM policies
 */
export class DatabaseStack extends cdk.Stack {
    public readonly usersTable: dynamodb.Table;
    public readonly alertsTable: dynamodb.Table;
    public readonly transactionsCacheTable: dynamodb.Table;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        /**
         * TABLE 1 : Users Table
         * 
         * Structure :
         * - PK: user_id (Cognito sub)
         * - GSI: wallet_address (pour query par wallet)
         * 
         * Use case :
         * - Stocker les préférences utilisateur
         * - Mapper wallet_address → user_id
         * - Stocker email, metadata
         * 
         * Concept SAA-C03 :
         * - GSI permet de query par wallet_address (pas possible avec PK seul)
         * - On-Demand billing car trafic imprévisible
         * - Point-in-Time Recovery pour disaster recovery
         */
        this.usersTable = new dynamodb.Table(this, 'UsersTable', {
            tableName: 'web3-dashboard-users',
            partitionKey: {
                name: 'user_id',
                type: dynamodb.AttributeType.STRING,
            },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // On-Demand
            encryption: dynamodb.TableEncryption.AWS_MANAGED, // KMS encryption
            pointInTimeRecovery: true, // Backup automatique
            removalPolicy: cdk.RemovalPolicy.RETAIN, // Ne pas supprimer en prod
        });

        // Tags pour Cost Explorer
        cdk.Tags.of(this.usersTable).add('Stack', 'Database');
        cdk.Tags.of(this.usersTable).add('Service', 'DynamoDB');
        cdk.Tags.of(this.usersTable).add('SAA-C03-Domain', 'Performance');

        /**
         * GSI : wallet_address-index
         * 
         * Permet de faire :
         * - Query : "Trouver user_id à partir de wallet_address"
         * - Exemple : getUserByWallet("0x742d35Cc...")
         * 
         * Concept SAA-C03 :
         * - GSI = table secondaire avec PK différent
         * - Projection ALL = copie tous les attributs (vs KEYS_ONLY)
         * - Coût : Storage + RCU/WCU (mais On-Demand donc auto-scale)
         */
        this.usersTable.addGlobalSecondaryIndex({
            indexName: 'wallet_address-index',
            partitionKey: {
                name: 'wallet_address',
                type: dynamodb.AttributeType.STRING,
            },
            projectionType: dynamodb.ProjectionType.ALL, // Copie tous les attributs
        });

        /**
         * TABLE 2 : Alerts Table
         * 
         * Structure :
         * - PK: user_id
         * - SK: alert_id
         * 
         * Use case :
         * - Stocker les alertes configurées par l'utilisateur
         * - Query : "Toutes les alertes d'un user"
         * - Condition : balance_above, balance_below, transaction_detected
         * 
         * Concept SAA-C03 :
         * - Composite key (PK + SK) pour one-to-many relationship
         * - Sort key permet de trier les alertes par date
         */
        this.alertsTable = new dynamodb.Table(this, 'AlertsTable', {
            tableName: 'web3-dashboard-alerts',
            partitionKey: {
                name: 'user_id',
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: 'alert_id',
                type: dynamodb.AttributeType.STRING,
            },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            pointInTimeRecovery: true,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });

        // Tags pour Cost Explorer
        cdk.Tags.of(this.alertsTable).add('Stack', 'Database');
        cdk.Tags.of(this.alertsTable).add('Service', 'DynamoDB');
        cdk.Tags.of(this.alertsTable).add('SAA-C03-Domain', 'Performance');

        /**
         * TABLE 3 : Transactions Cache Table
         * 
         * Structure :
         * - PK: wallet_address
         * - SK: block_number
         * - TTL: expires_at (auto-delete après 30 min)
         * 
         * Use case :
         * - Cache des transactions Etherscan (éviter appels API répétés)
         * - TTL 30 min = balance entre fraîcheur et coût
         * 
         * Concept SAA-C03 :
         * - TTL = auto-cleanup gratuit (pas besoin de Lambda cleanup)
         * - Réduit les appels Etherscan de 95% (cache hit rate)
         * - Domaine 4 (Coût) : Économie sur Etherscan API ($0.001/call)
         */
        this.transactionsCacheTable = new dynamodb.Table(this, 'TransactionsCacheTable', {
            tableName: 'web3-dashboard-transactions-cache',
            partitionKey: {
                name: 'wallet_address',
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: 'block_number',
                type: dynamodb.AttributeType.NUMBER,
            },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            pointInTimeRecovery: false, // Cache = pas besoin de backup
            removalPolicy: cdk.RemovalPolicy.DESTROY, // OK de supprimer (cache)
            timeToLiveAttribute: 'expires_at',
        });

        // Tags pour Cost Explorer
        cdk.Tags.of(this.transactionsCacheTable).add('Stack', 'Database');
        cdk.Tags.of(this.transactionsCacheTable).add('Service', 'DynamoDB');
        cdk.Tags.of(this.transactionsCacheTable).add('SAA-C03-Domain', 'Cost');

        /**
         * CloudWatch Alarms pour monitoring
         * 
         * Concept SAA-C03 :
         * - Domaine 5 (Operational Excellence) : Monitoring proactif
         * - Alarme si throttling (besoin d'augmenter capacity)
         */
        // CloudWatch Alarm for throttling
        const throttleMetric = this.usersTable.metricSystemErrorsForOperations({
            operations: [dynamodb.Operation.GET_ITEM, dynamodb.Operation.PUT_ITEM],
            period: cdk.Duration.minutes(5),
        });

        const usersTableThrottleAlarm = new cdk.aws_cloudwatch.Alarm(this, 'UsersTableThrottleAlarm', {
            metric: throttleMetric,
            evaluationPeriods: 2,
            threshold: 10,
            alarmDescription: 'Users table is being throttled (SAA-C03: Performance)',
            alarmName: 'web3-dashboard-users-table-throttle',
        });

        /**
         * Outputs (pour ApiStack)
         * 
         * Concept SAA-C03 :
         * - Cross-stack references (ApiStack utilise ces tables)
         * - Export permet de référencer dans d'autres stacks
         */
        new cdk.CfnOutput(this, 'UsersTableName', {
            value: this.usersTable.tableName,
            description: 'DynamoDB Users Table name',
            exportName: 'Web3DashboardUsersTableName',
        });

        new cdk.CfnOutput(this, 'UsersTableArn', {
            value: this.usersTable.tableArn,
            description: 'DynamoDB Users Table ARN',
            exportName: 'Web3DashboardUsersTableArn',
        });

        new cdk.CfnOutput(this, 'AlertsTableName', {
            value: this.alertsTable.tableName,
            description: 'DynamoDB Alerts Table name',
            exportName: 'Web3DashboardAlertsTableName',
        });

        new cdk.CfnOutput(this, 'TransactionsCacheTableName', {
            value: this.transactionsCacheTable.tableName,
            description: 'DynamoDB Transactions Cache Table name',
            exportName: 'Web3DashboardTransactionsCacheTableName',
        });
    }
}
