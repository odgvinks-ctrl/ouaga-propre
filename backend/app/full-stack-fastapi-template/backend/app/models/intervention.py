import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel

from .common import get_datetime_utc


class InterventionBase(SQLModel):
    commentaire: str | None = None

    statut: str = "PLANIFIEE"


class InterventionCreate(InterventionBase):
    signalement_id: uuid.UUID

    structure_id: uuid.UUID


class Intervention(InterventionBase, table=True):
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True
    )

    signalement_id: uuid.UUID

    structure_id: uuid.UUID

    created_at: datetime = Field(
        default_factory=get_datetime_utc
    )


class InterventionPublic(InterventionBase):
    id: uuid.UUID
    signalement_id: uuid.UUID
    structure_id: uuid.UUID
    created_at: datetime


class InterventionsPublic(SQLModel):
    data: list[InterventionPublic]
    count: int