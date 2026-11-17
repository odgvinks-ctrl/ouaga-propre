import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import col, delete, func, or_, select

from app import crud
from app.api.deps import (
    CurrentUser,
    SessionDep,
    get_current_active_superuser,
)
from app.core.config import settings
from app.core.security import get_password_hash, verify_password
from app.models import (
    Message,
    UpdatePassword,
    User,
    UserCreate,
    UserPublic,
    UserRegister,
    UsersPublic,
    UserUpdate,
    UserUpdateMe,
    UserRole,
)
from app.utils import generate_new_account_email, send_email

router = APIRouter(prefix="/users", tags=["users"])


@router.get(
    "/",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=UsersPublic,
)
def read_users(session: SessionDep, skip: int = 0, limit: int = 100) -> Any:
    """
    Retrieve users.
    """

    count_statement = select(func.count()).select_from(User)
    count = session.exec(count_statement).one()

    statement = (
        select(User).order_by(col(User.created_at).desc()).offset(skip).limit(limit)
    )
    users = session.exec(statement).all()

    users_public = [UserPublic.model_validate(user) for user in users]
    return UsersPublic(data=users_public, count=count)


@router.post(
    "/", dependencies=[Depends(get_current_active_superuser)], response_model=UserPublic
)
def create_user(*, session: SessionDep, user_in: UserCreate) -> Any:
    """
    Create new user.
    """
    user = crud.get_user_by_email(session=session, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )

    user = crud.create_user(session=session, user_create=user_in)
    if settings.emails_enabled and user_in.email:
        email_data = generate_new_account_email(
            email_to=user_in.email, username=user_in.email, password=user_in.password
        )
        send_email(
            email_to=user_in.email,
            subject=email_data.subject,
            html_content=email_data.html_content,
        )
    return user


@router.patch("/me", response_model=UserPublic)
def update_user_me(
    *, session: SessionDep, user_in: UserUpdateMe, current_user: CurrentUser
) -> Any:
    """
    Update own user.
    """

    if user_in.email:
        existing_user = crud.get_user_by_email(session=session, email=user_in.email)
        if existing_user and existing_user.id != current_user.id:
            raise HTTPException(
                status_code=409, detail="User with this email already exists"
            )
    user_data = user_in.model_dump(
        exclude_unset=True,
        exclude_none=True,
    )
    current_user.sqlmodel_update(user_data)
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return current_user


@router.patch("/me/password", response_model=Message)
def update_password_me(
    *, session: SessionDep, body: UpdatePassword, current_user: CurrentUser
) -> Any:
    """
    Update own password.
    """
    verified, _ = verify_password(body.current_password, current_user.hashed_password)
    if not verified:
        raise HTTPException(status_code=400, detail="Incorrect password")
    if body.current_password == body.new_password:
        raise HTTPException(
            status_code=400, detail="New password cannot be the same as the current one"
        )
    hashed_password = get_password_hash(body.new_password)
    current_user.hashed_password = hashed_password
    session.add(current_user)
    session.commit()
    return Message(message="Password updated successfully")


@router.get("/me", response_model=UserPublic)
def read_user_me(current_user: CurrentUser) -> Any:
    """
    Get current user.
    """
    return current_user


@router.delete("/me", response_model=Message)
def delete_user_me(
    session: SessionDep,
    current_user: CurrentUser,
) -> Message:
    """Deactivate the current user's account without deleting its history."""
    if current_user.is_superuser or current_user.role == UserRole.ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Administrators cannot deactivate their own account",
        )

    current_user.is_active = False
    session.add(current_user)
    session.commit()

    return Message(message="Account deactivated successfully")

@router.post("/signup", response_model=UserPublic)
def register_user(session: SessionDep, user_in: UserRegister) -> Any:
    """
    Create new user without the need to be logged in.
    """
    user = crud.get_user_by_email(session=session, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system",
        )
    user_create = UserCreate.model_validate(user_in)
    user = crud.create_user(session=session, user_create=user_create)
    return user


