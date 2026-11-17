
import uuid
from datetime import datetime
from enum import StrEnum

from sqlmodel import Field, SQLModel

from .common import get_datetime_utc


class StatutSignalement(StrEnum):
    NOUVEAU = "NOUVEAU"
    EN_VERIFICATION = "EN_VERIFICATION"
    VALIDE = "VALIDE"
    TRANSMIS = "TRANSMIS"
    EN_COURS = "EN_COURS"
    RESOLU = "RESOLU"
    REJETE = "REJETE"


class SignalementBase(SQLModel):
    type_signalement: str = Field(max_length=100)
    description: str = Field(max_length=2000)
    photo_url: str | None = Field(default=None, max_length=2048)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    adresse: str | None = Field(default=None, max_length=255)
    quartier: str | None = Field(default=None, max_length=120)


class SignalementCreate(SignalementBase):
    photo_empreinte: str | None = Field(default=None, min_length=16, max_length=16)
    photo_floutee: bool = False


class SignalementUpdate(SQLModel):
    description: str | None = Field(default=None, max_length=2000)
    photo_url: str | None = Field(default=None, max_length=2048)
    photo_empreinte: str | None = Field(default=None, min_length=16, max_length=16)
    photo_floutee: bool | None = None
    adresse: str | None = Field(default=None, max_length=255)
    quartier: str | None = Field(default=None, max_length=120)


class Signalement(SignalementBase, table=True):
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
    )

    owner_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="user.id",
        ondelete="SET NULL",
        index=True,
    )

    structure_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="structurecollecte.id",
        ondelete="SET NULL",
        index=True,
    )

    statut: StatutSignalement = Field(
        default=StatutSignalement.NOUVEAU,
        index=True,
    )

    motif_rejet: str | None = Field(default=None, max_length=500)

    is_archived: bool = Field(default=False, index=True)
    archived_at: datetime | None = None

    archived_by: uuid.UUID | None = Field(
        default=None,
        foreign_key="user.id",
        ondelete="SET NULL",
    )

    tracking_token_hash: str | None = Field(
        default=None,
        unique=True,
        index=True,
    )

    created_at: datetime = Field(default_factory=get_datetime_utc)

    score_confiance: float | None = None
    categorie_detectee: str | None = None
    photo_empreinte: str | None = Field(default=None, max_length=16)
    photo_floutee: bool = Field(default=False)
    photo_apres_url: str | None = Field(default=None, max_length=2048)


class SignalementPublic(SignalementBase):
    id: uuid.UUID
    statut: StatutSignalement
    created_at: datetime
    structure_id: uuid.UUID | None = None
    motif_rejet: str | None = None
    photo_empreinte: str | None = Field(default=None, max_length=16)
    photo_floutee: bool = False
    photo_apres_url: str | None = Field(default=None, max_length=2048)


class SignalementAdmin(SignalementPublic):
    owner_id: uuid.UUID | None = None
    is_archived: bool
    archived_at: datetime | None = None
    archived_by: uuid.UUID | None = None


class SignalementsPublic(SQLModel):
    data: list[SignalementPublic]
    count: int
