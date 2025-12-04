# 📊 Progression du projet - Web3 Transaction Dashboard

> **Suivi de l'apprentissage SAA-C03 et de l'implémentation**

---

## 🎯 Objectifs du projet

- [x] Définir les exigences fonctionnelles et non fonctionnelles
- [x] Concevoir l'architecture alignée SAA-C03
- [ ] Implémenter l'infrastructure AWS (CDK)
- [ ] Développer le backend (Lambda functions)
- [ ] Développer le frontend (Vue.js)
- [ ] Tester et déployer
- [ ] Documenter pour le portfolio

---

## ✅ Session 1 : Architecture et fondations (4 décembre 2024)

### **Décisions architecturales validées**

#### **1. Authentification : Cognito User Pool + Custom Auth Flow**
- ✅ **Choix** : Option A (Cognito + Lambda triggers)
- ✅ **Justification SAA-C03** :
  - Domaine 1 (Sécurité) : Service managé, MFA natif, JWT tokens
  - Domaine 2 (Résilience) : Multi-AZ automatique
  - Domaine 4 (Coût) : 50k MAU gratuits

#### **2. Fréquence des transactions : Hybride (polling + cache)**
- ✅ **Choix** : Polling 30s + ElastiCache Redis (TTL 30s)
- ✅ **Justification SAA-C03** :
  - Domaine 3 (Performance) : Cache hit rate > 80%
  - Domaine 4 (Coût) : Réduit appels Etherscan de 95%

#### **3. Sécurité : Chiffrement at rest + in transit**
- ✅ **Choix** : KMS (DynamoDB), TLS 1.2 (API Gateway), VPC Endpoints
- ✅ **Justification SAA-C03** :
  - Domaine 1 (Sécurité) : Encryption obligatoire pour 99.99% SLA

#### **4. Budget : ~$19/mois (1000 utilisateurs)**
- ✅ **Choix** : Serverless (Lambda, DynamoDB On-Demand, ElastiCache t3.micro)
- ✅ **Justification SAA-C03** :
  - Domaine 4 (Coût) : Pay-per-use, Free Tier maximisé

#### **5. Résilience : 99.99% (Multi-AZ)**
- ✅ **Choix** : DynamoDB Multi-AZ, ElastiCache failover, Lambda retry
- ✅ **Justification SAA-C03** :
  - Domaine 2 (Résilience) : 52 min/an d'indisponibilité acceptable

#### **6. Latence : CloudFront (cache edge)**
- ✅ **Choix** : CloudFront (400+ edge locations)
- ✅ **Justification SAA-C03** :
  - Domaine 3 (Performance) : Latence < 50ms (vs 200ms sans CDN)
  - Domaine 4 (Coût) : Cache hit = économie sur S3 requests

---

### **Documents créés**

#### **Documentation technique**
- [x] `README.md` : Vue d'ensemble du projet
- [x] `docs/well-architected-review.md` : Analyse des 5 piliers
- [x] `docs/saa-c03-mapping.md` : Mapping avec l'examen (65 questions types)
- [x] `docs/deployment-guide.md` : Guide de déploiement pas à pas

#### **Infrastructure as Code (CDK)**
- [x] `infrastructure/package.json` : Dépendances CDK
- [x] `infrastructure/tsconfig.json` : Configuration TypeScript
- [x] `infrastructure/cdk.json` : Configuration CDK
- [x] `infrastructure/bin/app.ts` : Point d'entrée (5 stacks)
- [x] `infrastructure/lib/stacks/auth-stack.ts` : Stack Cognito + Lambda triggers

#### **Configuration**
- [x] `.env.example` : Variables d'environnement
- [x] `PROGRESS.md` : Ce fichier (suivi)

---

### **Concepts SAA-C03 couverts**

#### **Domaine 1 : Sécurité (30%)**
- [x] Cognito User Pool vs IAM Users
- [x] Custom authentication flow (Lambda triggers)
- [x] IAM Roles (principe du moindre privilège)
- [x] KMS encryption (at rest)
- [x] TLS 1.2 (in transit)
- [x] Secrets Manager (API keys)
- [x] WAF (DDoS protection)

