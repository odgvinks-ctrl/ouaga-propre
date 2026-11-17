# FASO NEERE

Outil libre d'aide à la décision pour l'assainissement de Ouagadougou : signalement des dépotoirs et caniveaux bouchés, structures de pré-collecte, abonnements et collectes, tournées optimisées, simulation multi-agents.

## Démarrage en une commande

Prérequis : Docker (Docker Desktop sous Windows ou macOS).

```
docker compose up --build
```

Puis ouvrir :

- application citoyen et structures : http://localhost:8080
- administration (mairie) : http://localhost:8080/admin, compte `admin@fasoneere.bf` / `admin12345`
- documentation de l'API : http://localhost:8080/docs

Comptes de démonstration (mot de passe `demo12345`) : citoyens `70000001`, `70000002`, `70000003` ; structures `70000101`, `70000102`.

La base SQLite et les photos sont gardées dans le volume Docker `donnees`. Pour repartir de zéro : `docker compose down -v`. Pour changer le port : `PORT=9000 docker compose up --build`.

Sous Windows, sans Docker, `lancer.bat` démarre aussi tout le projet et fabrique l'APK Android.

## Structure

```
ouaga-propre/
│
├── mobile/                     # Une seule application Android (React + Vite + Capacitor)
│   ├── citizen-app/lib/        # Citoyens + éléments communs (connexion, inscription, services)
│   │   ├── screens/
│   │   ├── widgets/
│   │   ├── services/
│   │   ├── models/
│   │   ├── providers/
│   │   └── maps/
│   └── collector-app/lib/      # Structures de pré-collecte et agents terrain
│       ├── screens/
│       ├── widgets/
│       ├── services/
│       ├── models/
│       ├── providers/
│       └── maps/
│
├── admin-web/                  # Tableau de bord de l'administration (React + Vite)
│   └── src/
│       ├── pages/
│       ├── components/
│       ├── services/
│       ├── hooks/
│       └── maps/
│
├── backend/
│   └── app/
│       ├── api/
│       ├── models/
│       ├── schemas/
│       ├── services/
│       ├── optimization/
│       ├── simulation/
│       ├── security/
│       └── database/
│
├── data/
├── simulation/
├── documentation/
└── docker/
```

Dans `mobile/`, les écrans des structures importent le code commun avec l'alias `@citoyen` (défini dans `vite.config.js`).

## Lancer l'application mobile

```
cd mobile
npm install
npm run dev
```

Comptes de démonstration (mot de passe demo1234) : citoyen 70112233, structure 70223344, structure en attente 78990011.

Générer l'APK Android :

```
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

## Lancer le tableau de bord admin

Ouvrir deux terminaux.

Terminal 1 :

```
cd admin-web
npm install
npm run dev
```

Terminal 2 :

```
cd mobile
npm run dev
```

Puis ouvrir `http://localhost:5174` pour l'application mobile et `http://localhost:5174/admin` pour l'administration. Les deux passent par la même adresse : en mode démonstration (sans backend), ils partagent donc les mêmes données. Un signalement envoyé depuis le mobile apparaît tout de suite chez l'administrateur.

Compte administrateur de démonstration : 70000000, mot de passe admin1234.

Dans `admin-web/`, les alias `@donnees` et `@modeles` pointent vers les services et modèles du mobile, pour lire la même base locale. Quand le backend sera prêt, seuls les fichiers de `services/` changeront pour appeler l'API avec `requete()`.

## Licence

MIT
