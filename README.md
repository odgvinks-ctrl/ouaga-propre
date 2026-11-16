# Ouaga Propre

Outil libre d'aide à la décision pour l'assainissement de Ouagadougou : signalement des dépotoirs et caniveaux bouchés, structures de pré-collecte, abonnements et collectes, tournées optimisées, simulation multi-agents.

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

```
cd admin-web
npm install
npm run dev
```

## Licence

MIT