@router.get("/{user_id}", response_model=UserPublic)
def read_user_by_id(
    user_id: uuid.UUID, session: SessionDep, current_user: CurrentUser
) -> Any:
    """
    Get a specific user by id.
    """
    user = session.get(User, user_id)
    if user == current_user:
        return user
    if (
        not current_user.is_superuser
        or current_user.role != UserRole.ADMIN
    ):
        raise HTTPException(
            status_code=403,
            detail="The user doesn't have enough privileges",
        )
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.patch(
    "/{user_id}",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=UserPublic,
)
def update_user(
    *,
    session: SessionDep,
    user_id: uuid.UUID,
    user_in: UserUpdate,
    current_user: CurrentUser,
) -> Any:
    """Update a user while preserving administrator safeguards."""
    db_user = session.get(User, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    user_data = user_in.model_dump(
        exclude_unset=True,
        exclude_none=True,
    )

    if user_data.get("email"):
        existing_user = crud.get_user_by_email(
            session=session,
            email=user_data["email"],
        )
        if existing_user and existing_user.id != user_id:
            raise HTTPException(
                status_code=409,
                detail="User with this email already exists",
            )

    if "role" in user_data:
        if user_data["role"] is None:
            raise HTTPException(status_code=400, detail="Role cannot be null")
        user_data["is_superuser"] = user_data["role"] == UserRole.ADMIN
    elif "is_superuser" in user_data:
        if user_data["is_superuser"] is None:
            raise HTTPException(
                status_code=400,
                detail="Administrator status cannot be null",
            )
        if user_data["is_superuser"]:
            user_data["role"] = UserRole.ADMIN
        elif db_user.role == UserRole.ADMIN:
            user_data["role"] = UserRole.CITOYEN

    resulting_active = user_data.get("is_active", db_user.is_active)
    resulting_superuser = user_data.get("is_superuser", db_user.is_superuser)

    if user_id == current_user.id and (
        not resulting_active or not resulting_superuser
    ):
        raise HTTPException(
            status_code=403,
            detail="You cannot deactivate or demote your own administrator account",
        )

    was_active_admin = db_user.is_active and (
        db_user.is_superuser or db_user.role == UserRole.ADMIN
    )
    resulting_role = user_data.get("role", db_user.role)
    remains_active_admin = resulting_active and (
        resulting_superuser or resulting_role == UserRole.ADMIN
    )

    if was_active_admin and not remains_active_admin:
        active_admins = session.exec(
            select(func.count())
            .select_from(User)
            .where(User.is_active == True, or_(User.is_superuser == True, User.role == UserRole.ADMIN))
        ).one()

        if active_admins <= 1:
            raise HTTPException(
                status_code=403,
                detail="Cannot deactivate or demote the last active administrator",
            )

    updated_user = UserUpdate(**user_data)
    return crud.update_user(
        session=session,
        db_user=db_user,
        user_in=updated_user,
    )

@router.delete("/{user_id}", dependencies=[Depends(get_current_active_superuser)])
def delete_user(
    session: SessionDep,
    current_user: CurrentUser,
    user_id: uuid.UUID,
) -> Message:
    """Deactivate a user without deleting associated history."""
    user = session.get(User, user_id)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Administrators cannot deactivate their own account",
        )

    if user.is_active and (
        user.is_superuser or user.role == UserRole.ADMIN
    ):
        active_admins = session.exec(
            select(func.count())
            .select_from(User)
            .where(User.is_active == True, or_(User.is_superuser == True, User.role == UserRole.ADMIN))
        ).one()

        if active_admins <= 1:
            raise HTTPException(
                status_code=403,
                detail="Cannot deactivate the last active administrator",
            )

    user.is_active = False
    session.add(user)
    session.commit()

    return Message(message="User deactivated successfully")
