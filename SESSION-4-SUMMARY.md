# 🎨 Session 4 : FrontendStack + Vue.js Application - Résumé

> **Date** : 18 décembre 2024  
> **Durée** : Session complète  
> **Objectif** : Créer le FrontendStack (S3 + CloudFront) et l'application Vue.js avec authentification Web3

---

## ✅ Accomplissements

### **1. FrontendStack créé** ✅

**Fichier** : `infrastructure/lib/stacks/frontend-stack.ts`

#### **Services AWS déployés**

##### **S3 Bucket (Static Hosting)**
```typescript
Features:
- Block public access (CloudFront OAI uniquement)
- Versioning enabled (rollback)
- Encryption at rest (S3 managed)
- Lifecycle rules (delete old versions after 30 days)
- Removal policy: RETAIN (protection prod)
```

**Concepts SAA-C03** :
- ✅ **Sécurité** : Pas d'accès public direct (OAI)
- ✅ **Résilience** : Versioning pour rollback
- ✅ **Coût** : S3 Standard (pas Glacier pour website)

##### **CloudFront Distribution (CDN)**
```typescript
Features:
- Origin: S3 bucket avec OAI
- HTTPS obligatoire (redirect HTTP → HTTPS)
- Compression automatique (gzip, brotli)
- Error responses pour SPA routing (403/404 → index.html)
- Price class: 100 (North America + Europe)
- HTTP/2 et HTTP/3 enabled
- IPv6 enabled
```

**Concepts SAA-C03** :
- ✅ **Performance** : Edge caching (400+ locations)
- ✅ **Sécurité** : HTTPS obligatoire, OAI
- ✅ **Coût** : Price class 100 (cheaper, suffisant pour EU/US)

##### **CloudWatch Alarms**
```typescript
Alarm: CloudFront 5xx error rate
Threshold: 5% error rate
Evaluation: 2 periods
```

**Concepts SAA-C03** :
- ✅ **Operational Excellence** : Monitoring proactif
- ✅ **Reliability** : Détection des erreurs

---

### **2. Application Vue.js créée** ✅

**Structure complète** :
```
frontend/
├── src/
│   ├── components/
│   │   ├── WalletConnect.vue       (Connexion MetaMask)
│   │   └── TransactionList.vue     (Affichage transactions)
│   ├── views/
│   │   ├── Home.vue                (Page d'accueil)
│   │   └── Dashboard.vue           (Dashboard utilisateur)
│   ├── services/
│   │   ├── auth.service.ts         (Cognito + Web3)
│   │   ├── api.service.ts          (API Gateway client)
│   │   ├── web3.service.ts         (MetaMask interactions)
│   │   └── config.service.ts       (Load config.json)
│   ├── stores/
│   │   └── user.store.ts           (Pinia state management)
│   ├── router/
│   │   └── index.ts                (Vue Router)
│   ├── types/
│   │   └── index.ts                (TypeScript types)
│   ├── App.vue                     (Root component)
│   └── main.ts                     (Entry point)
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

### **3. Services implémentés** ✅

#### **A. Config Service**
```typescript
Fonctionnalité:
- Charge config.json depuis S3 (généré par CDK)
- Fallback vers variables d'environnement (dev)
- Contient: API URL, Cognito IDs, Etherscan config
```

#### **B. Web3 Service**
```typescript
Fonctionnalités:
- Détection MetaMask
- Connexion wallet
- Signature de messages (ECDSA)
- Obtention du solde
- Switch vers Sepolia testnet
- Écoute des changements (account, chain)
```

**Concepts SAA-C03** :
- ✅ **Sécurité** : Pas de clés privées stockées
- ✅ **Frontend** : Interactions Web3 côté client

#### **C. Auth Service**
```typescript
Fonctionnalités:
- Authentification Web3 + Cognito
- Custom Auth Flow (3 Lambda triggers)
- Gestion des JWT tokens (ID, Access, Refresh)
- Refresh automatique des tokens
- Vérification d'authentification
- Déconnexion
```

**Flow d'authentification** :
```
1. User clicks "Connect MetaMask"
2. MetaMask connection approved
3. Cognito initiateAuth (custom flow)
4. Lambda: create-auth-challenge → génère nonce
5. User signs nonce with MetaMask
6. sendCustomChallengeAnswer(signature)
7. Lambda: verify-auth-challenge → vérifie signature
8. Cognito returns JWT tokens
9. Frontend stores tokens
10. Redirect to dashboard
```

**Concepts SAA-C03** :
- ✅ **Sécurité** : Custom Auth Flow (pas de password)
- ✅ **Sécurité** : JWT tokens (stateless)
- ✅ **Operational Excellence** : Refresh automatique

#### **D. API Service**
```typescript
Fonctionnalités:
- Client Axios configuré
- Ajout automatique du JWT token (Authorization header)
- Interceptor pour refresh token (401)
- Retry automatique après refresh
- Endpoints: getTransactions, createAlert, getPreferences, updatePreferences
```

**Concepts SAA-C03** :
- ✅ **Reliability** : Retry logic
- ✅ **Security** : JWT validation par Cognito Authorizer

---

### **4. Composants Vue créés** ✅

#### **WalletConnect.vue**
```typescript
Features:
- Bouton "Connect MetaMask"
- Détection MetaMask installé
- Switch automatique vers Sepolia
- Gestion des erreurs
- Instructions pour l'utilisateur
- Loading state
```

**UI/UX** :
- Design moderne avec glassmorphism
- Dark theme par défaut
- Instructions claires (4 étapes)
- Requirements listés
- Error messages user-friendly

#### **TransactionList.vue**
```typescript
Features:
- Affichage des transactions Sepolia
- Refresh button
- Formatage des données (hash, address, value, time)
- Liens vers Etherscan
- Loading state
- Empty state
- Error handling
```

**UI/UX** :
- Cards avec hover effect
- Monospace pour addresses/hashes
- Couleur verte pour les valeurs
- Liens cliquables vers Etherscan
- Responsive design

#### **App.vue**
```typescript
Features:
- Header avec logo
- Affichage wallet address (short format)
- Bouton Sign Out
- Router view
- Footer
- Theme support (dark/light)
```

---

### **5. Store Pinia (State Management)** ✅

**user.store.ts** :
```typescript
State:
- user (User | null)
- walletAddress (string | null)
- isAuthenticated (boolean)
- isLoading (boolean)
- error (string | null)
- transactions (Transaction[])
- alerts (Alert[])

