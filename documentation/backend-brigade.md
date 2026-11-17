# Backend : brigade Laabal

La page admin « Brigade Laabal » est prête. Tant que ces routes n'existent pas, elle garde ses données dans le navigateur (localStorage) : la démo marche, mais rien n'est partagé entre les postes. Dès que les routes répondent, l'admin les utilise automatiquement.

Toutes les routes sont réservées à l'administrateur (mairie).

## Agents

`GET /api/v1/brigade/agents` → `{"data": [Agent], "count": n}`

`POST /api/v1/brigade/agents` avec `{nom, telephone, role, quartier}` → `Agent`. Refuser un téléphone déjà utilisé (400).

`PATCH /api/v1/brigade/agents/{id}` avec `{role}` et/ou `{actif}` → `Agent`.

Agent : `{id, nom, telephone, role, quartier, actif}`

Rôles possibles : `sensibilisation`, `sanction` (contrôle et sanctions), `chef` (chef d'équipe, peut tout faire).

## Tâches

`GET /api/v1/brigade/taches` → `{"data": [Tache], "count": n}`

`POST /api/v1/brigade/taches` avec :

```json
{
  "type": "sanction",
  "quartier": "Tanghin",
  "lieu": "Caniveau derrière le marché",
  "consignes": "Repérer l'auteur du dépôt",
  "date_prevue": "2026-11-18T07:00:00Z",
  "agent_ids": ["..."],
  "signalement_id": "... ou null"
}
```

Règle à vérifier côté serveur : chaque agent doit être actif et avoir le rôle égal au `type` de la tâche, ou le rôle `chef`. Sinon 400.

`PATCH /api/v1/brigade/taches/{id}/statut` avec `{"statut": "en_cours" | "terminee" | "annulee"}` → `Tache`. Enregistrer `terminee_le` quand la tâche est terminée. 

Tache : `{id, type, quartier, lieu, consignes, date_prevue, agent_ids, signalement_id, statut, created_at, terminee_le}`

Types : `sensibilisation`, `sanction`. Statuts : `a_faire` (à la création), `en_cours`, `terminee`, `annulee`.

## Sanctions

`GET /api/v1/brigade/sanctions` → `{"data": [Sanction], "count": n}`

`POST /api/v1/brigade/sanctions` avec :

```json
{
  "type": "amende",
  "infraction": "depot_sauvage",
  "montant": 5000,
  "contrevenant": "Nom Prénom",
  "telephone": "76543210 ou vide",
  "quartier": "Gounghin",
  "lieu": "Devant le marché",
  "agent_id": "...",
  "signalement_id": "... ou null"
}
```

Règles : l'agent doit être actif avec le rôle `sanction` ou `chef` (sinon 400) ; `montant` vaut 0 pour un avertissement. Statut à la création : `a_payer` pour une amende, `avertie` pour un avertissement.

`PATCH /api/v1/brigade/sanctions/{id}/statut` avec `{"statut": "payee" | "contestee" | "annulee"}` → `Sanction`.

Sanction : `{id, type, infraction, montant, contrevenant, telephone, quartier, lieu, agent_id, signalement_id, statut, created_at}`

Infractions : `depot_sauvage`, `caniveau`, `brulage`, `recidive`. Types : `avertissement`, `amende`.

Données personnelles : ne stocker que le nom, le téléphone (facultatif) et le lieu. Ne jamais exposer les sanctions hors de l'admin.

## Tables

- `agent_brigade` : id, nom, telephone (unique), role, quartier, actif, created_at
- `tache_brigade` : id, type, quartier, lieu, consignes, date_prevue, statut, signalement_id (FK nullable), created_at, terminee_le
- `tache_brigade_agent` : tache_id, agent_id (table de liaison)
- `sanction_brigade` : id, type, infraction, montant, contrevenant, telephone, quartier, lieu, agent_id (FK), signalement_id (FK nullable), statut, created_at

Penser à la migration Alembic.
