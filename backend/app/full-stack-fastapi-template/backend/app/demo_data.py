import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path

from sqlmodel import Session, select

from app import crud
from app.core.config import settings
from app.models import (
    Signalement,
    StatutSignalement,
    StructureCollecte,
    User,
    UserCreate,
    UserRole,
)

logger = logging.getLogger(__name__)

def _fichier_demo() -> Path:
    if os.environ.get("DEMO_DATA_FILE"):
        return Path(os.environ["DEMO_DATA_FILE"])
    dossiers = Path(__file__).resolve().parents
    racine = dossiers[5] if len(dossiers) > 5 else Path.cwd()
    return racine / "data" / "reference" / "jeu_demo_faso_neere.json"


DEMO_FILE = _fichier_demo()


def load_demo_data(session: Session) -> None:
    if not settings.LOAD_DEMO_DATA or not DEMO_FILE.exists():
        return
    if session.exec(select(User).where(User.role == UserRole.CITOYEN)).first():
        return

    data = json.loads(DEMO_FILE.read_text(encoding="utf-8"))
    users: dict[str, User] = {}
    for item in data["utilisateurs"]:
        user = crud.create_user(
            session=session,
            user_create=UserCreate(
                telephone=item["telephone"],
                full_name=item["nom"],
                password=settings.DEMO_PASSWORD,
                role=UserRole(item["role"]),
                is_active=item.get("actif", True),
            ),
        )
        users[item["ref"]] = user

    structures: dict[str, StructureCollecte] = {}
    for numero, item in enumerate(data["structures"], start=1):
        structure = StructureCollecte(
            owner_id=users[item["ref"]].id,
            nom=item["nom"],
            responsable=item["responsable"],
            telephone=item["telephone"],
            adresse=item["adresse"],
            description=item.get("description"),
            zones_intervention=", ".join(item["zones_intervention"]),
            statut=item["statut"],
            validated=item["validated"],
            formules=json.dumps(
                [
                    {
                        "id": f"{item['ref']}-{index}",
                        "nom": formule["nom"],
                        "prix": formule["prix_xof"],
                        "frequence": formule["frequence"],
                    }
                    for index, formule in enumerate(item.get("formules", []))
                ],
                ensure_ascii=False,
            ),
            type_structure="Association" if "Association" in item["nom"] else "GIE",
            numero_enregistrement=f"GIE-OUA-2026-{numero:04d}",
            numero_cnib=f"B1000000{numero}",
            numero_autorisation=f"CO/SG/DPAS-2026-{numero:04d}",
            pieces=json.dumps(
                {
                    "identite": f"cnib-responsable-{numero}.jpg",
                    "legal": f"attestation-{numero}.pdf",
                    "autorisation": f"autorisation-mairie-{numero}.pdf",
                }
            ),
            conditions_version="2026-11",
            conditions_commission=10,
            conditions_acceptees_le=datetime.now(timezone.utc),
        )
        session.add(structure)
        structures[item["ref"]] = structure
    session.commit()

    for item in data["signalements"]:
        author = users.get(item.get("auteur_ref") or "")
        structure = structures.get(item.get("structure_ref") or "")
        session.add(
            Signalement(
                owner_id=author.id if author else None,
                structure_id=structure.id if structure else None,
                type_signalement=item["type_signalement"],
                description=item["description"],
                photo_url=item.get("photo_url"),
                latitude=item["latitude"],
                longitude=item["longitude"],
                adresse=item.get("adresse"),
                quartier=item.get("quartier"),
                statut=StatutSignalement(item["statut"]),
                is_archived=item.get("is_archived", False),
                created_at=datetime.fromisoformat(item["created_at"].replace("Z", "+00:00")),
            )
        )
    session.commit()
    logger.info("Jeu de démonstration chargé : %s comptes", len(users))
