import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel

from .common import get_datetime_utc


class MessageBase(SQLModel):
    contenu: str = Field(max_length=1000)


class MessageCreate(MessageBase):
    destinataire_id: uuid.UUID


class Message(MessageBase, table=True):
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True
    )

    expediteur_id: uuid.UUID

    destinataire_id: uuid.UUID

    lu: bool = False

    created_at: datetime = Field(
        default_factory=get_datetime_utc
    )


class MessagePublic(MessageBase):
    id: uuid.UUID
    expediteur_id: uuid.UUID
    destinataire_id: uuid.UUID
    lu: bool


class MessagesPublic(SQLModel):
    data: list[MessagePublic]
    count: int