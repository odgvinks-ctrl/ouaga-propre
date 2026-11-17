import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel

from .common import get_datetime_utc


class VehiculeBase(SQLModel):
    nom: str = Field(max_length=120)
    type_vehicule: str = Field(max_length=80)
    immatriculation: str | None = Field(default=None, max_length=50)
    capacite: str = Field(max_length=50)
    statut: str = Field(default="disponible", max_length=30)


class VehiculeCreate(VehiculeBase):
    pass


class VehiculeUpdate(SQLModel):
    nom: str | None = Field(default=None, max_length=120)
    type_vehicule: str | None = Field(default=None, max_length=80)
    immatriculation: str | None = Field(default=None, max_length=50)
    capacite: str | None = Field(default=None, max_length=50)
    statut: str | None = Field(default=None, max_length=30)


class Vehicule(VehiculeBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    structure_id: uuid.UUID = Field(index=True, foreign_key="structurecollecte.id")
    created_at: datetime = Field(default_factory=get_datetime_utc)


class VehiculePublic(VehiculeBase):
    id: uuid.UUID
    structure_id: uuid.UUID
    created_at: datetime


class VehiculesPublic(SQLModel):
    data: list[VehiculePublic]
    count: int
