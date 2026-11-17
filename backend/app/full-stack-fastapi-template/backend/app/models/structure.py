import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel

from .common import get_datetime_utc


class StructureCollecteBase(SQLModel):
    nom: str = Field(max_length=150)
    responsable: str = Field(max_length=150)
    telephone: str = Field(max_length=30)
    adresse: str = Field(max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    zones_intervention: str = Field(max_length=2000)
    statut: str = Field(default="en_attente", max_length=30, index=True)
    formules: str = Field(default="[]", max_length=4000)
    type_structure: str = Field(default="GIE", max_length=30)


class StructureCollecteDossier(SQLModel):
    motif_refus: str | None = Field(default=None, max_length=500)
    numero_enregistrement: str | None = Field(default=None, max_length=120)
    numero_cnib: str | None = Field(default=None, max_length=60)
    ifu: str | None = Field(default=None, max_length=60)
    numero_autorisation: str | None = Field(default=None, max_length=120)
    pieces: str = Field(default="{}", max_length=2000)
    conditions_version: str | None = Field(default=None, max_length=20)
    conditions_commission: int | None = None
    conditions_acceptees_le: datetime | None = None


class StructureCollecteCreate(StructureCollecteBase):
    """Données fournies lors de l'inscription d'une structure."""
    pass


class StructureCollecteUpdate(SQLModel):
    nom: str | None = Field(default=None, max_length=150)
    responsable: str | None = Field(default=None, max_length=150)
    telephone: str | None = Field(default=None, max_length=30)
    adresse: str | None = Field(default=None, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    zones_intervention: str | None = Field(default=None, max_length=2000)
    statut: str | None = Field(default=None, max_length=30)
    formules: str | None = Field(default=None, max_length=4000)
    validated: bool | None = None


class StructureCollecte(StructureCollecteBase, StructureCollecteDossier, table=True):
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
    )

    owner_id: uuid.UUID = Field(
        foreign_key="user.id",
        unique=True,
        index=True,
    )

    validated: bool = Field(default=False, index=True)

    created_at: datetime = Field(
        default_factory=get_datetime_utc,
    )


class StructureCollectePublic(StructureCollecteBase):
    id: uuid.UUID
    validated: bool


class StructureCollecteAdmin(StructureCollectePublic, StructureCollecteDossier):
    owner_id: uuid.UUID
    compte_actif: bool = True
    created_at: datetime | None = None


class StructuresCollectePublic(SQLModel):
    data: list[StructureCollectePublic]
    count: int
