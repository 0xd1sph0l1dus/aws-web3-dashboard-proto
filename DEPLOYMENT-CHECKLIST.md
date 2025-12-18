# 🚀 Checklist de déploiement - Session 5

> **Objectif** : Déployer l'infrastructure complète sur AWS et tester l'application

---

## ✅ Pré-requis

### **1. Compte AWS**
- [ ] Compte AWS actif
- [ ] AWS CLI installé et configuré
- [ ] Credentials AWS configurés (`aws configure`)
- [ ] Région : `eu-west-3` (Paris)

### **2. Outils de développement**
- [ ] Node.js 20+ installé
- [ ] npm installé
- [ ] AWS CDK CLI installé (`npm install -g aws-cdk`)
- [ ] Git installé

### **3. Services externes**
- [ ] Compte Etherscan (gratuit)
- [ ] Clé API Etherscan obtenue
- [ ] MetaMask installé (extension browser)
- [ ] Wallet Ethereum avec ETH Sepolia testnet

### **4. Vérifications**
```bash
# Vérifier les versions
node --version        # v20+
npm --version         # v10+
cdk --version         # v2.x
aws --version         # v2.x

# Vérifier les credentials AWS
aws sts get-caller-identity
```

---

## 📋 Étape 1 : Préparation

### **1.1 Cloner/Vérifier le projet**
```bash
cd ~/workspace/aws-projects/web3-transaction-dashboard

# Vérifier la structure
ls -la infrastructure/
ls -la frontend/
ls -la backend/
```

### **1.2 Installer les dépendances**
```bash
# Infrastructure CDK
cd infrastructure
npm install

# Frontend Vue.js
cd ../frontend
npm install

# Backend Lambda (optionnel, déjà inclus dans CDK)
cd ../backend/auth/define-auth-challenge
npm install
```

### **1.3 Créer le secret Etherscan**
```bash
# Remplacer YOUR_ETHERSCAN_API_KEY par votre clé
aws secretsmanager create-secret \
  --name web3-dashboard/etherscan-api-key \
  --secret-string '{"apiKey":"YOUR_ETHERSCAN_API_KEY"}' \
  --region eu-west-3

# Vérifier
aws secretsmanager describe-secret \
  --secret-id web3-dashboard/etherscan-api-key \
  --region eu-west-3
```

---

## 📋 Étape 2 : Déploiement infrastructure

### **2.1 Bootstrap CDK (première fois uniquement)**
```bash
cd infrastructure

# Obtenir l'Account ID
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Bootstrap
cdk bootstrap aws://${AWS_ACCOUNT_ID}/eu-west-3
```

### **2.2 Compiler et synthétiser**
```bash
# Compiler TypeScript
npm run build

# Synthétiser les templates CloudFormation
npm run synth

# Vérifier les stacks
cdk list
# Résultat attendu :
# Web3DashboardAuthStack
# Web3DashboardDatabaseStack
# Web3DashboardApiStack
# Web3DashboardFrontendStack
```

### **2.3 Déployer les stacks (ordre important)**
```bash
# Option 1 : Déployer tous les stacks d'un coup
cdk deploy --all --require-approval never

# Option 2 : Déployer un par un (recommandé pour debug)
cdk deploy Web3DashboardAuthStack
cdk deploy Web3DashboardDatabaseStack
cdk deploy Web3DashboardApiStack
cdk deploy Web3DashboardFrontendStack
```

### **2.4 Sauvegarder les outputs**
```bash
# Sauvegarder les outputs dans un fichier
cdk deploy --all --outputs-file outputs.json

# Afficher les outputs importants
cat outputs.json | grep -E "UserPoolId|ApiUrl|DistributionUrl"
```

**Outputs attendus** :
- `UserPoolId` : ID du Cognito User Pool
- `UserPoolClientId` : ID du Cognito Client
- `ApiUrl` : URL de l'API Gateway
- `DistributionUrl` : URL CloudFront

---

