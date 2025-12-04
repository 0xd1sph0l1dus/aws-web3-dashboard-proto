# 🚀 Guide de déploiement - Web3 Transaction Dashboard

> **Guide pas à pas pour déployer l'infrastructure AWS (SAA-C03)**

---

## 📋 Prérequis

### **1. Compte AWS**
- [ ] Compte AWS actif (Free Tier recommandé)
- [ ] Accès administrateur (ou permissions IAM suffisantes)
- [ ] Carte bancaire enregistrée (pour services hors Free Tier)

### **2. Outils locaux**

```bash
# Vérifier les versions
node --version    # >= 20.x
npm --version     # >= 10.x
aws --version     # >= 2.x
cdk --version     # >= 2.x
```

**Installation si nécessaire** :

```bash
# Node.js 20 (via nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# AWS CDK
npm install -g aws-cdk
```

### **3. Configuration AWS CLI**

```bash
# Configurer les credentials
aws configure

# Vérifier la configuration
aws sts get-caller-identity

# Output attendu :
# {
#   "UserId": "AIDAXXXXXXXXXXXXXXXXX",
#   "Account": "123456789012",
#   "Arn": "arn:aws:iam::123456789012:user/your-username"
# }
```

### **4. Clés API externes**

- [ ] **Etherscan API Key** (gratuit) : https://etherscan.io/apis
- [ ] **Alchemy API Key** (optionnel) : https://www.alchemy.com/

---

## 🏗️ Étape 1 : Cloner et configurer le projet

```bash
# 1. Cloner le repository (ou utiliser le dossier existant)
cd ~/aws-projects/web3-transaction-dashboard

# 2. Copier le fichier d'environnement
cp .env.example .env

# 3. Éditer .env avec vos valeurs
nano .env

# Valeurs à modifier :
# - CDK_DEFAULT_ACCOUNT : votre Account ID AWS
# - CDK_DEFAULT_REGION : eu-west-3 (Paris)
# - ETHERSCAN_API_KEY : votre clé API
# - ALERT_EMAIL : votre email
```

**Exemple `.env` complété** :
```bash
CDK_DEFAULT_ACCOUNT=123456789012
CDK_DEFAULT_REGION=eu-west-3
ENVIRONMENT=dev
OWNER=student@example.com
ETHERSCAN_API_KEY=ABC123XYZ789
ALERT_EMAIL=admin@example.com
MONTHLY_BUDGET=50
CACHE_NODE_TYPE=cache.t3.micro
ENABLE_MFA=false
ENABLE_WAF=false
LOG_RETENTION_DAYS=7
ENABLE_XRAY=true
```

---

## 📦 Étape 2 : Installer les dépendances

```bash
# Infrastructure (CDK)
cd infrastructure
npm install

# Backend (Lambda functions)
cd ../backend/auth/define-auth-challenge
npm install
cd ../create-auth-challenge
npm install
cd ../verify-auth-challenge
npm install

# Retour à la racine
cd ~/aws-projects/web3-transaction-dashboard
```

---

## 🔧 Étape 3 : Bootstrap CDK (première fois uniquement)

```bash
cd infrastructure

# Bootstrap CDK dans votre compte AWS
cdk bootstrap aws://ACCOUNT-ID/REGION

# Exemple :
cdk bootstrap aws://123456789012/eu-west-3

# Output attendu :
# ✅ Environment aws://123456789012/eu-west-3 bootstrapped
```

**🎓 Concept SAA-C03 : Qu'est-ce que le bootstrap ?**

Le bootstrap CDK crée :
- Un bucket S3 pour stocker les assets (code Lambda, templates)
- Des rôles IAM pour le déploiement
- Une stack CloudFormation `CDKToolkit`

**Coût** : Gratuit (S3 < 1 GB)

---

## 🚀 Étape 4 : Déployer l'infrastructure

### **Option A : Déploiement complet (tous les stacks)**

