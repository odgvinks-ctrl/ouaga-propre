import uuid
from collections.abc import Generator
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from pydantic import ValidationError
from sqlmodel import Session

from app.core import security
from app.core.config import settings
from app.core.db import engine
from app.models import StructureCollecte, TokenPayload, User, UserRole

# Authentification obligatoire
reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/login/access-token"
)

# Authentification facultative pour les visiteurs et citoyens
reusable_oauth2_optional = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/login/access-token",
    auto_error=False,
)


def get_db() -> Generator[Session]:
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_db)]
TokenDep = Annotated[str, Depends(reusable_oauth2)]
OptionalTokenDep = Annotated[str | None, Depends(reusable_oauth2_optional)]


def get_current_user(session: SessionDep, token: TokenDep) -> User:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except (InvalidTokenError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )

    user = session.get(User, token_data.sub)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    return user


def get_current_user_optional(
    session: SessionDep,
    token: OptionalTokenDep,
) -> User | None:
    # Aucun jeton : visiteur anonyme
    if token is None:
        return None

    # Un jeton fourni doit obligatoirement être valide
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except (InvalidTokenError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )

    user = session.get(User, token_data.sub)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    return user


CurrentUser = Annotated[User, Depends(get_current_user)]

OptionalCurrentUser = Annotated[
    User | None,
    Depends(get_current_user_optional),
]


def get_current_active_superuser(current_user: CurrentUser) -> User:
    if not current_user.is_superuser or current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=403,
            detail="The user doesn't have enough privileges",
        )

    return current_user


def get_accessible_structure(
    session: Session,
    current_user: User,
    structure_id: str,
) -> StructureCollecte:
    try:
        normalized_id = uuid.UUID(str(structure_id))
    except ValueError:
        raise HTTPException(status_code=404, detail="Structure introuvable.")
    structure = session.get(StructureCollecte, normalized_id)
    if not structure:
        raise HTTPException(status_code=404, detail="Structure introuvable.")
    if current_user.role == UserRole.ADMIN:
        return structure
    if current_user.role != UserRole.STRUCTURE or structure.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Accès non autorisé à cette structure.")
    return structure
