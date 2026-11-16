# Ouaga Propre

Outil libre d'aide à la décision pour l'assainissement de Ouagadougou : signalement des dépotoirs, abonnements et collectes, tournées optimisées, simulation multi-agents.

## Structure

```
ouaga-propre/
├── backend_api/                # Serveur Python FastAPI
│   ├── app/
│   │   ├── routes/             # Endpoints REST (signalements, flotte, simu, abonnements, collectes)
│   │   ├── security/           # Détection des signalements piégés
│   │   └── models/             # Modèles SQLAlchemy / GeoAlchemy2
├── engine_simulation/          # Moteur IA & Recherche Opérationnelle
│   ├── osm_graph/              # Extraction carte Ouaga et pistes saison des pluies
│   ├── vrp_optimizer.py        # Calcul des tournées avec Google OR-Tools
│   └── multi_agent_model.py    # Simulation Mesa (4 types d'acteurs)
├── database/                   # Scripts SQL (PostgreSQL + PostGIS)
├── frontend/
│   ├── dashboard_web/          # Tableau de bord mairie (React + Vite)
│   └── app_mobile/             # Application Android unifiée (React + Vite + Capacitor)
└── docker-compose.yml
```

## Lancer le tableau de bord web

```
cd frontend/dashboard_web
npm install
npm run dev
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
