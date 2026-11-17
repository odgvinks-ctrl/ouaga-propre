from typing import Any

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Notification,
    NotificationCreate,
    NotificationPublic,
    NotificationsPublic,
    UserRole,
)

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/me", response_model=NotificationsPublic)
def list_notifications(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
) -> Any:
    if current_user.role == UserRole.ADMIN:
        return NotificationsPublic(data=[], count=0)
    statement = (
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    items = session.exec(statement).all()
    count = session.exec(
        select(func.count()).select_from(Notification).where(Notification.user_id == current_user.id)
    ).one()
    return NotificationsPublic(data=list(items), count=count)


@router.post("/", response_model=NotificationPublic)
def create_notification(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    data: NotificationCreate,
) -> Any:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Seuls les administrateurs peuvent créer des notifications.")
    notification = Notification.model_validate(data)
    session.add(notification)
    session.commit()
    session.refresh(notification)
    return notification
