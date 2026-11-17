# Simulation multi-agents FASO NEERE

Moteur qui simule la gestion des déchets de Ouagadougou jour par jour et calcule le plan de collecte (points de regroupement et tournées des camions).

## Les agents

| Agent | Ce qu'il fait chaque jour |
| --- | --- |
| Ménage | Produit ses déchets. Abonné : les garde pour le pré-collecteur. Non abonné : une partie part dans un dépotoir sauvage. |
| Pré-collecteur (tricycle) | Passe chez les abonnés selon la fréquence, vide au point de regroupement le plus proche. |
| Camion benne | Suit sa tournée optimisée, vide les points et rentre au centre de traitement. |
| Brigade Laabal | Nettoie les dépotoirs signalés. |
| Mairie | Reçoit les signalements, vérifie, filtre les faux signalements (pièges). |

Un point de regroupement qui n'est pas vidé déborde : après quelques jours, les déchets partent en dépotoirs sauvages.

## Le plan de gestion

- `optimization/points.py` place les points de regroupement (k-means pondéré par le nombre de ménages).
- `optimization/tournees.py` répartit les points entre les camions en service (balayage par angle), ordonne chaque tournée (plus proche voisin puis 2-opt) et respecte la capacité des camions.
- Quand un camion tombe en panne, qu'il pleut ou qu'un nouveau quartier apparaît, le plan est recalculé.

## Modifier les paramètres

Tout est dans `parametres.yaml`, chaque valeur y est expliquée. On peut aussi les changer depuis l'admin (page Paramètres de simulation ou Plan de gestion).

## Lancer

Depuis l'API (administrateur connecté) :

- `GET /api/v1/simulation/parametres` : valeurs par défaut.
- `POST /api/v1/simulation/` avec les valeurs à changer, par exemple `{"camionsEnPanne": 1, "saisonPluies": true}`.

En ligne de commande, depuis `backend/` :

```
uv run python -m app.simulation.lancer --sortie resultat.json
uv run python -m app.simulation.lancer --parametres scenario.json --sortie resultat.json
```

## Ce que renvoie la simulation

- `resume` : taux de collecte, goulot, dépotoirs, délai d'intervention, coût mensuel et recommandations chiffrées.
- `jours` : les mesures de chaque jour (production, collecte, dépotoirs, remplissage des points, carte).
- `plan` : quartiers, points de regroupement, tournées, points non desservis.

La graine (`simulation.graine`) rend les résultats reproductibles.
