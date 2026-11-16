import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel

from .common import get_datetime_utc


class Notification(SQLModel, table=True):
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True
    )

    user_id: uuid.UUID

    titre: str

    message: str

    lu: bool = False

    created_at: datetime = Field(
        default_factory=get_datetime_utc
    )