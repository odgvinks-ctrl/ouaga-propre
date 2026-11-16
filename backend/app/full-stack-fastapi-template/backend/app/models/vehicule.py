import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel

from .common import get_datetime_utc


class Vehicule(SQLModel, table=True):
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True
    )

    immatriculation: str

    type_vehicule: str

    capacite_kg: float

    actif: bool = True

    structure_id: uuid.UUID

    created_at: datetime = Field(
        default_factory=get_datetime_utc
    )