import uuid
from datetime import datetime
from enum import StrEnum
from typing import Self

from pydantic import EmailStr, model_validator
from sqlmodel import Field, SQLModel

from .common import get_datetime_utc


def normalize_phone(phone: str | None) -> str | None:
    if phone is None:
        return None
    digits = "".join(ch for ch in str(phone) if ch.isdigit())
    if not digits:
        return None
    return digits[-8:]


class UserRole(StrEnum):
    ADMIN = "ADMIN"
    BRIGADE = "BRIGADE"
    CITOYEN = "CITOYEN"
    STRUCTURE = "STRUCTURE"


class UserBase(SQLModel):
    email: EmailStr | None = Field(default=None, unique=True, index=True, max_length=255)
    telephone: str | None = Field(default=None, unique=True, index=True, max_length=20)
    full_name: str | None = Field(default=None, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    role: UserRole = Field(default=UserRole.CITOYEN)


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)

    @model_validator(mode="after")
    def validate_identifier(self) -> Self:
        if not self.email and not self.telephone:
            raise ValueError("Un compte doit avoir un e-mail ou un numéro de téléphone.")
        return self


class UserRegister(SQLModel):
    email: EmailStr | None = Field(default=None, max_length=255)
    telephone: str | None = Field(default=None, max_length=20)
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)

    @model_validator(mode="after")
    def validate_identifier(self) -> Self:
        if not self.email and not self.telephone:
            raise ValueError("Un compte doit avoir un e-mail ou un numéro de téléphone.")
        return self


class UserUpdateMe(SQLModel):
    email: EmailStr | None = Field(default=None, max_length=255)
    telephone: str | None = Field(default=None, max_length=20)
    full_name: str | None = Field(default=None, max_length=255)


class UserUpdate(SQLModel):
    email: EmailStr | None = Field(default=None, max_length=255)
    telephone: str | None = Field(default=None, max_length=20)
    password: str | None = Field(default=None, min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)
    is_active: bool | None = None
    is_superuser: bool | None = None
    role: UserRole | None = None


class User(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    email: EmailStr | None = Field(default=None, unique=True, index=True)
    telephone: str | None = Field(default=None, unique=True, index=True, max_length=20)
    hashed_password: str
    full_name: str | None = None
    is_active: bool = True
    is_superuser: bool = False
    role: UserRole = Field(default=UserRole.CITOYEN)
    created_at: datetime = Field(default_factory=get_datetime_utc)


class UserPublic(UserBase):
    id: uuid.UUID


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int