```bash
cd infrastructure

# Synthétiser les templates CloudFormation (vérification)
cdk synth

# Déployer tous les stacks
cdk deploy --all

# Confirmation requise (taper 'y')
# Do you wish to deploy these changes (y/n)? y
```

**Durée estimée** : 10-15 minutes

### **Option B : Déploiement incrémental (stack par stack)**

```bash
# 1. Authentication Stack (Cognito + Lambda)
cdk deploy Web3DashboardAuthStack

# 2. Database Stack (DynamoDB)
cdk deploy Web3DashboardDatabaseStack

# 3. API Stack (API Gateway + Lambda + ElastiCache)
cdk deploy Web3DashboardApiStack

# 4. Frontend Stack (S3 + CloudFront)
cdk deploy Web3DashboardFrontendStack

# 5. Monitoring Stack (CloudWatch + Alarms)
cdk deploy Web3DashboardMonitoringStack
```

---

## 📊 Étape 5 : Vérifier le déploiement

### **1. Console AWS**

```bash
# Ouvrir la console CloudFormation
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE

# Vérifier les stacks déployés
# - Web3DashboardAuthStack
# - Web3DashboardDatabaseStack
# - Web3DashboardApiStack
# - Web3DashboardFrontendStack
# - Web3DashboardMonitoringStack
```

### **2. Outputs CDK**

Après le déploiement, CDK affiche les outputs :

```
Outputs:
Web3DashboardAuthStack.UserPoolId = eu-west-3_XXXXXXXXX
Web3DashboardAuthStack.UserPoolClientId = 1a2b3c4d5e6f7g8h9i0j
Web3DashboardApiStack.ApiUrl = https://abc123xyz.execute-api.eu-west-3.amazonaws.com/prod
Web3DashboardFrontendStack.CloudFrontUrl = https://d1234567890abc.cloudfront.net
```

**Copier ces valeurs** pour la configuration frontend.

### **3. Tests manuels**

```bash
# Test 1 : API Gateway health check
curl https://YOUR_API_URL/health

# Output attendu :
# {"status":"ok","timestamp":"2024-12-04T12:00:00Z"}

# Test 2 : CloudFront (frontend)
curl -I https://YOUR_CLOUDFRONT_URL

# Output attendu :
# HTTP/2 200
# x-cache: Hit from cloudfront
```

---

## 🧪 Étape 6 : Tester l'authentification Web3

### **1. Créer un utilisateur test**

```bash
# Via AWS CLI
aws cognito-idp sign-up \
  --client-id YOUR_CLIENT_ID \
  --username test@example.com \
  --password Test1234! \
  --user-attributes Name=email,Value=test@example.com

# Confirmer l'email (dev uniquement)
aws cognito-idp admin-confirm-sign-up \
  --user-pool-id YOUR_USER_POOL_ID \
  --username test@example.com
```

### **2. Tester le Custom Auth Flow**

```bash
# Initier l'authentification
aws cognito-idp initiate-auth \
  --client-id YOUR_CLIENT_ID \
  --auth-flow CUSTOM_AUTH \
  --auth-parameters USERNAME=test@example.com

# Output attendu :
# {
#   "ChallengeName": "CUSTOM_CHALLENGE",
#   "Session": "...",
#   "ChallengeParameters": {
#     "nonce": "0x1234567890abcdef..."
#   }
# }
```

---

## 💰 Étape 7 : Surveiller les coûts

### **1. Activer Cost Explorer**

```bash
# Console AWS → Cost Management → Cost Explorer
# Activer (gratuit)
```

### **2. Créer un budget**

```bash
# Via CDK (déjà configuré dans MonitoringStack)
# OU via CLI :

aws budgets create-budget \
  --account-id YOUR_ACCOUNT_ID \
  --budget file://budget.json \
  --notifications-with-subscribers file://notifications.json
```

**budget.json** :
```json
{
  "BudgetName": "Web3DashboardBudget",
  "BudgetLimit": {
    "Amount": "50",
    "Unit": "USD"
  },
  "TimeUnit": "MONTHLY",
  "BudgetType": "COST"
}
```

