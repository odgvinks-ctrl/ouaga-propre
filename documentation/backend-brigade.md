# Backend : brigade Laabal

La mairie (admin) ne fait que **signaler** à la brigade Laabal les lieux à sensibiliser ou à contrôler. La brigade gère elle-même ses agents, ses équipes et les sanctions : l'admin ne les affiche plus.

## Ce que l'admin utilise

`GET /api/v1/brigade/taches` → `{"data": [Tache], "count": n}`

`POST /api/v1/brigade/taches` avec :

```json
{
  "type": "sanction",
  "quartier": "Tanghin",
  "lieu": "Caniveau derrière le marché",
  "consignes": "Dépôt constaté chaque matin",
  "date_prevue": "2026-11-18T07:00:00Z",
  "signalement_id": "... ou null"
}
```

`agent_ids` n'est plus envoyé : il est maintenant facultatif (liste vide par défaut). C'est la brigade qui affecte ses agents ensuite.

`PATCH /api/v1/brigade/taches/{id}/statut` avec `{"statut": "annulee"}` : la mairie peut annuler un signalement encore « à faire ». La brigade passe elle-même la tâche à `en_cours` puis `terminee`.

Tache : `{id, type, quartier, lieu, consignes, date_prevue, signalement_id, statut, created_at, terminee_le, agent_ids}`

Types : `sensibilisation`, `sanction`. Statuts : `a_faire` (affiché « Signalée »), `en_cours`, `terminee` (« Traitée »), `annulee`.

## Changement fait dans le backend

- `models/brigade.py` : `TacheBrigadeCreate.agent_ids` passe de `Field(min_length=1)` à `Field(default_factory=list)`.
- `api/routes/brigade.py` : `validate_agents_for_task` renvoie une liste vide au lieu d'une erreur 400 quand aucun agent n'est donné. La vérification des rôles reste active quand des agents sont fournis.

Les routes agents et sanctions restent en place pour l'outil propre à la brigade, mais l'admin de la mairie ne les appelle plus.
