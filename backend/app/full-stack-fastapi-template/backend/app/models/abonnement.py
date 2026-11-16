import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel

from .common import get_datetime_utc


class AbonnementBase(SQLModel):
    statut: str = "EN_ATTENTE"


class AbonnementCreate(AbonnementBase):
    structure_id: uuid.UUID


class Abonnement(AbonnementBase, table=True):
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True
    )

    citoyen_id: uuid.UUID

    structure_id: uuid.UUID

    created_at: datetime = Field(
        default_factory=get_datetime_utc
    )