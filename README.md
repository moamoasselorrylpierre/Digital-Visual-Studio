# Digital Visual Studio — By_MLP

Site vitrine professionnel du studio **Digital Visual Studio**, déployé sur **Cloudflare Workers**, avec un **espace administrateur** pour publier les réalisations et gérer les services sans toucher au code.

## 🌐 Aperçu

- **Site public** : page d'accueil moderne (hero, chiffres clés, services, réalisations, à propos, méthode, contact).
- **Espace admin** (`/admin/`) : connexion par mot de passe, puis :
  - 📸 **Réalisations** : upload d'images (compressées automatiquement), titre, catégorie, description, suppression ;
  - 💼 **Services** : ajout, modification, suppression (avec icône Font Awesome au choix).
- Les contenus sont stockés dans **Cloudflare D1** (base de données) et les images dans **Cloudflare KV**.

## 📁 Structure du projet

```
├── public/               → Fichiers statiques servis par Cloudflare
│   ├── index.html        → Page d'accueil
│   ├── admin/index.html  → Espace administrateur
│   ├── css/styles.css    → Styles du site
│   ├── css/admin.css     → Styles de l'admin
│   ├── js/main.js        → Logique du site (chargement services/portfolio, lightbox…)
│   ├── js/admin.js       → Logique de l'admin (login, uploads, CRUD)
│   └── images/           → Images du site (logo, hero, portfolio de secours)
├── src/index.js          → Worker Cloudflare : API + authentification + médias
├── migrations/0001_init.sql → Schéma de la base D1 (référence)
├── wrangler.jsonc        → Configuration Cloudflare (bindings D1 + KV + assets)
└── package.json
```

## 🚀 Déploiement sur Cloudflare (à faire une seule fois)

Les ressources sont **déjà créées** sur ton compte Cloudflare :
- Base D1 : `dvs-database` (`da979065-22bb-4cdd-b843-97c2bf6fe58b`) — tables créées et services insérés ✅
- KV : `dvs-media` (`41340161ff1a4993839265eb07c0a8dc`) ✅

### Étape 1 — Connecter le dépôt GitHub

1. Va sur [dash.cloudflare.com](https://dash.cloudflare.com) → **Compute (Workers)** → **Create** (Créer).
2. Choisis l'onglet **Workers** → **Import a repository** (Importer un dépôt Git).
3. Connecte ton compte GitHub et sélectionne **`Digital-Visual-Studio`**.
4. Branche de production : `main` (ou la branche de ton choix). Laisse la commande de build vide, commande de déploiement : `npx wrangler deploy`.
5. Valide : Cloudflare construit et déploie le site. Tu obtiens une URL du type `https://digital-visual-studio.<ton-compte>.workers.dev`.

Ensuite, **chaque `git push` redéploie le site automatiquement**.

### Étape 2 — Définir le mot de passe admin (obligatoire)

Dans le dashboard : **Workers & Pages** → `digital-visual-studio` → **Settings** → **Variables and Secrets** → **Add** :
- Type : **Secret**
- Nom : `ADMIN_PASSWORD`
- Valeur : ton mot de passe (choisis-le long et unique !)

Puis clique **Deploy** pour appliquer. Sans ce secret, la connexion admin est refusée.

### Étape 3 — Acheter et brancher ton nom de domaine 💳

Cloudflare vend les domaines **à prix coûtant** (sans marge, ~10 $/an pour un `.com`) :

1. Dashboard Cloudflare → **Domain Registration** → **Register Domains**.
2. Cherche un nom, par ex. `digitalvisualstudio.com`, `dvs-studio.com`, `dvsbymlp.com`…
3. Paie avec ta carte : le domaine est automatiquement configuré sur ton compte.
4. Ensuite : **Workers & Pages** → `digital-visual-studio` → **Settings** → **Domains & Routes** → **Add** → **Custom domain** → entre ton domaine (et aussi `www.` si tu veux).
5. En quelques minutes, ton site est accessible sur ton domaine, avec HTTPS automatique.

> 💡 Alternative moins chère la 1ʳᵉ année : Namecheap/Porkbun, mais il faudra pointer les serveurs DNS vers Cloudflare. L'achat direct chez Cloudflare est le plus simple.

### Étape 4 — Retirer Netlify (optionnel)

Une fois le domaine actif sur Cloudflare, tu peux supprimer le site `dvs-by-mlp.netlify.app` depuis ton tableau de bord Netlify pour éviter le contenu dupliqué.

## 🔑 Utiliser l'espace admin

1. Va sur `https://ton-domaine/admin/` (lien discret « Espace admin » aussi en bas du site).
2. Entre ton mot de passe (`ADMIN_PASSWORD`). La session dure 7 jours.
3. Onglet **Réalisations** : choisis une image, un titre, une catégorie → **Publier**. Elle apparaît immédiatement dans le portfolio du site.
4. Onglet **Services** : ajoute ou modifie tes prestations. Pour l'icône, copie une classe gratuite depuis [fontawesome.com](https://fontawesome.com/search?ic=free) (ex : `fa-solid fa-camera`).

## 🛠 Développement local

```bash
npm install
echo 'ADMIN_PASSWORD=motdepasse-local' > .dev.vars
npm run dev          # http://localhost:8787
```

`wrangler dev` simule D1 et KV en local (données locales, pas celles de production).

## 📞 Contacts du site

Numéros et réseaux sociaux sont dans `public/index.html` (WhatsApp : `wa.me/237670789126`, tél : `+237 696 207 716`). Modifie-les directement dans ce fichier si besoin.