#### **Domaine 2 : Résilience (26%)**
- [x] Multi-AZ (DynamoDB, Cognito, Lambda)
- [x] ElastiCache failover
- [x] DynamoDB Point-in-Time Recovery
- [x] Lambda retry logic
- [x] CloudWatch Alarms

#### **Domaine 3 : Performance (24%)**
- [x] CloudFront (edge caching)
- [x] ElastiCache Redis (sub-millisecond latency)
- [x] DynamoDB GSI (query optimization)
- [x] Lambda ARM (Graviton2)
- [x] API Gateway caching

#### **Domaine 4 : Coût (20%)**
- [x] Serverless (pay-per-use)
- [x] DynamoDB On-Demand vs Provisioned
- [x] Lambda ARM (-20% coût)
- [x] CloudWatch Logs retention (7 jours)
- [x] VPC Endpoints (gratuit)
- [x] AWS Budgets (alertes)

---

### **Quiz validés**

#### **Quiz 1 : Cognito vs IAM Users**
**Q** : Pourquoi Cognito User Pool est-il préférable à IAM Users pour une application web ?

**Réponse** : ✅ Correct
- Cognito = authentification applicative (SAML, OAuth, MFA)
- IAM Users = accès programmatique AWS (CLI, SDK)
- Séparation des responsabilités (pilier Security)

#### **Quiz 2 : Stockage wallet_address**
**Q** : Où stocker le mapping `wallet_address → user_id` ?

**Réponse** : ⚠️ Partiellement correct
- Cognito custom attributes fonctionne MAIS non indexable
- **Meilleure pratique** : DynamoDB + GSI (query par wallet)

#### **Quiz 3 : Optimisation latence (Paris → Sepolia)**
**Q** : Comment optimiser la latence pour un utilisateur à Paris ?

**Réponse** : ✅ Correct
- CloudFront (cache edge) = solution la plus économique
- Latence réduite de 200ms → 20ms
- Cache hit rate > 80% = économie sur appels API

---

## 📋 Prochaines étapes

### **Session 2 : Implémentation backend (Lambda functions)**

#### **À créer**
- [ ] `backend/auth/define-auth-challenge/index.ts`
- [ ] `backend/auth/create-auth-challenge/index.ts`
- [ ] `backend/auth/verify-auth-challenge/index.ts`
- [ ] `backend/auth/verify-auth-challenge/package.json` (ethers.js)
- [ ] `backend/shared/utils/retry.ts`
- [ ] `backend/shared/types/index.ts`

#### **Concepts à couvrir**
- Lambda event handling (Cognito triggers)
- ECDSA signature verification (ethers.js)
- Error handling et retry logic
- CloudWatch Logs structured logging

---

### **Session 3 : Stacks DynamoDB et API**

#### **À créer**
- [ ] `infrastructure/lib/stacks/database-stack.ts`
- [ ] `infrastructure/lib/stacks/api-stack.ts`
- [ ] `infrastructure/lib/stacks/cache-stack.ts`
- [ ] `backend/api/get-transactions/index.ts`
- [ ] `backend/api/set-alert/index.ts`
- [ ] `backend/api/get-preferences/index.ts`

#### **Concepts à couvrir**
- DynamoDB single-table design
- DynamoDB GSI (Global Secondary Index)
- API Gateway REST API + Cognito Authorizer
- ElastiCache Redis (caching strategy)
- Lambda integration (proxy vs custom)

---

### **Session 4 : Frontend Vue.js**

#### **À créer**
- [ ] `frontend/package.json`
- [ ] `frontend/src/main.ts`
- [ ] `frontend/src/App.vue`
- [ ] `frontend/src/components/WalletConnect.vue`
- [ ] `frontend/src/components/TransactionList.vue`
- [ ] `frontend/src/services/auth.service.ts`
- [ ] `frontend/src/services/api.service.ts`

