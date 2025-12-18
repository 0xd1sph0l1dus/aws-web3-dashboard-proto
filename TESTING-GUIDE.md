# 🧪 Guide de tests pratiques - Web3 Transaction Dashboard

> **Objectif** : Comprendre le projet en testant les commandes CDK (sans déployer sur AWS)

---

## 📋 Tests à exécuter (ordre recommandé)

### ✅ **Test 1 : Vérifier la structure du projet**

```bash
# Lister tous les fichiers TypeScript et Markdown
find . -type f \( -name "*.ts" -o -name "*.md" -o -name "*.json" \) -not -path "*/node_modules/*"

# Compter les lignes de code
find . -name "*.ts" -not -path "*/node_modules/*" | xargs wc -l

# Compter les lignes de documentation
find . -name "*.md" | xargs wc -l
```

**Résultat attendu** :
```
~1000 lignes de code TypeScript
~2500 lignes de documentation
```

---

### ✅ **Test 2 : Compiler le TypeScript**

```bash
cd infrastructure

# Compiler le TypeScript en JavaScript
npm run build

# Vérifier les fichiers générés
ls -la bin/*.js lib/**/*.js
```

**Ce que ça fait** :
- ✅ Vérifie que le code TypeScript est valide
- ✅ Génère des fichiers `.js` dans `dist/`
- ❌ Ne crée AUCUNE ressource AWS
- ❌ Ne coûte rien

**Résultat attendu** :
```
infrastructure/bin/app.js
infrastructure/lib/stacks/auth-stack.js
```

**🎓 Concept SAA-C03** : TypeScript → JavaScript (compilation locale)

---

### ✅ **Test 3 : Synthétiser les templates CloudFormation**

```bash
cd infrastructure

# Générer les templates CloudFormation (JSON)
npm run synth

# OU
cdk synth

# Voir les fichiers générés
ls -la cdk.out/
```

**Ce que ça fait** :
- ✅ Exécute `app.ts` sur ton PC
- ✅ Génère des templates CloudFormation (JSON)
- ✅ Stocke dans `cdk.out/`
- ❌ Ne crée AUCUNE ressource AWS
- ❌ Ne coûte rien

**Résultat attendu** :
```
cdk.out/
├── Web3DashboardAuthStack.template.json      (template CloudFormation)
├── Web3DashboardDatabaseStack.template.json
├── Web3DashboardApiStack.template.json
├── Web3DashboardFrontendStack.template.json
├── Web3DashboardMonitoringStack.template.json
├── manifest.json                              (métadonnées CDK)
└── tree.json                                  (arbre des constructs)
```

**🎓 Concept SAA-C03** : CDK (TypeScript) → CloudFormation (JSON)

---

### ✅ **Test 4 : Inspecter les templates CloudFormation**

```bash
cd infrastructure

# Voir le template AuthStack (format JSON)
cat cdk.out/Web3DashboardAuthStack.template.json | jq '.'

# OU sans jq
cat cdk.out/Web3DashboardAuthStack.template.json

# Compter les ressources AWS
cat cdk.out/Web3DashboardAuthStack.template.json | jq '.Resources | length'
```

**Ce que tu verras** :
```json
{
  "Resources": {
    "DefineAuthChallengeLambda": {
      "Type": "AWS::Lambda::Function",
      "Properties": {
        "Runtime": "nodejs20.x",
        "Handler": "index.handler",
        "Code": { ... },
        "MemorySize": 256,
        "Timeout": 10
      }
    },
    "UserPool": {
      "Type": "AWS::Cognito::UserPool",
      "Properties": {
        "UserPoolName": "web3-dashboard-users",
        "MfaConfiguration": "OPTIONAL",
        "Policies": { ... }
      }
    }
  }
}
```

**🎓 Concept SAA-C03** : 
- CloudFormation = langage déclaratif pour décrire l'infrastructure
- CDK génère automatiquement ce JSON

---

### ✅ **Test 5 : Visualiser l'arbre des constructs**

```bash
cd infrastructure

# Voir l'arbre des ressources
cat cdk.out/tree.json | jq '.tree.children'

# OU installer cdk-dia pour un diagramme visuel
npm install -g cdk-dia
cdk-dia --target diagram.png
```

