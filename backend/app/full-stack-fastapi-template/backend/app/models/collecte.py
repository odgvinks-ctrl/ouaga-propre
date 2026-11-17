import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel

from .common import get_datetime_utc


class CollecteBase(SQLModel):
    abonnement_id: uuid.UUID
    volume: str = Field(max_length=40)
    statut: str = Field(default="demandee", max_length=30)
    date_prevue: datetime | None = None
    description: str | None = Field(default=None, max_length=500)
    adresse: str | None = Field(default=None, max_length=255)
    latitude: float | None = None
    longitude: float | None = None


class CollecteCreate(CollecteBase):
    pass


class CollecteUpdate(SQLModel):
    statut: str | None = Field(default=None, max_length=30)
    date_prevue: datetime | None = None
    description: str | None = Field(default=None, max_length=500)
    adresse: str | None = Field(default=None, max_length=255)
    volume: str | None = Field(default=None, max_length=40)


class Collecte(CollecteBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    citoyen_id: uuid.UUID = Field(index=True, foreign_key="user.id")
    structure_id: uuid.UUID = Field(index=True, foreign_key="structurecollecte.id")
    date: datetime = Field(default_factory=get_datetime_utc)
    created_at: datetime = Field(default_factory=get_datetime_utc)


class CollectePublic(CollecteBase):
    id: uuid.UUID
    citoyen_id: uuid.UUID
    structure_id: uuid.UUID
    date: datetime
    created_at: datetime
    citoyen_nom: str | None = None
    citoyen_telephone: str | None = None
    quartier: str | None = None
    repere: str | None = None


class CollectesPublic(SQLModel):
    data: list[CollectePublic]
    count: int