Computed:
- walletShort (format: 0x1234...5678)

Actions:
- signIn() - Authentification Web3 + Cognito
- signOut() - Déconnexion
- loadTransactions() - Charger transactions
- createAlert() - Créer une alerte
- updatePreferences() - Mettre à jour préférences
- checkAuth() - Vérifier authentification
```

**Concepts** :
- ✅ Centralisation de l'état
- ✅ Réactivité Vue 3
- ✅ Type safety TypeScript

---

### **6. Router Vue** ✅

**Routes** :
```typescript
/ (Home)
  - Component: Home.vue
  - Public
  - Redirect to /dashboard if authenticated

/dashboard (Dashboard)
  - Component: Dashboard.vue
  - Protected (requiresAuth)
  - Redirect to / if not authenticated
```

**Navigation Guard** :
- Vérifie l'authentification avant chaque route
- Redirect automatique selon l'état

---

## 🎓 Concepts SAA-C03 couverts

### **Domaine 1 : Sécurité (30%)**
- ✅ **CloudFront OAI** : S3 bucket privé, accès via CloudFront uniquement
- ✅ **HTTPS obligatoire** : Redirect HTTP → HTTPS
- ✅ **JWT tokens** : Stateless authentication
- ✅ **No credentials in frontend** : Pas de clés API exposées
- ✅ **Web3 signatures** : ECDSA pour authentification

### **Domaine 2 : Résilience (26%)**
- ✅ **S3 versioning** : Rollback en cas d'erreur
- ✅ **CloudFront multi-edge** : 400+ locations
- ✅ **Retry logic** : API service retry automatique
- ✅ **Error handling** : Gestion des erreurs à tous les niveaux

### **Domaine 3 : Performance (24%)**
- ✅ **CloudFront CDN** : Edge caching (latence < 50ms)
- ✅ **HTTP/2 et HTTP/3** : Multiplexing, faster
- ✅ **Compression** : Gzip, Brotli automatique
- ✅ **Code splitting** : Vue Router lazy loading
- ✅ **Vite** : Build tool ultra-rapide

### **Domaine 4 : Coût (20%)**
- ✅ **S3 + CloudFront < EC2** : Serverless, pas de serveur
- ✅ **Price class 100** : EU + US uniquement (cheaper)
- ✅ **Cache hit rate** : Réduit les requests S3
- ✅ **Lifecycle rules** : Delete old versions (storage cost)

### **Domaine 5 : Operational Excellence**
- ✅ **CloudWatch Alarms** : Monitoring 5xx errors
- ✅ **Infrastructure as Code** : CDK pour tout
- ✅ **Automated deployment** : S3 deployment via CDK
- ✅ **Versioning** : Git + S3 versioning

---

## 📊 Architecture complète (4 stacks)

```
┌─────────────────────────────────────────────────────────────────┐
│  UTILISATEUR                                                    │
│  Browser + MetaMask                                             │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  CLOUDFRONT (CDN)                                               │
│  - 400+ edge locations                                          │
│  - HTTPS obligatoire                                            │
│  - Compression automatique                                      │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ OAI
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  S3 BUCKET (Frontend)                                           │
│  - Vue.js SPA                                                   │
│  - config.json (API URL, Cognito IDs)                          │
│  - Versioning enabled                                           │
└─────────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┼───────────┐
                │           │           │
                ▼           ▼           ▼
        ┌───────────┐ ┌───────────┐ ┌───────────┐
        │  COGNITO  │ │    API    │ │  MetaMask │
        │  Custom   │ │  Gateway  │ │   Web3    │
        │   Auth    │ │  + Lambda │ │           │
        └───────────┘ └───────────┘ └───────────┘
                │           │
                └───────────┼───────────┐
                            ▼           │
                    ┌───────────────┐   │
                    │   DynamoDB    │   │
                    │  (3 tables)   │   │
                    └───────────────┘   │
                            │           │
                            │ (cache miss)
                            ▼           ▼
                    ┌───────────────────┐
                    │    Etherscan      │
                    │   API (Sepolia)   │
                    └───────────────────┘
