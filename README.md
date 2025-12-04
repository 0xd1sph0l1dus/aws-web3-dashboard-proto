# 🔐 Web3 Transaction Dashboard

> **Projet de certification AWS Solutions Architect Associate (SAA-C03)**  
> Application serverless sécurisée pour visualiser et gérer des transactions Ethereum

[![AWS](https://img.shields.io/badge/AWS-SAA--C03-orange)](https://aws.amazon.com/certification/certified-solutions-architect-associate/)
[![Architecture](https://img.shields.io/badge/Architecture-Serverless-blue)](https://aws.amazon.com/serverless/)
[![Well-Architected](https://img.shields.io/badge/Well--Architected-5%20Pillars-green)](https://aws.amazon.com/architecture/well-architected/)

---

## 📋 Vue d'ensemble

Cette application démontre la maîtrise des compétences clés de l'examen **AWS SAA-C03** à travers un cas d'usage réel :

### **Fonctionnalités**
- ✅ Authentification Web3 (MetaMask) via AWS Cognito Custom Auth
- ✅ Visualisation des transactions Ethereum (Sepolia testnet)
- ✅ Alertes personnalisées (ex : "notifier si transaction > 0.5 ETH")
- ✅ Gestion des préférences utilisateur (persistance sécurisée)

### **Services AWS utilisés**
- **Compute** : AWS Lambda (Node.js 20)
- **Auth** : Amazon Cognito User Pools
- **API** : Amazon API Gateway (REST)
- **Database** : Amazon DynamoDB
- **Cache** : Amazon ElastiCache (Redis)
- **CDN** : Amazon CloudFront
- **Storage** : Amazon S3
- **Security** : AWS KMS, AWS WAF, AWS Secrets Manager
- **Monitoring** : Amazon CloudWatch, AWS X-Ray
- **IaC** : AWS CDK (TypeScript)

---

## 🏗️ Architecture

```
┌─────────────┐
│   User      │
│ (MetaMask)  │
└──────┬──────┘
       │ HTTPS
       ▼
┌─────────────────┐      ┌──────────────┐
│  CloudFront     │─────▶│  S3 (Vue.js) │
│  + WAF          │      └──────────────┘
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────┐
│  API Gateway    │─────▶│   Cognito    │
└────────┬────────┘      └──────────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────┐      ┌──────────────┐
│  Lambda         │─────▶│  DynamoDB    │      │ ElastiCache  │
│  Functions      │      │  (Users,     │      │  (Redis)     │
│                 │─────▶│   Alerts)    │      └──────────────┘
└─────────────────┘      └──────────────┘
         │
         ▼
┌─────────────────┐
│  Etherscan API  │
│  (External)     │
└─────────────────┘
```

**Diagramme détaillé** : Voir [`docs/architecture-diagram.png`](docs/architecture-diagram.png)

---

## 📚 Alignement avec les 4 domaines SAA-C03

| Domaine | Poids | Implémentation dans ce projet |
|---------|-------|-------------------------------|
| **Design Secure Architectures** | 30% | • Cognito Custom Auth Flow<br>• KMS encryption at rest<br>• TLS 1.2 in transit<br>• IAM least privilege<br>• WAF protection |
| **Design Resilient Architectures** | 26% | • Multi-AZ (DynamoDB, Cognito)<br>• Lambda retry logic<br>• ElastiCache failover<br>• CloudFront HA |
| **Design High-Performing Architectures** | 24% | • CloudFront edge caching<br>• ElastiCache Redis<br>• DynamoDB DAX (optionnel)<br>• Lambda ARM (Graviton2) |
| **Design Cost-Optimized Architectures** | 20% | • Serverless (pay-per-use)<br>• DynamoDB On-Demand<br>• S3 Intelligent-Tiering<br>• CloudWatch Logs retention |

---

## 🎯 Concepts AWS couverts

### **Security**
- [x] Cognito User Pools (custom authentication flow)
- [x] Lambda authorizers
- [x] KMS encryption (at rest)
- [x] Secrets Manager (API keys)
- [x] IAM roles & policies (least privilege)
- [x] WAF rules (DDoS protection)

### **Reliability**
- [x] Multi-AZ deployments
- [x] DynamoDB point-in-time recovery
- [x] Lambda dead letter queues
- [x] CloudWatch alarms
- [x] Auto-scaling (DynamoDB, Lambda)

### **Performance**
- [x] CloudFront CDN
- [x] ElastiCache Redis
- [x] DynamoDB GSI (Global Secondary Index)
- [x] Lambda provisioned concurrency (optionnel)

### **Cost Optimization**
- [x] AWS Free Tier maximization
- [x] Reserved capacity (ElastiCache)
- [x] S3 lifecycle policies
- [x] CloudWatch Logs retention policies

### **Operational Excellence**
- [x] Infrastructure as Code (CDK)
- [x] CI/CD pipeline (GitHub Actions)
- [x] X-Ray distributed tracing
- [x] CloudWatch dashboards

---

## 🚀 Déploiement

### **Prérequis**
```bash
# AWS CLI configuré
aws --version  # >= 2.x

# Node.js
node --version  # >= 20.x

# AWS CDK
npm install -g aws-cdk
cdk --version  # >= 2.x
```

### **Installation**
```bash
# 1. Cloner le repo
git clone <repo-url>
cd web3-transaction-dashboard

# 2. Installer les dépendances
cd infrastructure
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos valeurs (Etherscan API key, etc.)

# 4. Bootstrap CDK (première fois uniquement)
cdk bootstrap aws://ACCOUNT-ID/REGION

# 5. Déployer l'infrastructure
cdk deploy --all
```

### **Coût estimé**
- **Développement** : ~$5/mois (Free Tier)
- **Production (1000 users)** : ~$19/mois

---

## 📁 Structure du projet

```
web3-transaction-dashboard/
├── README.md                          # Ce fichier
├── docs/                              # Documentation
│   ├── architecture-diagram.png       # Diagramme d'architecture
│   ├── well-architected-review.md     # Analyse des 5 piliers
│   ├── saa-c03-mapping.md             # Mapping avec l'examen
│   └── deployment-guide.md            # Guide de déploiement détaillé
├── infrastructure/                    # AWS CDK (TypeScript)
│   ├── bin/
│   │   └── app.ts                     # Point d'entrée CDK
│   ├── lib/
│   │   ├── stacks/
│   │   │   ├── auth-stack.ts          # Cognito + Lambda triggers
│   │   │   ├── api-stack.ts           # API Gateway + Lambda
│   │   │   ├── database-stack.ts      # DynamoDB
│   │   │   ├── cache-stack.ts         # ElastiCache
│   │   │   ├── frontend-stack.ts      # S3 + CloudFront
│   │   │   └── monitoring-stack.ts    # CloudWatch + X-Ray
│   │   └── constructs/                # Constructs réutilisables
│   ├── cdk.json
│   ├── package.json
│   └── tsconfig.json
├── backend/                           # Lambda functions
│   ├── auth/
│   │   ├── define-auth-challenge/
│   │   ├── create-auth-challenge/
│   │   └── verify-auth-challenge/
│   ├── api/
│   │   ├── get-transactions/
│   │   ├── set-alert/
│   │   └── get-preferences/
│   └── shared/                        # Code partagé
│       ├── utils/
│       └── types/
├── frontend/                          # Vue.js 3
│   ├── src/
│   │   ├── components/
│   │   ├── views/
│   │   ├── services/                  # API clients
│   │   └── store/                     # Pinia store
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
└── tests/                             # Tests
    ├── unit/
    ├── integration/
    └── e2e/
```

---

## 🧪 Tests

```bash
# Tests unitaires (Lambda)
cd backend
npm test

# Tests d'intégration (API)
npm run test:integration

# Tests E2E (Playwright)
cd frontend
npm run test:e2e
```

---

## 📊 Monitoring

### **CloudWatch Dashboards**
- **Auth Metrics** : Cognito sign-ins, failures, MFA usage
- **API Metrics** : Latency, error rate, throttling
- **Cache Metrics** : Redis hit rate, evictions

### **Alarms configurés**
- Lambda error rate > 5%
- API Gateway 5xx errors > 10/min
- DynamoDB throttled requests > 0
- ElastiCache CPU > 75%

---

## 🎓 Ressources d'apprentissage

### **Documentation AWS**
- [Cognito Custom Authentication Flow](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-authentication-flow.html#amazon-cognito-user-pools-custom-authentication-flow)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)

### **Examen SAA-C03**
- [Guide officiel](https://d1.awsstatic.com/training-and-certification/docs-sa-assoc/AWS-Certified-Solutions-Architect-Associate_Exam-Guide.pdf)
- [Sample Questions](https://d1.awsstatic.com/training-and-certification/docs-sa-assoc/AWS-Certified-Solutions-Architect-Associate_Sample-Questions.pdf)

---

## 📝 Checklist Portfolio

- [ ] Architecture diagram (draw.io)
- [ ] Well-Architected Review complet
- [ ] README avec badges et métriques
- [ ] Démo vidéo (3-5 min)
- [ ] Code commenté et documenté
- [ ] Tests unitaires (coverage > 80%)
- [ ] CI/CD pipeline fonctionnel
- [ ] Coûts estimés documentés

---

## 🤝 Contribution

Ce projet est à but éducatif pour la préparation à la certification AWS SAA-C03.

---

## 📄 License

MIT

---

## 👤 Auteur

**Votre Nom**  
Candidat AWS Certified Solutions Architect – Associate (SAA-C03)

- Portfolio: [votre-site.com]

---

## 🏆 Certification Progress

- [x] Domaine 1 : Design Secure Architectures (30%)
- [x] Domaine 2 : Design Resilient Architectures (26%)
- [x] Domaine 3 : Design High-Performing Architectures (24%)
- [x] Domaine 4 : Design Cost-Optimized Architectures (20%)

**Date de passage prévue** : [À compléter]
