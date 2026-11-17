# Backend : brigade Laabal

La mairie (`role=ADMIN`) peut créer et transmettre les interventions. Les responsables habilités de la brigade utilisent un compte `role=BRIGADE` pour consulter les tâches, affecter les agents, gérer leur progression, leurs agents et les sanctions. Le contrôle d'accès dépend du rôle explicite, pas du statut superutilisateur.

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
  "signalement_id": "... ou null",
  "latitude": 12.3634,
  "longitude": -1.5261
}
```

`latitude` et `longitude` donnent la position exacte du lieu, pour que la brigade s'y rende vite. L'admin les remplit avec la position du signalement citoyen, ou avec le point choisi sur la carte. Si elles manquent et qu'un `signalement_id` est donné, le serveur reprend la position du signalement.

`agent_ids` n'est plus envoyé : il est maintenant facultatif (liste vide par défaut). C'est la brigade qui affecte ses agents ensuite.

`PATCH /api/v1/brigade/taches/{id}/statut` avec `{"statut": "annulee"}` : la mairie peut annuler une intervention avant sa prise en charge. La brigade gère les transitions vers `en_cours`, `terminee` ou `annulee`. Les transitions de tâches terminées ou annulées sont définitives.

Tache : `{id, type, quartier, lieu, consignes, date_prevue, signalement_id, latitude, longitude, statut, created_at, terminee_le, agent_ids}`

Types : `sensibilisation`, `sanction`. Statuts : `a_faire` (affiché « Signalée »), `en_cours`, `terminee` (« Traitée »), `annulee`.

## Permissions, GPS et historique

- `/agents` et `/sanctions` sont réservés au rôle `BRIGADE`; création des tâches au rôle `ADMIN`; consultation et historique aux deux rôles.
- `PUT /api/v1/brigade/taches/{id}/agents` permet à la brigade de remplacer les agents affectés.
- `PATCH /api/v1/brigade/taches/{id}/position` corrige la position pour un responsable de brigade et exige un motif.
- `GET /api/v1/brigade/taches/{id}/historique` donne les événements, les anciens/nouveaux statuts et positions, les auteurs et dates. Les tâches anciennes sont reprises avec l'auteur historique indiqué comme non enregistré.
- Latitude et longitude sont facultatives ensemble, jamais séparément. Si aucun point manuel n'est fourni pour un signalement lié, l'API reprend ses coordonnées et répond 404 si le signalement n'existe pas.
- Pour éviter d'inventer une limite, configurer `BRIGADE_GEO_BOUNDS` avec les limites officielles `[longitude_min, latitude_min, longitude_max, latitude_max]`. Si cette configuration manque, l'API refuse une tâche qui porte des coordonnées GPS (503); les tâches sans position restent possibles. Cette enveloppe doit provenir d'une source géographique vérifiée.
- La migration `e91ab2c3d4f5_brigade_permissions_and_history.py` ajoute le rôle, l'auteur de création, les contraintes de coordonnées et l'historique sans supprimer les tâches existantes.

## WhatsApp

Configurer `BRIGADE_WHATSAPP_NUMBER` avec le numéro officiel, au format international sans `+` ni séparateurs. Il n'y a pas de valeur par défaut. `GET /api/v1/brigade/configuration` indique le numéro configuré; `GET /api/v1/brigade/taches/{id}/partage` retourne les liens WhatsApp et Google Maps, le message préparé et `message_sent: false`. L'API ne prétend pas envoyer le message : l'utilisateur doit ouvrir WhatsApp et confirmer l'envoi.

Le frontend actuel compose encore son propre lien `wa.me/?text=`; conformément au périmètre retenu, ce backend ne peut pas lui faire ouvrir un numéro configuré sans modification cliente. Pour bénéficier du numéro officiel côté interface, le client devra consommer les liens de `/partage`.
