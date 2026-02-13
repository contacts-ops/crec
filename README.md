# CREC Experts Comptables - Site Exporté

Ce projet a été exporté depuis Majoli Hub et est prêt pour le déploiement.

## 📋 Informations du site
- **Nom**: CREC Experts Comptables
- **Description**: Pilotez votre entreprise avec sérénité grâce à un accompagnement stratégique, humain et digital.
- **Pages**: 11 page(s)
- **Statut**: Développement
- **Exporté le**: 12/02/2026

## 🚀 Déploiement sur AWS Amplify

### 1. Prérequis
- Compte AWS avec accès à AWS Amplify
- Node.js 18+ installé

### 2. Installation locale
```bash
npm install
npm run dev
```

### 3. Déploiement sur AWS Amplify

#### Option A: Via la console AWS
1. Connectez-vous à la [console AWS Amplify](https://console.aws.amazon.com/amplify/)
2. Cliquez sur "New app" > "Host web app"
3. Connectez votre repository Git ou uploadez ce projet
4. Configurez les paramètres de build :
   - Build command: `npm run build`
   - Output directory: `.next`
5. Cliquez sur "Save and deploy"

#### Option B: Via AWS CLI
```bash
# Installer AWS CLI
aws configure

# Créer l'application Amplify
aws amplify create-app --name "site-e64668ea-2a54-4a8d-8fd0-0744e429c51a" --repository-url "VOTRE_REPO_URL"

# Déployer
aws amplify start-job --app-id "VOTRE_APP_ID" --branch-name main --job-type RELEASE
```

### 4. Configuration personnalisée

#### Variables d'environnement (optionnel)
Si vous avez des variables d'environnement, ajoutez-les dans la console Amplify :
- Allez dans App settings > Environment variables
- Ajoutez vos variables (ex: API_URL, etc.)

#### Domaine personnalisé
1. Dans la console Amplify, allez dans "Domain management"
2. Ajoutez votre domaine personnalisé
3. Configurez les enregistrements DNS selon les instructions

## 📁 Structure du projet

```
├── src/
│   ├── app/           # Pages Next.js
│   ├── components/    # Composants React
│   ├── styles/        # Styles CSS
│   └── lib/          # Utilitaires
├── public/           # Assets statiques
├── package.json      # Dépendances
└── README.md         # Ce fichier
```

## 🔧 Personnalisation

### Ajouter des fonctionnalités
1. Modifiez les composants dans `src/components/`
2. Ajoutez de nouvelles pages dans `src/app/`
3. Personnalisez les styles dans `src/styles/globals.css`

### Configuration Tailwind
- Modifiez `tailwind.config.ts` pour personnaliser les couleurs, espacements, etc.
- Ajoutez de nouveaux plugins si nécessaire

## 🆘 Support

Pour toute question concernant ce projet exporté, contactez l'équipe Majoli Hub.

---

**Note:** Ce projet est une version statique exportée. Pour des fonctionnalités dynamiques (newsletter, avis, etc.), une configuration backend sera nécessaire.