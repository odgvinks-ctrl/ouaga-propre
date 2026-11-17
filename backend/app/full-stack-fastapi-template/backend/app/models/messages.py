import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel

from .common import get_datetime_utc


class MessageBase(SQLModel):
    conversation_id: str = Field(max_length=200)
    texte: str = Field(max_length=1000)
    expediteur_id: uuid.UUID
    destinataire_id: uuid.UUID


class MessageCreate(SQLModel):
    conversation_id: str = Field(max_length=200)
    texte: str = Field(max_length=1000)


class Message(MessageBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    lu: bool = False
    date: datetime = Field(default_factory=get_datetime_utc)
    created_at: datetime = Field(default_factory=get_datetime_utc)


class MessagePublic(MessageBase):
    id: uuid.UUID
    lu: bool
    date: datetime
    created_at: datetime


class MessagesPublic(SQLModel):
    data: list[MessagePublic]
    count: int
