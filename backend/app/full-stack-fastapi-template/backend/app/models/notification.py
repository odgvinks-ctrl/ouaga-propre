import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel

from .common import get_datetime_utc


class NotificationBase(SQLModel):
    titre: str = Field(max_length=120)
    message: str = Field(max_length=500)
    lu: bool = False


class NotificationCreate(NotificationBase):
    user_id: uuid.UUID


class Notification(NotificationBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(index=True, foreign_key="user.id")
    created_at: datetime = Field(default_factory=get_datetime_utc)


class NotificationPublic(NotificationBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime


class NotificationsPublic(SQLModel):
    data: list[NotificationPublic]
    count: int
