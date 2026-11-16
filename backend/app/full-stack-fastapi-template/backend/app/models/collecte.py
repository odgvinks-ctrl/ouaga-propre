import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel

from .common import get_datetime_utc


class CollecteBase(SQLModel):
    adresse: str

    latitude: float

    longitude: float

    description: str

    statut: str = "EN_ATTENTE"


class CollecteCreate(CollecteBase):
    structure_id: uuid.UUID


class Collecte(CollecteBase, table=True):
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True
    )

    citoyen_id: uuid.UUID

    structure_id: uuid.UUID

    created_at: datetime = Field(
        default_factory=get_datetime_utc
    )