### **3. Vérifier les coûts quotidiens**

```bash
# Coûts des dernières 24h
aws ce get-cost-and-usage \
  --time-period Start=$(date -d '1 day ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity DAILY \
  --metrics BlendedCost \
  --group-by Type=SERVICE
```

---

## 🔍 Étape 8 : Monitoring et logs

### **1. CloudWatch Logs**

```bash
# Lister les log groups
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/web3-dashboard

# Voir les logs récents (Lambda auth)
aws logs tail /aws/lambda/web3-dashboard-verify-auth-challenge --follow
```

### **2. CloudWatch Metrics**

```bash
# Console AWS → CloudWatch → Dashboards
# Ouvrir : Web3DashboardMonitoringDashboard

# Métriques à surveiller :
# - Lambda Invocations
# - API Gateway 4xx/5xx errors
# - DynamoDB throttled requests
# - ElastiCache CPU utilization
```

### **3. X-Ray Tracing**

```bash
# Console AWS → X-Ray → Service Map
# Visualiser le flux : API Gateway → Lambda → DynamoDB
```

---

## 🧹 Étape 9 : Nettoyage (détruire l'infrastructure)

```bash
cd infrastructure

# Détruire tous les stacks (ATTENTION : irréversible)
cdk destroy --all

# Confirmation requise (taper le nom du stack)
# Are you sure you want to delete: Web3DashboardAuthStack (y/n)? y
```

**⚠️ Attention** :
- DynamoDB tables avec `RETAIN` policy ne seront pas supprimées
- S3 buckets avec contenu doivent être vidés manuellement
- CloudWatch Logs peuvent persister

**Nettoyage manuel** :
```bash
# Vider les buckets S3
aws s3 rm s3://YOUR_BUCKET_NAME --recursive

# Supprimer les log groups
aws logs delete-log-group --log-group-name /aws/lambda/web3-dashboard-verify-auth-challenge
```

---

## 🐛 Dépannage

### **Erreur : "Unable to resolve AWS account"**

```bash
# Vérifier les credentials
aws sts get-caller-identity

# Reconfigurer si nécessaire
aws configure
```

### **Erreur : "Stack already exists"**

```bash
# Supprimer la stack existante
cdk destroy Web3DashboardAuthStack

# Redéployer
cdk deploy Web3DashboardAuthStack
```

### **Erreur : "Insufficient permissions"**

Permissions IAM minimales requises :
- `cloudformation:*`
- `iam:*`
- `lambda:*`
- `cognito-idp:*`
- `dynamodb:*`
- `s3:*`
- `cloudfront:*`
- `apigateway:*`

**Solution** : Utiliser `AdministratorAccess` (dev uniquement)

### **Erreur : "Rate exceeded"**

```bash
# Attendre 1 minute et réessayer
sleep 60
cdk deploy --all
```

---

## 📚 Ressources supplémentaires

### **Documentation AWS**
- [CDK TypeScript Reference](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-construct-library.html)
- [Cognito Developer Guide](https://docs.aws.amazon.com/cognito/latest/developerguide/)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)

### **Tutoriels**
- [CDK Workshop](https://cdkworkshop.com/)
- [Serverless Patterns](https://serverlessland.com/patterns)

### **Support**
- [AWS Forums](https://forums.aws.amazon.com/)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/aws-cdk)

---

## ✅ Checklist de déploiement

- [ ] AWS CLI configuré
- [ ] CDK installé (>= 2.x)
- [ ] `.env` configuré
- [ ] Dépendances installées
- [ ] CDK bootstrappé
- [ ] Stacks déployés
- [ ] Outputs récupérés
- [ ] Tests manuels OK
- [ ] Budget configuré
- [ ] Monitoring actif

---

**Prochaine étape** : [Développer le frontend Vue.js](./frontend-guide.md)

**Retour** : [README principal](../README.md)