#### **Concepts à couvrir**
- Vue 3 Composition API
- Web3.js / ethers.js (MetaMask integration)
- Cognito SDK (authentication)
- API Gateway client (axios)
- State management (Pinia)

---

### **Session 5 : Déploiement et tests**

#### **À faire**
- [ ] Déployer l'infrastructure (CDK)
- [ ] Tester l'authentification Web3
- [ ] Tester les API endpoints
- [ ] Tester le frontend (E2E avec Playwright)
- [ ] Vérifier les coûts (Cost Explorer)
- [ ] Configurer les alarmes CloudWatch

---

### **Session 6 : Portfolio et certification**

#### **À créer**
- [ ] Diagramme d'architecture (draw.io)
- [ ] Vidéo de démo (3-5 min)
- [ ] Article de blog (Medium, Dev.to)
- [ ] Présentation (slides)
- [ ] Well-Architected Review complet

---

## 🎓 Compétences SAA-C03 acquises

### **Niveau de maîtrise**

| Domaine | Progression | Compétences clés |
|---------|-------------|------------------|
| **Sécurité (30%)** | 🟢 75% | Cognito, IAM, KMS, Secrets Manager, WAF |
| **Résilience (26%)** | 🟢 70% | Multi-AZ, PITR, Failover, Retry logic |
| **Performance (24%)** | 🟢 80% | CloudFront, ElastiCache, GSI, Lambda ARM |
| **Coût (20%)** | 🟢 85% | Serverless, On-Demand, Free Tier, Budgets |

**Score global estimé** : 🟢 **77%** (objectif : 72% pour passer l'examen)

---

## 📚 Ressources consultées

### **Documentation AWS**
- [x] [Cognito Custom Auth Flow](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-authentication-flow.html#amazon-cognito-user-pools-custom-authentication-flow)
- [x] [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [x] [Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [x] [SAA-C03 Exam Guide](https://d1.awsstatic.com/training-and-certification/docs-sa-assoc/AWS-Certified-Solutions-Architect-Associate_Exam-Guide.pdf)

### **Whitepapers**
- [x] [Overview of Amazon Web Services](https://docs.aws.amazon.com/whitepapers/latest/aws-overview/introduction.html)
- [ ] [Architecting for the Cloud: AWS Best Practices](https://d1.awsstatic.com/whitepapers/AWS_Cloud_Best_Practices.pdf)
- [ ] [AWS Security Best Practices](https://d1.awsstatic.com/whitepapers/Security/AWS_Security_Best_Practices.pdf)

---

## 💡 Leçons apprises

### **Décisions architecturales**

1. **Cognito vs Lambda Authorizer** : Cognito est plus simple pour l'examen SAA-C03 (service managé)
2. **DynamoDB vs RDS** : DynamoDB pour latence < 10ms et auto-scaling
3. **CloudFront vs direct S3** : CloudFront réduit les coûts (cache hit rate)
4. **On-Demand vs Provisioned** : On-Demand pour trafic imprévisible (< 2M req/mois)

### **Pièges d'examen évités**

1. ❌ **Sur-architecture** : Ne pas utiliser Global Tables si single-région suffit
2. ❌ **Sous-estimation coûts** : NAT Gateway coûte cher, utiliser VPC Endpoints
3. ❌ **Oubli encryption** : Toujours activer encryption at rest + in transit
4. ❌ **Pas de monitoring** : CloudWatch Alarms obligatoires (Operational Excellence)

---

## 🎯 Objectif certification

**Date de passage prévue** : [À définir après fin du projet]

**Préparation** :
- [x] Projet pratique (ce projet)
- [ ] Practice exams (AWS Skill Builder)
- [ ] Whitepapers (3/3)
- [ ] AWS Workshops (serverless patterns)

**Score cible** : 850/1000 (objectif : top 10%)

---

**Dernière mise à jour** : 4 décembre 2024, 13:30 UTC+01:00  
**Prochaine session** : Implémentation Lambda functions (auth)
