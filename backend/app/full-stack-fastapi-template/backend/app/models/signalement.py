import uuid
from enum import Enum
from datetime import datetime

from sqlmodel import Field, SQLModel

from .common import get_datetime_utc


class StatutSignalement(str, Enum):
    NOUVEAU = "NOUVEAU"
    EN_VERIFICATION = "EN_VERIFICATION"
    VALIDE = "VALIDE"
    TRANSMIS = "TRANSMIS"
    EN_COURS = "EN_COURS"
    RESOLU = "RESOLU"
    REJETE = "REJETE"


class SignalementBase(SQLModel):
    type_signalement: str

    description: str

    photo_url: str

    latitude: float

    longitude: float

    adresse: str | None = None

    quartier: str | None = None

    statut: StatutSignalement = StatutSignalement.NOUVEAU


class SignalementCreate(SignalementBase):
    pass


class SignalementUpdate(SQLModel):
    description: str | None = None

    statut: StatutSignalement | None = None


class Signalement(SignalementBase, table=True):
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True
    )

    owner_id: uuid.UUID

    created_at: datetime = Field(
        default_factory=get_datetime_utc
    )

    score_confiance: float | None = None

    categorie_detectee: str | None = None


class SignalementPublic(SignalementBase):
    id: uuid.UUID

    owner_id: uuid.UUID

    created_at: datetime


class SignalementsPublic(SQLModel):
    data: list[SignalementPublic]
    count: int