# 🎓 Mapping SAA-C03 : Compétences couvertes par le projet

> **Guide de révision pour l'examen AWS Certified Solutions Architect – Associate**

---

## 📋 Vue d'ensemble de l'examen

| Domaine | Poids | Questions (~) |
|---------|-------|---------------|
| **Domaine 1** : Design Secure Architectures | 30% | 20/65 |
| **Domaine 2** : Design Resilient Architectures | 26% | 17/65 |
| **Domaine 3** : Design High-Performing Architectures | 24% | 16/65 |
| **Domaine 4** : Design Cost-Optimized Architectures | 20% | 13/65 |

**Format** : 65 questions (50 à choix unique, 15 à choix multiples)  
**Durée** : 130 minutes  
**Score de passage** : 720/1000

---

## 🔐 Domaine 1 : Design Secure Architectures (30%)

### **1.1 Design secure access to AWS resources**

#### **Compétences testées**
- ✅ Différencier IAM Users, Roles, Groups, Policies
- ✅ Appliquer le principe du moindre privilège
- ✅ Utiliser IAM roles pour services AWS
- ✅ Implémenter MFA et password policies

#### **Implémentation dans le projet**

**IAM Roles pour Lambda** :
```typescript
// infrastructure/lib/stacks/api-stack.ts
const getTransactionsRole = new iam.Role(this, 'GetTransactionsRole', {
  assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
  managedPolicies: [
    iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
  ]
});

// Politique inline (moindre privilège)
getTransactionsRole.addToPolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: [
    'dynamodb:GetItem',
    'dynamodb:Query'
  ],
  resources: [
    usersTable.tableArn,
    `${usersTable.tableArn}/index/*` // GSI
  ]
}));
```

**Cognito User Pool (authentification applicative)** :
```typescript
const userPool = new cognito.UserPool(this, 'UserPool', {
  passwordPolicy: {
    minLength: 12,
    requireLowercase: true,
    requireUppercase: true,
    requireDigits: true,
    requireSymbols: true
  },
  mfa: cognito.Mfa.OPTIONAL, // MFA recommandé
  accountRecovery: cognito.AccountRecovery.EMAIL_ONLY
});
```

#### **Questions d'examen types**

**Q1** : Une application web doit accéder à DynamoDB. Quelle est la meilleure pratique ?
- A) Créer un IAM User et hardcoder les credentials
- B) Utiliser un IAM Role attaché à la Lambda function
- C) Utiliser la root account
- D) Créer un IAM Group

**Réponse** : **B** (IAM Role = credentials temporaires, rotation automatique)

---

### **1.2 Design secure workloads and applications**

#### **Compétences testées**
- ✅ Chiffrement at rest (S3, EBS, RDS, DynamoDB)
- ✅ Chiffrement in transit (TLS, HTTPS)
- ✅ AWS KMS (Customer Managed Keys vs AWS Managed Keys)
- ✅ Secrets Manager vs Systems Manager Parameter Store

#### **Implémentation dans le projet**

**Chiffrement DynamoDB** :
```typescript
const usersTable = new dynamodb.Table(this, 'UsersTable', {
  encryption: dynamodb.TableEncryption.AWS_MANAGED, // KMS gratuit
  // OU
  encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
  encryptionKey: new kms.Key(this, 'TableKey', {
    enableKeyRotation: true // Rotation annuelle automatique
  })
});
```

**Secrets Manager** :
```typescript
const etherscanSecret = new secretsmanager.Secret(this, 'EtherscanApiKey', {
  secretName: 'web3-dashboard/etherscan-api-key',
  description: 'Etherscan API key for blockchain queries'
});

// Lambda accède au secret
const lambda = new lambda.Function(this, 'GetTransactions', {
  environment: {
    ETHERSCAN_SECRET_ARN: etherscanSecret.secretArn
  }
});
etherscanSecret.grantRead(lambda);
```

**HTTPS obligatoire (S3 + CloudFront)** :
```typescript
const bucket = new s3.Bucket(this, 'FrontendBucket', {
  enforceSSL: true, // Refuse HTTP
  encryption: s3.BucketEncryption.S3_MANAGED
});

const distribution = new cloudfront.Distribution(this, 'CDN', {
  defaultBehavior: {
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
  },
  minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021
});
```

#### **Questions d'examen types**

**Q2** : Vous devez stocker une clé API qui change tous les 30 jours. Quelle solution choisir ?
- A) Variable d'environnement Lambda
- B) Secrets Manager avec rotation automatique
- C) S3 avec versioning
- D) Systems Manager Parameter Store (SecureString)

**Réponse** : **B** (Secrets Manager gère la rotation automatique)

---

### **1.3 Determine appropriate data security controls**

#### **Compétences testées**
- ✅ S3 bucket policies vs IAM policies
- ✅ S3 Block Public Access
- ✅ S3 Object Lock (compliance)
- ✅ VPC Endpoints (PrivateLink)

#### **Implémentation dans le projet**

**S3 Bucket Policy (CloudFront uniquement)** :
```typescript
const bucket = new s3.Bucket(this, 'FrontendBucket', {
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  publicReadAccess: false
});

// Seul CloudFront peut accéder
const oai = new cloudfront.OriginAccessIdentity(this, 'OAI');
bucket.addToResourcePolicy(new iam.PolicyStatement({
  actions: ['s3:GetObject'],
  resources: [bucket.arnForObjects('*')],
  principals: [new iam.CanonicalUserPrincipal(oai.cloudFrontOriginAccessIdentityS3CanonicalUserId)]
}));
```

**VPC Endpoint pour DynamoDB** :
```typescript
const vpc = new ec2.Vpc(this, 'Vpc', { maxAzs: 2 });

// Trafic DynamoDB reste dans AWS (pas d'Internet Gateway)
vpc.addGatewayEndpoint('DynamoDbEndpoint', {
  service: ec2.GatewayVpcEndpointAwsService.DYNAMODB
});
```

#### **Questions d'examen types**

**Q3** : Un bucket S3 doit être accessible uniquement depuis un VPC. Quelle solution ?
- A) Bucket policy avec condition `aws:SourceVpc`
- B) S3 Access Points
- C) VPC Endpoint + bucket policy
- D) IAM policy

**Réponse** : **C** (VPC Endpoint + bucket policy avec `aws:SourceVpce`)

---

## 🏗️ Domaine 2 : Design Resilient Architectures (26%)

### **2.1 Design scalable and loosely coupled architectures**

#### **Compétences testées**
- ✅ SQS vs SNS vs EventBridge
- ✅ Lambda vs Fargate vs EC2
- ✅ API Gateway (REST vs HTTP vs WebSocket)
- ✅ Elastic Load Balancer (ALB vs NLB vs CLB)

#### **Implémentation dans le projet**

**API Gateway REST API** :
```typescript
const api = new apigateway.RestApi(this, 'Api', {
  restApiName: 'Web3 Dashboard API',
  deployOptions: {
    stageName: 'prod',
    throttlingRateLimit: 1000, // 1000 req/sec
    throttlingBurstLimit: 2000,
    metricsEnabled: true,
    loggingLevel: apigateway.MethodLoggingLevel.INFO
  }
});

// Intégration Lambda (asynchrone)
const getTransactionsIntegration = new apigateway.LambdaIntegration(getTransactionsLambda, {
  proxy: true,
  allowTestInvoke: false
});

const transactions = api.root.addResource('transactions');
transactions.addMethod('GET', getTransactionsIntegration, {
  authorizationType: apigateway.AuthorizationType.COGNITO,
  authorizer: new apigateway.CognitoUserPoolsAuthorizer(this, 'Authorizer', {
    cognitoUserPools: [userPool]
  })
});
```

**Pourquoi Lambda et pas EC2 ?**
- ✅ Auto-scaling automatique (0 → 1000 instances en secondes)
- ✅ Pas de gestion de serveurs
- ✅ Pay-per-use (pas de coût si 0 requête)
- ❌ EC2 = over-provisioning, coût fixe

#### **Questions d'examen types**

**Q4** : Vous devez découpler une application web d'un worker de traitement. Quelle solution ?
- A) API Gateway → Lambda
- B) SQS → Lambda
- C) SNS → Lambda
- D) EventBridge → Lambda

**Réponse** : **B** (SQS = queue, découplage parfait)

---

### **2.2 Design highly available and/or fault-tolerant architectures**

#### **Compétences testées**
- ✅ Multi-AZ vs Multi-Region
- ✅ RDS Multi-AZ vs Read Replicas
- ✅ Route 53 routing policies (failover, weighted, latency)
- ✅ Auto Scaling Groups

#### **Implémentation dans le projet**

**DynamoDB Multi-AZ (automatique)** :
```typescript
const usersTable = new dynamodb.Table(this, 'UsersTable', {
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // On-Demand
  pointInTimeRecovery: true, // Backup continu 35 jours
  removalPolicy: RemovalPolicy.RETAIN // Protection suppression
});

// Global Tables (multi-région, optionnel)
const globalTable = new dynamodb.Table(this, 'GlobalUsersTable', {
  replicationRegions: ['us-east-1', 'eu-west-1', 'ap-southeast-1']
});
```

**ElastiCache Multi-AZ** :
```typescript
const cacheCluster = new elasticache.CfnReplicationGroup(this, 'RedisCluster', {
  replicationGroupDescription: 'Web3 Dashboard Cache',
  engine: 'redis',
  cacheNodeType: 'cache.t3.micro',
  numCacheClusters: 2, // 1 primary + 1 replica
  automaticFailoverEnabled: true,
  multiAzEnabled: true,
  atRestEncryptionEnabled: true,
  transitEncryptionEnabled: true
});
```

**Route 53 Health Check + Failover** :
```typescript
const healthCheck = new route53.CfnHealthCheck(this, 'ApiHealthCheck', {
  healthCheckConfig: {
    type: 'HTTPS',
    resourcePath: '/health',
    fullyQualifiedDomainName: 'api.example.com',
    port: 443,
    requestInterval: 30,
    failureThreshold: 3
  }
});

// Failover record (primary → secondary)
new route53.ARecord(this, 'ApiRecord', {
  zone: hostedZone,
  recordName: 'api',
  target: route53.RecordTarget.fromAlias(new targets.ApiGateway(api)),
  failover: route53.FailoverType.PRIMARY,
  healthCheck: healthCheck
});
```

#### **Questions d'examen types**

**Q5** : Vous devez garantir 99.99% de disponibilité. Quelle architecture ?
- A) Single AZ avec snapshots
- B) Multi-AZ avec auto-scaling
- C) Multi-région avec Global Accelerator
- D) Single région avec CloudFront

**Réponse** : **B** (99.99% = 52 min/an, Multi-AZ suffit)

---

## ⚡ Domaine 3 : Design High-Performing Architectures (24%)

### **3.1 Determine high-performing and/or scalable storage solutions**

#### **Compétences testées**
- ✅ S3 storage classes (Standard, IA, Glacier)
- ✅ EBS vs EFS vs S3
- ✅ DynamoDB vs RDS vs Aurora
- ✅ ElastiCache (Redis vs Memcached)

#### **Implémentation dans le projet**

**DynamoDB (NoSQL, millisecond latency)** :
```typescript
const usersTable = new dynamodb.Table(this, 'UsersTable', {
  partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST
});

// GSI pour query par wallet_address
usersTable.addGlobalSecondaryIndex({
  indexName: 'wallet-index',
  partitionKey: { name: 'wallet_address', type: dynamodb.AttributeType.STRING },
  projectionType: dynamodb.ProjectionType.ALL
});
```

**Pourquoi DynamoDB et pas RDS ?**
| Critère | DynamoDB | RDS |
|---------|----------|-----|
| Latence | < 10ms | ~50ms |
| Scaling | Automatique | Manuel (vertical) |
| Coût (1000 users) | $2.50/mois | $15/mois (db.t3.micro) |
| Maintenance | Zéro | Patches, backups |

**ElastiCache Redis (sub-millisecond latency)** :
```typescript
// Cache des transactions Etherscan
const redis = new elasticache.CfnReplicationGroup(this, 'RedisCluster', {
  engine: 'redis',
  cacheNodeType: 'cache.t3.micro',
  numCacheClusters: 2
});
```

**Stratégie de cache** :
```typescript
// backend/api/get-transactions/index.ts
const cacheKey = `tx:${walletAddress}`;
let transactions = await redis.get(cacheKey);

if (!transactions) {
  transactions = await fetchFromEtherscan(walletAddress);
  await redis.setex(cacheKey, 30, JSON.stringify(transactions)); // TTL 30s
}
```

#### **Questions d'examen types**

**Q6** : Vous devez stocker des logs d'application (100 GB/mois). Quelle solution ?
- A) S3 Standard
- B) S3 Intelligent-Tiering
- C) EBS
- D) EFS

**Réponse** : **B** (Intelligent-Tiering optimise automatiquement les coûts)

---

### **3.2 Design high-performing and elastic compute solutions**

#### **Compétences testées**
- ✅ Lambda (event-driven, stateless)
- ✅ EC2 instance types (compute, memory, storage optimized)
- ✅ Auto Scaling (target tracking, step scaling)
- ✅ Lambda concurrency (reserved, provisioned)

#### **Implémentation dans le projet**

**Lambda ARM (Graviton2)** :
```typescript
const getTransactionsLambda = new lambda.Function(this, 'GetTransactions', {
  runtime: lambda.Runtime.NODEJS_20_X,
  architecture: lambda.Architecture.ARM_64, // -20% coût, +19% perf
  memorySize: 512, // Optimisé via Power Tuning
  timeout: Duration.seconds(10),
  environment: {
    DYNAMODB_TABLE: usersTable.tableName,
    REDIS_ENDPOINT: redis.attrPrimaryEndPointAddress
  }
});
```

**Lambda Reserved Concurrency** :
```typescript
// Limite le nombre d'exécutions simultanées (évite throttling DynamoDB)
getTransactionsLambda.addReservedConcurrentExecutions(100);
```

**Lambda Provisioned Concurrency (élimine cold start)** :
```typescript
const alias = new lambda.Alias(this, 'ProdAlias', {
  aliasName: 'prod',
  version: getTransactionsLambda.currentVersion,
  provisionedConcurrentExecutions: 5 // 5 instances toujours chaudes
});
```

#### **Questions d'examen types**

**Q7** : Votre Lambda a des cold starts de 2 secondes. Quelle solution la plus cost-effective ?
- A) Augmenter la mémoire
- B) Provisioned Concurrency
- C) Réduire la taille du package
- D) Migrer vers Fargate

**Réponse** : **C** (réduire le package = cold start plus rapide, gratuit)

---

### **3.3 Determine high-performing database solutions**

#### **Compétences testées**
- ✅ DynamoDB (partition key design, GSI, LSI)
- ✅ RDS (Multi-AZ, Read Replicas)
- ✅ Aurora (Serverless, Global Database)
- ✅ DynamoDB DAX (in-memory cache)

#### **Implémentation dans le projet**

**DynamoDB Single-Table Design** :
```
Table: Web3Dashboard

PK                    | SK              | Attributes
----------------------|-----------------|---------------------------
USER#123              | PROFILE         | wallet_address, email
USER#123              | ALERT#001       | condition, threshold
USER#123              | PREF#THEME      | value: "dark"
WALLET#0xabc...       | USER#123        | (GSI pour reverse lookup)
```

**Pourquoi single-table ?**
- ✅ Moins de tables = moins de coûts
- ✅ Transactions ACID possibles (TransactWriteItems)
- ✅ Queries complexes avec GSI

**GSI pour query par wallet** :
```typescript
usersTable.addGlobalSecondaryIndex({
  indexName: 'wallet-index',
  partitionKey: { name: 'wallet_address', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
  projectionType: dynamodb.ProjectionType.KEYS_ONLY // Réduit les coûts
});
```

#### **Questions d'examen types**

**Q8** : Vous devez query DynamoDB par un attribut non-clé. Quelle solution ?
- A) Scan la table
- B) Créer un GSI
- C) Utiliser FilterExpression
- D) Migrer vers RDS

**Réponse** : **B** (GSI permet query efficace, Scan = coûteux)

---

### **3.4 Determine high-performing and/or scalable network architectures**

#### **Compétences testées**
- ✅ CloudFront (edge locations, caching)
- ✅ Route 53 (routing policies)
- ✅ VPC (subnets, NAT Gateway, Internet Gateway)
- ✅ Global Accelerator vs CloudFront

#### **Implémentation dans le projet**

**CloudFront (CDN global)** :
```typescript
const distribution = new cloudfront.Distribution(this, 'CDN', {
  defaultBehavior: {
    origin: new origins.S3Origin(frontendBucket),
    cachePolicy: new cloudfront.CachePolicy(this, 'CachePolicy', {
      defaultTtl: Duration.hours(1),
      maxTtl: Duration.hours(24),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true
    }),
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
  },
  priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // USA, Europe, Israël
  geoRestriction: cloudfront.GeoRestriction.allowlist('FR', 'US', 'GB')
});
```

**Pourquoi CloudFront ?**
- ✅ 400+ edge locations (latence < 50ms)
- ✅ Cache hit rate > 80% (réduit les appels API)
- ✅ Protection DDoS (AWS Shield Standard gratuit)

#### **Questions d'examen types**

**Q9** : Vous devez réduire la latence pour des utilisateurs en Asie. Quelle solution ?
- A) Déployer EC2 en ap-southeast-1
- B) Utiliser CloudFront
- C) Utiliser Global Accelerator
- D) Utiliser Route 53 latency routing

**Réponse** : **B** (CloudFront = cache edge, Global Accelerator = TCP/UDP)

---

## 💰 Domaine 4 : Design Cost-Optimized Architectures (20%)

### **4.1 Design cost-optimized storage solutions**

#### **Compétences testées**
- ✅ S3 storage classes (Standard, IA, Glacier, Deep Archive)
- ✅ S3 Lifecycle policies
- ✅ EBS volume types (gp3, io2, st1, sc1)
- ✅ S3 Intelligent-Tiering

#### **Implémentation dans le projet**

**S3 Lifecycle Policy** :
```typescript
const logsBucket = new s3.Bucket(this, 'LogsBucket', {
  lifecycleRules: [
    {
      id: 'ArchiveOldLogs',
      enabled: true,
      transitions: [
        {
          storageClass: s3.StorageClass.INFREQUENT_ACCESS,
          transitionAfter: Duration.days(30)
        },
        {
          storageClass: s3.StorageClass.GLACIER,
          transitionAfter: Duration.days(90)
        },
        {
          storageClass: s3.StorageClass.DEEP_ARCHIVE,
          transitionAfter: Duration.days(365)
        }
      ],
      expiration: Duration.days(2555) // 7 ans (compliance)
    }
  ]
});
```

**Économies** :
- S3 Standard : $0.023/GB
- S3 IA : $0.0125/GB (-46%)
- Glacier : $0.004/GB (-83%)
- Deep Archive : $0.00099/GB (-96%)

#### **Questions d'examen types**

**Q10** : Vous devez stocker des backups (accès 1x/an). Quelle storage class ?
- A) S3 Standard
- B) S3 Intelligent-Tiering
- C) Glacier
- D) Glacier Deep Archive

**Réponse** : **D** (Deep Archive = $0.00099/GB, retrieval 12h OK)

---

### **4.2 Design cost-optimized compute solutions**

#### **Compétences testées**
- ✅ EC2 pricing (On-Demand, Reserved, Spot, Savings Plans)
- ✅ Lambda vs Fargate vs EC2
- ✅ Auto Scaling (right-sizing)
- ✅ Graviton (ARM) vs x86

#### **Implémentation dans le projet**

**Lambda (pay-per-use)** :
```typescript
// Coût estimé (300k invocations/mois, 512 MB, 500ms avg)
// Requests: 300k × $0.20/1M = $0.06
// Duration: 300k × 0.5s × $0.0000083/GB-s × 0.5 GB = $0.62
// Total: $0.68/mois

// VS EC2 t3.micro (24/7)
// $0.0104/heure × 730 heures = $7.59/mois
// Économie: 91%
```

**Lambda ARM (Graviton2)** :
```typescript
const lambda = new lambda.Function(this, 'Function', {
  architecture: lambda.Architecture.ARM_64, // -20% coût
  // VS
  architecture: lambda.Architecture.X86_64
});
```

#### **Questions d'examen types**

**Q11** : Votre workload est prévisible (24/7). Quelle option EC2 ?
- A) On-Demand
- B) Reserved Instances (1 an)
- C) Spot Instances
- D) Savings Plans

**Réponse** : **B** (Reserved = -72% vs On-Demand pour workload stable)

---

### **4.3 Design cost-optimized database solutions**

#### **Compétences testées**
- ✅ DynamoDB (On-Demand vs Provisioned)
- ✅ RDS (Multi-AZ, storage types)
- ✅ Aurora Serverless vs Aurora Provisioned
- ✅ DynamoDB Auto Scaling

#### **Implémentation dans le projet**

**DynamoDB On-Demand** :
```typescript
const usersTable = new dynamodb.Table(this, 'UsersTable', {
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST // On-Demand
});

// Coût estimé (1000 users, 10 reads/jour)
// Reads: 10k/jour × 30 jours = 300k reads/mois
// 300k reads × $0.25/1M = $0.075/mois

// VS Provisioned (5 RCU)
// 5 RCU × $0.00013/heure × 730 heures = $0.47/mois
// On-Demand plus économique si trafic < 2M reads/mois
```

**Quand utiliser Provisioned ?**
- Trafic prévisible et constant
- > 2M reads/mois
- Possibilité d'acheter Reserved Capacity (-50%)

#### **Questions d'examen types**

**Q12** : Votre DynamoDB a un trafic imprévisible (0-1000 req/sec). Quel billing mode ?
- A) Provisioned avec Auto Scaling
- B) On-Demand
- C) Provisioned avec Reserved Capacity
- D) Aurora Serverless

**Réponse** : **B** (On-Demand = pas de capacity planning, adapté au trafic variable)

---

### **4.4 Design cost-optimized network architectures**

#### **Compétences testées**
- ✅ Data transfer costs (inter-AZ, inter-region, Internet)
- ✅ NAT Gateway vs NAT Instance
- ✅ VPC Endpoints (Gateway vs Interface)
- ✅ CloudFront vs direct S3

#### **Implémentation dans le projet**

**VPC Endpoint (Gateway) pour DynamoDB** :
```typescript
// Gratuit (pas de data transfer charges)
vpc.addGatewayEndpoint('DynamoDbEndpoint', {
  service: ec2.GatewayVpcEndpointAwsService.DYNAMODB
});

// VS NAT Gateway
// $0.045/heure + $0.045/GB = $33/mois + data transfer
// Économie: 100%
```

**CloudFront pour S3** :
```typescript
// Direct S3 (sans CloudFront)
// $0.09/GB (data transfer out)

// Avec CloudFront
// $0.085/GB (edge → user)
// + Cache hit rate 80% = 80% d'économie sur S3 requests
```

#### **Questions d'examen types**

**Q13** : Votre Lambda doit accéder à DynamoDB. Comment réduire les coûts ?
- A) Utiliser NAT Gateway
- B) Utiliser VPC Endpoint (Gateway)
- C) Utiliser Internet Gateway
- D) Utiliser VPC Peering

**Réponse** : **B** (VPC Endpoint Gateway = gratuit, pas de data transfer)

---

## 📊 Récapitulatif : Services AWS couverts

### **Compute**
- [x] AWS Lambda (event-driven, serverless)
- [x] Lambda@Edge (optionnel, CloudFront functions)

### **Storage**
- [x] Amazon S3 (static hosting, logs)
- [x] S3 Lifecycle Policies
- [x] S3 Intelligent-Tiering

### **Database**
- [x] Amazon DynamoDB (NoSQL)
- [x] DynamoDB Streams (optionnel, triggers)
- [x] DynamoDB Global Tables (optionnel, multi-région)

### **Networking & Content Delivery**
- [x] Amazon CloudFront (CDN)
- [x] Amazon Route 53 (DNS, health checks)
- [x] Amazon VPC (subnets, endpoints)
- [x] AWS Certificate Manager (SSL/TLS)

### **Security, Identity & Compliance**
- [x] Amazon Cognito (User Pools, Identity Pools)
- [x] AWS IAM (Roles, Policies)
- [x] AWS KMS (encryption keys)
- [x] AWS Secrets Manager
- [x] AWS WAF (Web Application Firewall)

### **Management & Governance**
- [x] AWS CloudFormation / CDK (IaC)
- [x] Amazon CloudWatch (Logs, Metrics, Alarms)
- [x] AWS X-Ray (distributed tracing)
- [x] AWS Config (optionnel, compliance)
- [x] AWS Budgets (cost alerts)

### **Application Integration**
- [x] Amazon API Gateway (REST API)
- [x] Amazon SNS (optionnel, notifications)
- [x] Amazon SQS (optionnel, queues)

### **Analytics**
- [x] Amazon ElastiCache (Redis)

---

## 🎯 Plan de révision recommandé

### **Semaine 1-2 : Sécurité (30%)**
- [ ] IAM (Users, Roles, Policies, MFA)
- [ ] Cognito (User Pools, Identity Pools, Custom Auth)
- [ ] KMS (CMK, AWS Managed Keys, rotation)
- [ ] Secrets Manager vs Parameter Store
- [ ] S3 encryption (SSE-S3, SSE-KMS, SSE-C)
- [ ] VPC (Security Groups, NACLs, VPC Endpoints)

### **Semaine 3-4 : Résilience (26%)**
- [ ] Multi-AZ vs Multi-Region
- [ ] Auto Scaling (EC2, DynamoDB, Aurora)
- [ ] Elastic Load Balancing (ALB, NLB, CLB)
- [ ] Route 53 (failover, weighted, latency routing)
- [ ] DynamoDB (PITR, Global Tables)
- [ ] RDS (Multi-AZ, Read Replicas, backups)

### **Semaine 5-6 : Performance (24%)**
- [ ] CloudFront (caching, edge locations)
- [ ] ElastiCache (Redis vs Memcached)
- [ ] DynamoDB (partition keys, GSI, LSI, DAX)
- [ ] Lambda (concurrency, layers, ARM)
- [ ] S3 (storage classes, Transfer Acceleration)
- [ ] EBS (volume types, IOPS)

### **Semaine 7-8 : Coûts (20%)**
- [ ] EC2 pricing (On-Demand, Reserved, Spot, Savings Plans)
- [ ] S3 Lifecycle Policies
- [ ] DynamoDB (On-Demand vs Provisioned)
- [ ] Data transfer costs
- [ ] AWS Budgets & Cost Explorer
- [ ] Trusted Advisor

---

## 📚 Ressources officielles

### **Documentation AWS**
- [Exam Guide SAA-C03](https://d1.awsstatic.com/training-and-certification/docs-sa-assoc/AWS-Certified-Solutions-Architect-Associate_Exam-Guide.pdf)
- [Sample Questions](https://d1.awsstatic.com/training-and-certification/docs-sa-assoc/AWS-Certified-Solutions-Architect-Associate_Sample-Questions.pdf)
- [Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)

### **Whitepapers recommandés**
- [Overview of Amazon Web Services](https://docs.aws.amazon.com/whitepapers/latest/aws-overview/introduction.html)
- [Architecting for the Cloud: AWS Best Practices](https://d1.awsstatic.com/whitepapers/AWS_Cloud_Best_Practices.pdf)
- [AWS Security Best Practices](https://d1.awsstatic.com/whitepapers/Security/AWS_Security_Best_Practices.pdf)

### **Labs pratiques**
- [AWS Skill Builder](https://skillbuilder.aws/)
- [AWS Workshops](https://workshops.aws/)
- [Qwiklabs](https://www.qwiklabs.com/)

---

**Dernière mise à jour** : Décembre 2024  
**Version** : 1.0  
**Auteur** : Formateur AWS SAA-C03
