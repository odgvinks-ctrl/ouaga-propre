# Backend : photos des signalements

Ce que le front attend déjà. L'app mobile et l'admin fonctionnent sans ces changements, mais tant qu'ils ne sont pas faits, les photos ne sont pas enregistrées sur le serveur.

## 1. Envoi d'une photo

`POST /api/v1/photos/`

- Corps : `multipart/form-data`, champ `fichier` (JPEG, environ 150 à 300 Ko, déjà compressé et flouté par l'app).
- Pas besoin d'être connecté : les invités signalent aussi.
- Refuser au-delà de 3 Mo (413) et les types autres que JPEG, PNG, WebP (415).
- Réponse : `{"url": "/api/v1/photos/<nom>.jpg"}` (URL relative ou absolue).

`GET /api/v1/photos/{nom}` : renvoie le fichier. L'admin l'affiche dans une balise `<img>`, donc sans jeton.

Si cette route renvoie 404, l'app envoie quand même le signalement, sans photo.

## 2. Deux champs en plus sur Signalement

| Champ | Type | Rôle |
| --- | --- | --- |
| `photo_empreinte` | `str`, 16 caractères, optionnel | Empreinte visuelle (dHash 64 bits en hexadécimal) calculée par l'app. L'admin compare les empreintes pour repérer une même photo réutilisée (piège). |
| `photo_floutee` | `bool`, défaut `false` | L'auteur a flouté des visages ou des plaques. |

- À ajouter dans `SignalementBase` (donc dans la création et les réponses, y compris `/signalements/admin`).
- Une migration Alembic : deux colonnes, `photo_empreinte VARCHAR(16) NULL`, `photo_floutee BOOLEAN NOT NULL DEFAULT false`.
- `photo_url` reste comme aujourd'hui : l'app y met l'URL renvoyée par `POST /photos/`.

## 3. Photo de preuve à la fin d'un nettoyage ou d'une collecte

La structure ne peut plus clôturer sans photo. L'app envoie d'abord la photo à `POST /api/v1/photos/`, puis :

| Route existante | Ce que l'app ajoute dans le corps JSON | À faire côté back |
| --- | --- | --- |
| `PATCH /signalements/{id}/structure-statut` avec `statut: "nettoye"` | `photo_apres_url` | Colonne `photo_apres_url VARCHAR(2048) NULL` sur Signalement, l'enregistrer et la renvoyer (aussi dans `/signalements/admin` et `/signalements/me`). Refuser `nettoye` sans `photo_apres_url` (400). |
| `PATCH /collectes/{id}/terminer` | `{"photo_preuve_url": "..."}` | Lire ce corps (aujourd'hui la route n'en prend pas), colonne `photo_preuve_url VARCHAR(2048) NULL` sur Collecte, la renvoyer dans les listes. Refuser sans photo (400). |

Le citoyen voit la photo « après » dans le suivi de son signalement et dans ses collectes ; l'admin la voit dans la fiche du signalement.

## 4. Code de référence (testé avec le front)

```python
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

router = APIRouter(prefix="/photos", tags=["photos"])

DOSSIER = Path("photos")
TAILLE_MAX = 3 * 1024 * 1024
TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}


@router.post("/")
async def envoyer_photo(fichier: UploadFile = File(...)) -> dict[str, str]:
    extension = TYPES.get(fichier.content_type or "")
    if not extension:
        raise HTTPException(status_code=415, detail="Envoyez une photo JPEG, PNG ou WebP.")
    contenu = await fichier.read()
    if len(contenu) > TAILLE_MAX:
        raise HTTPException(status_code=413, detail="La photo dépasse 3 Mo.")
    DOSSIER.mkdir(exist_ok=True)
    nom = f"{uuid.uuid4().hex}{extension}"
    (DOSSIER / nom).write_bytes(contenu)
    return {"url": f"/api/v1/photos/{nom}"}


@router.get("/{nom}")
def lire_photo(nom: str) -> FileResponse:
    chemin = DOSSIER / Path(nom).name
    if not chemin.is_file():
        raise HTTPException(status_code=404, detail="Photo introuvable.")
    return FileResponse(chemin)
```

Puis `api_router.include_router(photos.router)` dans `api/main.py`, et ajouter `photos/` au `.gitignore` du backend.

## 5. Ce que le front fait déjà

- Compression (1280 px maximum), floutage des visages et des plaques (automatique si le téléphone le permet, sinon au doigt).
- Hors connexion : le signalement et sa photo restent sur le téléphone, puis l'app les envoie (photo d'abord, puis signalement) dès que le réseau revient.
- Structure : photo obligatoire pour « Lieu nettoyé », « Poubelle vidée » et « Collecte faite » (tournée).
- Admin : affichage de la photo, alerte « possible piège » si la même empreinte existe déjà, export GeoJSON (licence ODbL).