## 📋 Étape 3 : Déploiement frontend

### **3.1 Configurer l'environnement (dev)**
```bash
cd frontend

# Créer .env (optionnel, pour dev local)
cp .env.example .env

# Éditer .env avec les valeurs des outputs CDK
nano .env
```

### **3.2 Builder l'application**
```bash
# Installer les dépendances
npm install

# Builder pour production
npm run build

# Vérifier le build
ls -lh dist/
```

### **3.3 Déployer sur S3**

**Option A : Via CDK (recommandé)**
```bash
# 1. Décommenter les lignes de déploiement dans frontend-stack.ts
cd ../infrastructure
nano lib/stacks/frontend-stack.ts

# Décommenter :
# - const deployment = new s3deploy.BucketDeployment(...)
# - new s3deploy.BucketDeployment(..., 'DeployConfig', ...)

# 2. Recompiler et redéployer
npm run build
cdk deploy Web3DashboardFrontendStack
```

**Option B : Manuellement avec AWS CLI**
```bash
# Obtenir le nom du bucket depuis les outputs
BUCKET_NAME=$(cat ../infrastructure/outputs.json | jq -r '.Web3DashboardFrontendStack.BucketName')

# Uploader les fichiers
aws s3 sync dist/ s3://${BUCKET_NAME}/ --delete

# Invalider le cache CloudFront
DISTRIBUTION_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?Comment=='Web3 Dashboard Frontend CDN'].Id" --output text)
aws cloudfront create-invalidation --distribution-id ${DISTRIBUTION_ID} --paths "/*"
```

---

## 📋 Étape 4 : Tests

### **4.1 Vérifier l'infrastructure**
```bash
# Vérifier les stacks déployés
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE

# Vérifier Cognito
aws cognito-idp list-user-pools --max-results 10 --region eu-west-3

# Vérifier DynamoDB
aws dynamodb list-tables --region eu-west-3

# Vérifier API Gateway
aws apigateway get-rest-apis --region eu-west-3

# Vérifier CloudFront
aws cloudfront list-distributions
```

### **4.2 Tester l'application**

**4.2.1 Accéder à l'application**
```bash
# Obtenir l'URL CloudFront
cat infrastructure/outputs.json | jq -r '.Web3DashboardFrontendStack.DistributionUrl'

# Ouvrir dans le browser
# https://xxxxx.cloudfront.net
```

**4.2.2 Tester l'authentification**
- [ ] Cliquer sur "Connect MetaMask"
- [ ] Approuver la connexion dans MetaMask
- [ ] Changer vers Sepolia testnet si demandé
- [ ] Signer le message (nonce)
- [ ] Vérifier la redirection vers /dashboard
- [ ] Vérifier l'affichage de l'adresse wallet

**4.2.3 Tester les transactions**
- [ ] Vérifier l'affichage des transactions Sepolia
- [ ] Cliquer sur "Refresh"
- [ ] Vérifier les liens vers Etherscan
- [ ] Vérifier le formatage des données

**4.2.4 Tester la déconnexion**
- [ ] Cliquer sur "Sign Out"
- [ ] Vérifier la redirection vers /
- [ ] Vérifier que l'accès à /dashboard est bloqué

### **4.3 Vérifier les logs**
```bash
# Logs Lambda Auth
aws logs tail /aws/lambda/web3-dashboard-define-auth-challenge --follow

# Logs Lambda API
aws logs tail /aws/lambda/web3-dashboard-get-transactions --follow

# Logs API Gateway
aws logs tail /aws/apigateway/web3-dashboard-api --follow
```

### **4.4 Vérifier les métriques**
```bash
# CloudWatch Dashboard (créer manuellement ou via console)
# Métriques à surveiller :
# - Lambda invocations
# - Lambda errors
# - API Gateway 4xx/5xx
# - DynamoDB read/write capacity
# - CloudFront requests
```

---

## 📋 Étape 5 : Monitoring et optimisation

