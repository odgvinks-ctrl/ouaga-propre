import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel

from .common import get_datetime_utc


class EquipeBase(SQLModel):
    nom: str = Field(max_length=120)
    role: str = Field(max_length=80)
    telephone: str = Field(max_length=20)
    vehicule_id: str | None = Field(default=None, max_length=50)


class EquipeCreate(EquipeBase):
    pass


class EquipeUpdate(SQLModel):
    nom: str | None = Field(default=None, max_length=120)
    role: str | None = Field(default=None, max_length=80)
    telephone: str | None = Field(default=None, max_length=20)
    vehicule_id: str | None = Field(default=None, max_length=50)


class Equipe(EquipeBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    structure_id: uuid.UUID = Field(index=True, foreign_key="structurecollecte.id")
    created_at: datetime = Field(default_factory=get_datetime_utc)


class EquipePublic(EquipeBase):
    id: uuid.UUID
    structure_id: uuid.UUID
    created_at: datetime


class EquipesPublic(SQLModel):
    data: list[EquipePublic]
    count: int