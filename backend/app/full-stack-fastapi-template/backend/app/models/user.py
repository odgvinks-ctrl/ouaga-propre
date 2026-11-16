import uuid
from enum import Enum
from datetime import datetime

from pydantic import EmailStr
from sqlmodel import Field, Relationship, SQLModel

from .common import get_datetime_utc


class UserRole(str, Enum):
    ADMIN = "ADMIN"
    CITOYEN = "CITOYEN"
    STRUCTURE = "STRUCTURE"


class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    full_name: str | None = Field(default=None, max_length=255)

    is_active: bool = True
    is_superuser: bool = False

    role: UserRole = Field(default=UserRole.CITOYEN)


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserRegister(SQLModel):
    email: EmailStr
    password: str
    full_name: str | None = None


class UserUpdateMe(SQLModel):
    email: EmailStr | None = None
    full_name: str | None = None
    password: str | None = None
    

class UserUpdate(SQLModel):
    email: EmailStr | None = Field(default=None, max_length=255)
    password: str | None = Field(default=None, min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)
    is_active: bool | None = None
    is_superuser: bool | None = None


class User(SQLModel, table=True):
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True
    )

    email: EmailStr = Field(unique=True, index=True)

    hashed_password: str

    full_name: str | None = None

    is_active: bool = True

    is_superuser: bool = False

    role: UserRole = Field(default=UserRole.CITOYEN)

    created_at: datetime = Field(
        default_factory=get_datetime_utc
    )


class UserPublic(UserBase):
    id: uuid.UUID


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int