### **5.1 Configurer les alarmes**
Les alarmes sont déjà créées par CDK :
- Cognito auth errors
- DynamoDB throttling
- API Gateway 5xx errors
- CloudFront 5xx errors

Vérifier dans CloudWatch Console.

### **5.2 Vérifier les coûts**
```bash
# AWS Cost Explorer (console web)
# Filtrer par :
# - Service : Lambda, DynamoDB, API Gateway, CloudFront, S3
# - Tag : Project=Web3TransactionDashboard
```

### **5.3 Optimisations possibles**
- [ ] Activer API Gateway caching (si > 1000 req/jour)
- [ ] Ajuster Lambda memory size selon les métriques
- [ ] Configurer DynamoDB auto-scaling (si trafic prévisible)
- [ ] Activer CloudFront compression (déjà fait)

---

## 🐛 Troubleshooting

### **Erreur : "Cannot find asset"**
```bash
# Solution : Builder le frontend d'abord
cd frontend
npm run build
```

### **Erreur : "Secret not found"**
```bash
# Solution : Créer le secret Etherscan
aws secretsmanager create-secret \
  --name web3-dashboard/etherscan-api-key \
  --secret-string '{"apiKey":"YOUR_KEY"}' \
  --region eu-west-3
```

### **Erreur : "MetaMask not connected"**
```bash
# Solutions :
# 1. Installer MetaMask extension
# 2. Créer/importer un wallet
# 3. Changer vers Sepolia testnet
# 4. Obtenir des ETH testnet (faucet)
```

### **Erreur : "No transactions found"**
```bash
# Solutions :
# 1. Vérifier que le wallet a des transactions sur Sepolia
# 2. Vérifier la clé API Etherscan
# 3. Vérifier les logs Lambda get-transactions
```

### **Erreur : "401 Unauthorized"**
```bash
# Solutions :
# 1. Vérifier que le token JWT est valide
# 2. Se reconnecter avec MetaMask
# 3. Vérifier les logs Cognito
```

---

## 🧹 Nettoyage (optionnel)

### **Supprimer toute l'infrastructure**
```bash
cd infrastructure

# Supprimer tous les stacks (ordre inverse)
cdk destroy Web3DashboardFrontendStack
cdk destroy Web3DashboardApiStack
cdk destroy Web3DashboardDatabaseStack
cdk destroy Web3DashboardAuthStack

# Ou tout d'un coup
cdk destroy --all

# Supprimer le secret
aws secretsmanager delete-secret \
  --secret-id web3-dashboard/etherscan-api-key \
  --force-delete-without-recovery \
  --region eu-west-3
```

**⚠️ Attention** : Cela supprimera toutes les données (tables DynamoDB, logs, etc.)

---

## 📊 Checklist finale

### **Infrastructure**
- [ ] 4 stacks déployés avec succès
- [ ] Aucune erreur dans CloudFormation
- [ ] Tous les outputs disponibles
- [ ] Secret Etherscan créé

### **Frontend**
- [ ] Application buildée
- [ ] Fichiers uploadés sur S3
- [ ] CloudFront accessible
- [ ] config.json présent

### **Tests**
- [ ] Authentification Web3 fonctionne
- [ ] Transactions affichées
- [ ] Refresh fonctionne
- [ ] Déconnexion fonctionne
- [ ] Pas d'erreurs dans les logs

### **Monitoring**
- [ ] CloudWatch Alarms configurées
- [ ] Logs accessibles
- [ ] Métriques visibles
- [ ] Coûts surveillés

---

## 🎉 Succès !

Si tous les tests passent, le projet est **déployé avec succès** ! 🚀

**Prochaine étape** : Session 6 - Portfolio et certification
- Créer des diagrammes d'architecture
- Enregistrer une vidéo de démo
- Rédiger un article de blog
- Préparer la présentation
- Passer l'examen SAA-C03

---

**Dernière mise à jour** : 18 décembre 2024  
**Durée estimée** : 2-3 heures (première fois)
