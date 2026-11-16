import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel

from .common import get_datetime_utc


class StructureCollecteBase(SQLModel):
    nom: str
    responsable: str

    telephone: str

    adresse: str

    description: str | None = None

    zones_intervention: str

    validated: bool = False


class StructureCollecteCreate(StructureCollecteBase):
    pass


class StructureCollecteUpdate(SQLModel):
    nom: str | None = None
    responsable: str | None = None
    telephone: str | None = None
    adresse: str | None = None


class StructureCollecte(StructureCollecteBase, table=True):
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True
    )

    owner_id: uuid.UUID

    created_at: datetime = Field(
        default_factory=get_datetime_utc
    )


class StructureCollectePublic(StructureCollecteBase):
    id: uuid.UUID


class StructuresCollectePublic(SQLModel):
    data: list[StructureCollectePublic]
    count: int