# Digital Visual Studio — By_MLP

Site vitrine professionnel du studio **Digital Visual Studio** : design graphique, sites web et marketing digital.

Le site est **statique** et se déploie automatiquement sur **GitHub Pages** à chaque modification. Les services et les réalisations affichés sont lus depuis de simples fichiers JSON — pas besoin de toucher au code HTML pour mettre le site à jour.

## 📁 Structure du projet

```
├── .github/workflows/deploy-pages.yml → Déploiement automatique GitHub Pages
├── public/                → Le site (c'est ce dossier qui est publié)
│   ├── index.html         → Page d'accueil
│   ├── css/styles.css     → Styles du site
│   ├── js/main.js         → Logique (chargement des données, lightbox…)
│   ├── data/services.json → ✏️ Tes services (modifiable)
│   ├── data/projects.json → ✏️ Tes réalisations (modifiable)
│   ├── images/            → Logo, images du site
│   │   └── portfolio/     → 📸 Les images de tes réalisations
│   └── admin/             → Espace admin (utilisable seulement avec l'option Cloudflare, voir plus bas)
├── src/index.js           → (Option Cloudflare) API + authentification admin
├── migrations/            → (Option Cloudflare) schéma de base de données
└── wrangler.jsonc         → (Option Cloudflare) configuration
```

## 🚀 Déploiement sur GitHub Pages (une seule fois)

1. Sur GitHub, ouvre le dépôt → **Settings** → **Pages**.
2. Dans **Build and deployment** → **Source**, choisis **GitHub Actions**.
3. Fusionne la branche de travail dans `main` (ou pousse sur `main`).
4. Le workflow « Déployer sur GitHub Pages » se lance (onglet **Actions**) et publie le site sur :
   `https://<ton-pseudo>.github.io/Digital-Visual-Studio/`

> ⚠️ GitHub Pages gratuit nécessite un **dépôt public**. Vérifie dans Settings → General → Danger Zone que le dépôt est bien « Public ».

Ensuite, **chaque commit sur `main` republie le site automatiquement** (~1 minute).

## 📸 Ajouter une réalisation (portfolio)

Tout se fait depuis le site GitHub, même sur téléphone :

1. Va dans `public/images/portfolio/` → **Add file** → **Upload files** → dépose ton image (idéalement < 1 Mo : passe-la par [squoosh.app](https://squoosh.app) si elle est lourde) → **Commit changes**.
2. Ouvre `public/data/projects.json` → clique le crayon ✏️ (« Edit ») → ajoute un bloc **en haut de la liste** :

```json
{
  "title": "Logo boutique Belle Époque",
  "category": "Logo",
  "description": "Identité visuelle complète",
  "image_url": "images/portfolio/belle-epoque.png"
}
```

   (N'oublie pas la **virgule** entre deux blocs `{ … }`, et vérifie que `image_url` correspond exactement au nom du fichier uploadé.)
3. **Commit changes** : la réalisation apparaît sur le site en ~1 minute.

## 💼 Ajouter ou modifier un service

Même principe avec `public/data/services.json` :

```json
{
  "title": "Photographie",
  "description": "Shootings produits et portraits professionnels.",
  "icon": "fa-solid fa-camera"
}
```

Pour l'icône, choisis une icône **gratuite** sur [fontawesome.com](https://fontawesome.com/search?ic=free) et copie sa classe (ex. `fa-solid fa-camera`).

## 🌍 Nom de domaine personnalisé

1. **Achète ton domaine** chez un registrar : Cloudflare Registrar (prix coûtant, ~10 $/an pour un `.com`), Namecheap, Porkbun ou OVH. Exemples : `dvsbymlp.com`, `digitalvisualstudio.net`.
2. **Configure le DNS** chez ton registrar :
   - Pour `www` : un enregistrement **CNAME** → `<ton-pseudo>.github.io`
   - Pour le domaine racine (`tondomaine.com`) : 4 enregistrements **A** →
     `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
     (et si ton registrar gère l'IPv6, 4 **AAAA** : `2606:50c0:8000::153` à `2606:50c0:8003::153`)
3. Sur GitHub : **Settings** → **Pages** → **Custom domain** → entre ton domaine → **Save**, puis attends la vérification DNS et coche **Enforce HTTPS**.
4. C'est en ligne ! Le certificat HTTPS est généré automatiquement (parfois jusqu'à 24 h de délai DNS).

## ☁️ Option : espace admin avec Cloudflare Workers

Le dépôt contient aussi une version **Cloudflare Workers** complète (dossier `src/`, `wrangler.jsonc`) qui ajoute un **véritable espace admin** sur `/admin/` : connexion par mot de passe, upload d'images et gestion des services depuis le navigateur, sans toucher à GitHub. Les ressources (base D1 `dvs-database`, KV `dvs-media`) sont déjà créées sur le compte Cloudflare. Pour l'activer un jour : importer le dépôt dans Cloudflare Workers, définir le secret `ADMIN_PASSWORD`, déployer. Le site détecte automatiquement l'environnement et bascule sur la base de données.

## 🛠 Développement local

```bash
cd public && python3 -m http.server 8000   # http://localhost:8000
```

## 📞 Contacts du site

Numéros et réseaux sociaux sont dans `public/index.html` (WhatsApp : `wa.me/237670789126`, tél : `+237 696 207 716`).
