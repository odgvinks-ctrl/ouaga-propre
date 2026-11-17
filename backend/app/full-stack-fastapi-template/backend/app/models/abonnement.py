import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel

from .common import get_datetime_utc


class AbonnementBase(SQLModel):
    structure_id: uuid.UUID
    formule_id: str = Field(max_length=120)
    quartier: str = Field(max_length=120)
    repere: str = Field(max_length=255)
    paiement: str = Field(max_length=80)
    statut: str = Field(default="en_attente", max_length=30)
    motif_refus: str | None = Field(default=None, max_length=500)


class AbonnementCreate(AbonnementBase):
    pass


class AbonnementUpdate(SQLModel):
    statut: str | None = Field(default=None, max_length=30)
    motif_refus: str | None = Field(default=None, max_length=500)


class Abonnement(AbonnementBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    citoyen_id: uuid.UUID = Field(index=True, foreign_key="user.id")
    structure_id: uuid.UUID = Field(index=True, foreign_key="structurecollecte.id")
    created_at: datetime = Field(default_factory=get_datetime_utc)


class AbonnementPublic(AbonnementBase):
    id: uuid.UUID
    citoyen_id: uuid.UUID
    created_at: datetime


class AbonnementsPublic(SQLModel):
    data: list[AbonnementPublic]
    count: int