**Ce que tu verras** :
```
App
├── Web3DashboardAuthStack
│   ├── DefineAuthChallengeLambda
│   ├── CreateAuthChallengeLambda
│   ├── VerifyAuthChallengeLambda
│   └── UserPool
├── Web3DashboardDatabaseStack
│   └── UsersTable
└── ...
```

**🎓 Concept SAA-C03** : Hiérarchie des ressources AWS

---

### ✅ **Test 6 : Lister les stacks CDK**

```bash
cd infrastructure

# Lister tous les stacks définis
cdk list

# OU
cdk ls
```

**Résultat attendu** :
```
Web3DashboardAuthStack
Web3DashboardDatabaseStack
Web3DashboardApiStack
Web3DashboardFrontendStack
Web3DashboardMonitoringStack
```

**🎓 Concept SAA-C03** : 
- 1 stack = 1 unité de déploiement CloudFormation
- Permet de déployer/détruire indépendamment

---

### ✅ **Test 7 : Voir les différences (sans déployer)**

```bash
cd infrastructure

# Comparer avec l'infrastructure déployée (si elle existe)
cdk diff

# OU pour un stack spécifique
cdk diff Web3DashboardAuthStack
```

**Résultat attendu (si rien n'est déployé)** :
```
Stack Web3DashboardAuthStack
There is no stack named Web3DashboardAuthStack in the account
```

**Résultat attendu (si déjà déployé)** :
```
Stack Web3DashboardAuthStack
Resources
[+] AWS::Lambda::Function DefineAuthChallengeLambda
[+] AWS::Cognito::UserPool UserPool
```

**🎓 Concept SAA-C03** : 
- `cdk diff` = `git diff` pour l'infrastructure
- Voir les changements AVANT de déployer

---

### ✅ **Test 8 : Valider les templates CloudFormation**

```bash
cd infrastructure

# Valider la syntaxe CloudFormation
aws cloudformation validate-template \
  --template-body file://cdk.out/Web3DashboardAuthStack.template.json

# OU avec CDK
cdk synth --validation
```

**Résultat attendu** :
```json
{
  "Parameters": [],
  "Description": "Authentication stack with Cognito and Web3 support (SAA-C03)"
}
```

**🎓 Concept SAA-C03** : Validation AVANT déploiement (évite les erreurs)

---

### ✅ **Test 9 : Analyser les métadonnées CDK**

```bash
cd infrastructure

# Voir les métadonnées du projet
cat cdk.out/manifest.json | jq '.'

# Voir les assets (code Lambda, fichiers)
cat cdk.out/manifest.json | jq '.artifacts[].properties.assets'
```

**Ce que tu verras** :
```json
{
  "version": "36.0.0",
  "artifacts": {
    "Web3DashboardAuthStack": {
      "type": "aws:cloudformation:stack",
      "environment": "aws://123456789012/eu-west-3",
      "properties": {
        "templateFile": "Web3DashboardAuthStack.template.json"
      }
    }
  }
}
```

**🎓 Concept SAA-C03** : CDK gère automatiquement les assets (code Lambda)

---

### ✅ **Test 10 : Inspecter le code TypeScript**

```bash
# Lire le point d'entrée CDK
cat infrastructure/bin/app.ts

# Lire le stack d'authentification
cat infrastructure/lib/stacks/auth-stack.ts

# Compter les commentaires pédagogiques
grep -r "Concept SAA-C03" infrastructure/ | wc -l
```

**Ce que tu verras** :
- 5 stacks définis dans `app.ts`
- Commentaires détaillés expliquant chaque choix
- Références aux 4 domaines de l'examen SAA-C03

---

## 🎓 Tests avancés (optionnels)

### **Test 11 : Simuler un déploiement (dry-run)**

```bash
cd infrastructure

# Voir ce qui serait déployé (sans déployer)
cdk deploy --dry-run

# OU
cdk synth --verbose
```

**Résultat** : Liste détaillée des ressources qui seraient créées

---

### **Test 12 : Estimer les coûts**

```bash
cd infrastructure

# Installer l'outil d'estimation de coûts
npm install -g aws-cdk-cost-estimation

# Estimer les coûts mensuels
cdk-cost-estimation --stack Web3DashboardAuthStack
```

**Résultat attendu** :
```
Cognito User Pool: $0.00 (Free Tier)
Lambda (3 functions): $0.06/month
Total: ~$0.06/month
```

---

### **Test 13 : Générer un diagramme d'architecture**

```bash
cd infrastructure

# Installer cdk-dia
npm install -g cdk-dia

# Générer un diagramme PNG
cdk-dia --target architecture.png

# OU en SVG
cdk-dia --target architecture.svg
```

**Résultat** : Diagramme visuel de l'architecture

---

### **Test 14 : Vérifier les bonnes pratiques**

```bash
cd infrastructure

# Installer cdk-nag (linter pour CDK)
npm install cdk-nag

# Ajouter dans app.ts :
# import { AwsSolutionsChecks } from 'cdk-nag';
# Aspects.of(app).add(new AwsSolutionsChecks());

# Exécuter
cdk synth
```

**Résultat** : Warnings sur les bonnes pratiques AWS

---

## 📊 Résumé des tests (checklist)

| Test | Commande | Durée | Coût AWS | Apprentissage |
|------|----------|-------|----------|---------------|
| ✅ Structure | `find . -name "*.ts"` | 1s | $0 | Structure projet |
| ✅ Compilation | `npm run build` | 10s | $0 | TypeScript → JS |
| ✅ Synthèse | `cdk synth` | 15s | $0 | CDK → CloudFormation |
| ✅ Templates | `cat cdk.out/*.json` | 5s | $0 | Format CloudFormation |
| ✅ Arbre | `cat cdk.out/tree.json` | 5s | $0 | Hiérarchie ressources |
| ✅ Liste stacks | `cdk list` | 5s | $0 | Organisation stacks |
| ✅ Diff | `cdk diff` | 10s | $0 | Changements infra |
| ✅ Validation | `aws cloudformation validate` | 5s | $0 | Syntaxe correcte |
| ✅ Métadonnées | `cat cdk.out/manifest.json` | 5s | $0 | Assets CDK |
| ✅ Code | `cat infrastructure/bin/app.ts` | 2s | $0 | Logique CDK |

**Total : 1 minute, $0 de coût AWS** ✅

---

## 🚀 Commandes à exécuter maintenant

```bash
# 1. Aller dans le dossier infrastructure
cd ~/workspace/aws-projects/web3-transaction-dashboard/infrastructure

# 2. Installer les dépendances (déjà fait)
npm install

# 3. Compiler le TypeScript
npm run build

# 4. Synthétiser les templates CloudFormation
cdk synth

# 5. Lister les stacks
cdk list

# 6. Voir le template AuthStack
cat cdk.out/Web3DashboardAuthStack.template.json | head -50

# 7. Compter les ressources AWS
cat cdk.out/Web3DashboardAuthStack.template.json | grep -c "Type.*AWS::"
```

---

## 🎯 Ce que tu vas apprendre

### **Après ces tests, tu comprendras :**

1. **CDK → CloudFormation** : Comment CDK génère du JSON
2. **Structure des stacks** : Organisation en 5 stacks indépendants
3. **Ressources AWS** : Cognito, Lambda, DynamoDB, etc.
4. **Métadonnées** : Assets, versions, environnements
5. **Workflow CDK** : `build → synth → diff → deploy`

### **Concepts SAA-C03 couverts :**

- ✅ **Infrastructure as Code** (IaC)
- ✅ **CloudFormation** (service de déploiement)
- ✅ **Stacks** (unités de déploiement)
- ✅ **Resources** (services AWS)
- ✅ **Templates** (fichiers JSON déclaratifs)

---

## 💡 Prochaine étape

Après avoir testé ces commandes, tu seras prêt pour :

**Session 2 : Implémenter les Lambda functions (auth)**
- Créer le code des 3 Lambda triggers
- Tester localement avec `sam local invoke`
- Comprendre le flow d'authentification Web3

---

**Commence par exécuter les commandes ci-dessus et dis-moi ce que tu observes !** 🚀
