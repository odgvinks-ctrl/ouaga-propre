import re
from typing import Any

from sqlmodel import Session, or_, select

from app.core.security import get_password_hash, verify_password
from app.models import User, UserCreate, UserUpdate


def normalize_phone(phone: str | None) -> str | None:
    if phone is None:
        return None
    digits = re.sub(r"\D", "", str(phone))
    if not digits:
        return None
    return digits[-8:]


def create_user(*, session: Session, user_create: UserCreate) -> User:
    normalized_phone = normalize_phone(user_create.telephone)
    payload = user_create.model_dump(exclude_unset=True)
    if normalized_phone:
        payload["telephone"] = normalized_phone
    if payload.get("email"):
        payload["email"] = str(payload["email"]).strip().lower()

    db_obj = User.model_validate(
        payload,
        update={"hashed_password": get_password_hash(user_create.password)},
    )
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def update_user(*, session: Session, db_user: User, user_in: UserUpdate) -> Any:
    user_data = user_in.model_dump(exclude_unset=True)
    extra_data = {}

    if "telephone" in user_data and user_data["telephone"] is not None:
        user_data["telephone"] = normalize_phone(user_data["telephone"])
    if "email" in user_data and user_data["email"] is not None:
        user_data["email"] = str(user_data["email"]).strip().lower()

    password = user_data.pop("password", None)
    if password is not None:
        extra_data["hashed_password"] = get_password_hash(password)

    db_user.sqlmodel_update(user_data, update=extra_data)
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user


def get_user_by_email(*, session: Session, email: str) -> User | None:
    identifier = str(email).strip()
    if not identifier:
        return None
    normalized_phone = normalize_phone(identifier)
    predicates = [User.email == identifier.lower()]
    if normalized_phone:
        predicates.append(User.telephone == normalized_phone)
    statement = select(User).where(or_(*predicates))
    session_user = session.exec(statement).first()
    return session_user


# Dummy hash to use for timing attack prevention when user is not found
# This is an Argon2 hash of a random password, used to ensure constant-time comparison
DUMMY_HASH = "$argon2id$v=19$m=65536,t=3,p=4$MjQyZWE1MzBjYjJlZTI0Yw$YTU4NGM5ZTZmYjE2NzZlZjY0ZWY3ZGRkY2U2OWFjNjk"


def authenticate(*, session: Session, email: str, password: str) -> User | None:
    identifier = str(email or "").strip()
    if not identifier:
        return None
    normalized_phone = normalize_phone(identifier)
    predicates = [User.email == identifier.lower()]
    if normalized_phone:
        predicates.append(User.telephone == normalized_phone)
    statement = select(User).where(or_(*predicates))
    db_user = session.exec(statement).first()
    if not db_user:
        verify_password(password, DUMMY_HASH)
        return None
    verified, updated_password_hash = verify_password(password, db_user.hashed_password)
    if not verified:
        return None
    if updated_password_hash:
        db_user.hashed_password = updated_password_hash
        session.add(db_user)
        session.commit()
        session.refresh(db_user)
    return db_user


