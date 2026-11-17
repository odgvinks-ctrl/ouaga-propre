# Ouaga Propre / FASO NEERE

FASO NEERE est une plateforme d'aide à la décision pour la gestion des déchets à Ouagadougou.
Elle relie les citoyens, les structures de pré-collecte, l'administration municipale et la
brigade Laabal autour du signalement des dépotoirs, du suivi des collectes et de la planification.

## Fonctionnalités

- Citoyens : inscription, signalement géolocalisé, suivi, récompenses et messagerie.
- Structures : validation, abonnements, collectes, équipes, véhicules et tournées.
- Administration : tableau de bord, carte, validation des structures, utilisateurs, rapports et USSD.
- Pré-collecte : demande d'abonnement, demandes de collecte et suivi des interventions.
- Brigade Laabal : agents, missions de sensibilisation ou de sanction et sanctions.
- Simulation multi-agents : ménages, pré-collecteurs, camions, brigade, mairie, points de regroupement et tournées.
- Mode hors ligne mobile : stockage IndexedDB/Dexie et synchronisation différée des actions.

## Architecture

```text
ouaga-propre/
├── mobile/                 Application Vite/React et Android Capacitor
│   ├── citizen-app/lib/    Parcours citoyens et code partagé
│   └── collector-app/lib/  Parcours structures et équipes terrain
├── admin-web/              Tableau de bord React/Vite
├── backend/
│   └── app/full-stack-fastapi-template/backend/
│       └── app/            API FastAPI, modèles SQLModel, simulation et optimisation
├── data/
│   ├── reference/          Jeu de données synthétique
│   ├── osm/                Métadonnées OSM
│   └── reports/            Rapports reproductibles synthétiques
├── simulation/             Documentation du moteur de simulation
└── documentation/          Notes techniques
```

## Technologies

- React 19, React Router 7 et Vite 8.
- Capacitor 7 pour Android.
- Leaflet pour les cartes.
- Dexie/IndexedDB pour le stockage hors ligne.
- FastAPI, SQLModel, Pydantic et JWT pour le backend.
- SQLite en développement local ; PostgreSQL pris en charge par la configuration.
- Alembic pour les migrations SQL.

## Prérequis

- Windows PowerShell.
- Node.js avec npm.
- Python 3.14 ou environnement `uv` compatible.
- Java 21 uniquement pour générer l'APK Android.
- Optionnel : `cloudflared` pour exposer l'API lors d'une démonstration.

## Lancement rapide sous Windows

Depuis la racine du projet :

```powershell
.\lancer.bat
```

Le lanceur peut accepter les options suivantes :

```powershell
powershell -ExecutionPolicy Bypass -File .\lancer.ps1 -SansTunnel
powershell -ExecutionPolicy Bypass -File .\lancer.ps1 -SansApk
powershell -ExecutionPolicy Bypass -File .\lancer.ps1 -Reinitialiser
```

- `-SansTunnel` démarre les services sans créer de tunnel Cloudflare.
- `-SansApk` évite la compilation Android.
- `-Reinitialiser` supprime la base SQLite locale de démonstration.

Le lanceur ouvre normalement :

- Application mobile : `http://localhost:5174`
- Administration : `http://localhost:5174/admin`
- API : `http://127.0.0.1:8000`
- Documentation : `http://127.0.0.1:8000/docs`

Les interfaces utilisent le backend lorsqu'une URL `VITE_API_URL` est définie.

## Lancement manuel

### Backend

```powershell
cd backend\app\full-stack-fastapi-template\backend
uv sync
uv run python app\initial_data.py
uv run python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Appliquer les migrations PostgreSQL ou lors d'une base existante :

```powershell
uv run alembic upgrade head
```

### Application mobile

```powershell
cd mobile
npm install
npm run dev
```

### Administration

```powershell
cd admin-web
npm install
npm run dev
```

## Comptes de démonstration

Les identifiants exacts sont initialisés par `lancer.ps1` et le jeu de données :

- Administrateur : `admin@fasoneere.bf`
- Mot de passe administrateur : `admin12345`

Les autres comptes synthétiques sont décrits dans
[`data/reference/jeu_demo_faso_neere.json`](data/reference/jeu_demo_faso_neere.json).
Ces valeurs sont uniquement destinées à la démonstration locale.

## API Brigade Laabal

Toutes les routes sont réservées aux administrateurs.

```text
GET    /api/v1/brigade/agents
POST   /api/v1/brigade/agents
PATCH  /api/v1/brigade/agents/{id}

GET    /api/v1/brigade/taches
POST   /api/v1/brigade/taches
PATCH  /api/v1/brigade/taches/{id}/statut

GET    /api/v1/brigade/sanctions
POST   /api/v1/brigade/sanctions
PATCH  /api/v1/brigade/sanctions/{id}/statut
```

Les agents disposent des rôles `sensibilisation`, `sanction` et `chef`.
Le backend vérifie l'activité des agents, leur rôle et les montants des sanctions.
Les données personnelles de cette fonctionnalité doivent rester réservées à l'administration.

## Build Android

```powershell
cd mobile
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

Depuis Android Studio, générer le paquet APK. Le script `lancer.ps1` peut produire
automatiquement `FASO-NEERE.apk` lorsqu'une JDK 21 est disponible.

## Tests

Frontend :

```powershell
cd admin-web
npm run build

cd ..\mobile
npm run build
```

Backend :

```powershell
cd backend\app\full-stack-fastapi-template\backend
uv run pytest -q
```

Les données de démonstration sont synthétiques. Elles ne représentent pas des personnes,
des adresses, des infractions ou des statistiques de terrain réelles.

## Documentation

- [Simulation multi-agents](simulation/README.md)
- [Moteur de simulation backend](backend/app/full-stack-fastapi-template/backend/app/simulation/README.md)
- [Données de référence](data/reference/README.md)
- [Rapports synthétiques](data/reports/README.md)
- [Données OSM](data/osm/README.md)

## Licence

[MIT](LICENSE)
