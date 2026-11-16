# Ouaga Clean 360

Outil libre d'aide à la décision pour l'assainissement de Ouagadougou : signalement des dépotoirs et caniveaux bouchés, structures de pré-collecte, abonnements et collectes, tournées optimisées, simulation multi-agents.

## Structure

```
OUAGA-CLEAN-360/
│
├── frontend/
│   ├── app_mobile/          # Application Android unifiée : citoyens et structures de pré-collecte
│   └── dashboard_web/       # Tableau de bord de l'administration
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── security/
│   │   ├── optimization/
│   │   ├── simulation/
│   │   └── database/
│   ├── tests/
│   └── requirements.txt
│
├── data/
│   ├── osm/
│   ├── reports/
│   └── reference/
│
├── simulation/
├── documentation/
├── scripts/
├── docker-compose.yml
├── LICENSE
└── README.md
```

## Lancer l'application mobile

```
cd frontend/app_mobile
npm install
npm run dev
```

Générer l'APK Android :

```
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

## Lancer le tableau de bord web

```
cd frontend/dashboard_web
npm install
npm run dev
```

## Licence

MIT
