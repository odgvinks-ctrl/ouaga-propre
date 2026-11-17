import uuid
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.core.config import settings

router = APIRouter(prefix="/photos", tags=["photos"])

ALLOWED_TYPES = {
    "image/jpeg": (".jpg", b"\xff\xd8\xff"),
    "image/png": (".png", b"\x89PNG\r\n\x1a\n"),
    "image/webp": (".webp", b"RIFF"),
}


async def read_validated_image(fichier: UploadFile) -> tuple[bytes, str]:
    content_type = (fichier.content_type or "").lower()
    image_type = ALLOWED_TYPES.get(content_type)
    if not image_type:
        raise HTTPException(
            status_code=415,
            detail="Envoyez une photo JPEG, PNG ou WebP.",
        )

    content = await fichier.read(settings.PHOTO_MAX_SIZE_BYTES + 1)
    if len(content) > settings.PHOTO_MAX_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="La photo dépasse 3 Mo.")
    if not content.startswith(image_type[1]):
        raise HTTPException(status_code=415, detail="Le contenu ne correspond pas au format annoncé.")
    if content_type == "image/webp" and content[8:12] != b"WEBP":
        raise HTTPException(status_code=415, detail="Le contenu WebP est invalide.")
    return content, image_type[0]


@router.post("/")
async def envoyer_photo(fichier: Annotated[UploadFile, File(...)]) -> dict[str, str]:
    content, extension = await read_validated_image(fichier)
    settings.PHOTO_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4().hex}{extension}"
    (settings.PHOTO_STORAGE_DIR / name).write_bytes(content)
    return {"url": f"{settings.API_V1_STR}/photos/{name}"}


@router.get("/{nom}")
def lire_photo(nom: str) -> FileResponse:
    if Path(nom).name != nom or nom in {".", ".."}:
        raise HTTPException(status_code=404, detail="Photo introuvable.")
    path = settings.PHOTO_STORAGE_DIR / nom
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Photo introuvable.")
    return FileResponse(path)