```

---

## 💰 Estimation des coûts (mise à jour)

| Service | Quantité | Coût mensuel |
|---------|----------|--------------|
| **Cognito User Pool** | 1 pool | $0.00 (< 50k MAU) |
| **Lambda Auth (3)** | 30k invocations | $0.01 |
| **Lambda API (4)** | 100k invocations | $0.20 |
| **DynamoDB (3 tables)** | On-Demand | $2.50 |
| **API Gateway** | 100k requests | $0.35 |
| **S3 (Frontend)** | 5 GB storage | $0.12 |
| **CloudFront** | 100 GB transfer | $8.50 |
| **CloudWatch Logs** | 5 GB ingestion | $2.50 |
| **Secrets Manager** | 1 secret | $0.40 |
| **Total Session 4** | | **~$14.58/mois** |

**Total cumulé (Auth + Database + API + Frontend)** : **~$14.60/mois**

---

## 🚀 Prochaine étape : Session 5

### **Déploiement et Tests**

#### **À faire**
1. **Créer le secret Etherscan API key**
   ```bash
   aws secretsmanager create-secret \
     --name web3-dashboard/etherscan-api-key \
     --secret-string '{"apiKey":"YOUR_API_KEY"}' \
     --region eu-west-3
   ```

2. **Déployer l'infrastructure CDK**
   ```bash
   cd infrastructure
   cdk bootstrap  # Si première fois
   cdk deploy --all
   ```

3. **Builder le frontend Vue.js**
   ```bash
   cd frontend
   npm install
   npm run build
   ```

4. **Déployer le frontend sur S3**
   - Décommenter les lignes de déploiement dans `frontend-stack.ts`
   - Redéployer : `cdk deploy Web3DashboardFrontendStack`

5. **Tester l'application**
   - Ouvrir l'URL CloudFront
   - Connecter MetaMask (Sepolia)
   - Tester l'authentification
   - Vérifier les transactions
   - Créer une alerte
   - Vérifier les préférences

---

## 📝 Fichiers créés (Session 4)

### **Infrastructure CDK**
- ✅ `infrastructure/lib/stacks/frontend-stack.ts` (230 lignes)
- ✅ `infrastructure/bin/app.ts` (mise à jour)

### **Frontend Vue.js**
- ✅ `frontend/package.json`
- ✅ `frontend/vite.config.ts`
- ✅ `frontend/tsconfig.json`
- ✅ `frontend/index.html`
- ✅ `frontend/.env.example`
- ✅ `frontend/README.md`

### **Services**
- ✅ `frontend/src/services/config.service.ts` (40 lignes)
- ✅ `frontend/src/services/web3.service.ts` (170 lignes)
- ✅ `frontend/src/services/auth.service.ts` (200 lignes)
- ✅ `frontend/src/services/api.service.ts` (130 lignes)

### **Stores**
- ✅ `frontend/src/stores/user.store.ts` (150 lignes)

### **Components**
- ✅ `frontend/src/components/WalletConnect.vue` (150 lignes)
- ✅ `frontend/src/components/TransactionList.vue` (180 lignes)

### **Views**
- ✅ `frontend/src/views/Home.vue` (20 lignes)
- ✅ `frontend/src/views/Dashboard.vue` (40 lignes)

### **Router & Main**
- ✅ `frontend/src/router/index.ts` (40 lignes)
- ✅ `frontend/src/main.ts` (10 lignes)
- ✅ `frontend/src/App.vue` (120 lignes)

### **Types**
- ✅ `frontend/src/types/index.ts` (50 lignes)

**Total** : ~1700 lignes de code TypeScript/Vue

---

## 🎯 Validation des acquis

### **Quiz 1 : CloudFront OAI vs Public S3**
**Q** : Pourquoi utiliser CloudFront OAI au lieu de rendre le bucket S3 public ?

**Réponse** : ✅
- **Sécurité** : S3 bucket reste privé, pas d'accès direct
- **Performance** : CloudFront cache à l'edge (latence réduite)
- **Coût** : Cache hit = pas de request S3 (économie)
- **HTTPS** : CloudFront force HTTPS (S3 website = HTTP uniquement)
- **Domaine SAA-C03** : Security (30%) + Performance (24%)

### **Quiz 2 : SPA routing avec CloudFront**
**Q** : Pourquoi configurer error responses 403/404 → index.html ?

**Réponse** : ✅
- **SPA routing** : Vue Router gère les routes côté client
- **Problème** : CloudFront cherche `/dashboard` dans S3 → 404
- **Solution** : Redirect 404 → index.html, Vue Router prend le relais
- **Domaine SAA-C03** : Operational Excellence (best practice SPA)

### **Quiz 3 : Price Class 100 vs ALL**
**Q** : Pourquoi utiliser Price Class 100 au lieu de ALL ?

**Réponse** : ✅
- **Price Class 100** : North America + Europe uniquement
- **Price Class ALL** : Toutes les edge locations (Asie, Australie, etc.)
- **Coût** : Class 100 = 30% moins cher que ALL
- **Use case** : Si utilisateurs principalement EU/US, Class 100 suffit
- **Domaine SAA-C03** : Cost Optimization (20%)

---

## 🔍 Points d'attention

### **Avant déploiement**
1. ⚠️ **Etherscan API key** : Créer le secret dans Secrets Manager
2. ⚠️ **Frontend build** : Builder l'app Vue.js (`npm run build`)
3. ⚠️ **S3 deployment** : Décommenter les lignes dans `frontend-stack.ts`
4. ⚠️ **MetaMask** : Installer l'extension browser
5. ⚠️ **Sepolia testnet** : Avoir des ETH de test

### **Configuration frontend**
```bash
# Après déploiement CDK, récupérer les outputs
cdk deploy --all --outputs-file outputs.json

