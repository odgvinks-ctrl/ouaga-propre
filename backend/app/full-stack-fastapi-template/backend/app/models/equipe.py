import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel

from .common import get_datetime_utc


class Equipe(SQLModel, table=True):
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True
    )

    nom: str

    nombre_agents: int

    structure_id: uuid.UUID

    created_at: datetime = Field(
        default_factory=get_datetime_utc
    )