# Les valeurs seront dans config.json (généré automatiquement)
```

---

## 📚 Ressources consultées

### **Documentation AWS**
- ✅ [CloudFront + S3 Static Website](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/GettingStarted.SimpleDistribution.html)
- ✅ [CloudFront OAI](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html)
- ✅ [S3 Versioning](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html)

### **Documentation Vue.js**
- ✅ [Vue 3 Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)
- ✅ [Pinia State Management](https://pinia.vuejs.org/)
- ✅ [Vue Router](https://router.vuejs.org/)

### **Documentation Web3**
- ✅ [Ethers.js](https://docs.ethers.org/v6/)
- ✅ [MetaMask Docs](https://docs.metamask.io/)
- ✅ [Amazon Cognito Identity SDK](https://github.com/aws-amplify/amplify-js/tree/main/packages/amazon-cognito-identity-js)

---

## ✅ Résumé Session 4

### **Accomplissements**
- ✅ FrontendStack créé (S3 + CloudFront + OAI)
- ✅ Application Vue.js complète (1700 lignes)
- ✅ 4 services implémentés (config, web3, auth, api)
- ✅ 2 composants Vue (WalletConnect, TransactionList)
- ✅ Store Pinia pour state management
- ✅ Router Vue avec navigation guards
- ✅ TypeScript types définis
- ✅ Compilation et synthèse CDK réussies

### **Concepts SAA-C03 maîtrisés**
- ✅ CloudFront (CDN, OAI, HTTPS, caching)
- ✅ S3 (static hosting, versioning, lifecycle)
- ✅ SPA architecture (routing, state management)
- ✅ Web3 integration (MetaMask, ECDSA signatures)
- ✅ JWT authentication (Cognito custom flow)

### **Prochaine session**
🚀 **Session 5 : Déploiement AWS et tests E2E**

---

**Dernière mise à jour** : 18 décembre 2024, 15:00 UTC+01:00  
**Prochaine étape** : Déployer l'infrastructure sur AWS et tester l'application complète
