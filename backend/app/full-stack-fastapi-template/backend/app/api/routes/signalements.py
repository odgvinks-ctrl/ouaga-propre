import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import select, func

from app.api.deps import CurrentUser, SessionDep

from app.models import (
    Signalement,
    SignalementCreate,
    SignalementUpdate,
    SignalementPublic,
    SignalementsPublic,
)

router = APIRouter(
    prefix="/signalements",
    tags=["Signalements"],
)


@router.post("/", response_model=SignalementPublic)
def create_signalement(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    signalement_in: SignalementCreate,
) -> Any:

    signalement = Signalement.model_validate(
        signalement_in,
        update={"owner_id": current_user.id}
    )

    session.add(signalement)
    session.commit()
    session.refresh(signalement)

    return signalement


@router.get("/", response_model=SignalementsPublic)
def read_signalements(
    session: SessionDep,
    skip: int = 0,
    limit: int = 100,
) -> Any:

    count = session.exec(
        select(func.count()).select_from(Signalement)
    ).one()

    signalements = session.exec(
        select(Signalement)
        .offset(skip)
        .limit(limit)
    ).all()

    return SignalementsPublic(
        data=signalements,
        count=count,
    )


@router.get("/{id}", response_model=SignalementPublic)
def read_signalement(
    id: uuid.UUID,
    session: SessionDep,
) -> Any:

    signalement = session.get(
        Signalement,
        id
    )

    if not signalement:
        raise HTTPException(
            status_code=404,
            detail="Signalement introuvable"
        )

    return signalement


@router.put("/{id}", response_model=SignalementPublic)
def update_signalement(
    *,
    id: uuid.UUID,
    session: SessionDep,
    signalement_in: SignalementUpdate,
) -> Any:

    signalement = session.get(
        Signalement,
        id
    )

    if not signalement:
        raise HTTPException(
            status_code=404,
            detail="Signalement introuvable"
        )

    update_data = signalement_in.model_dump(
        exclude_unset=True
    )

    signalement.sqlmodel_update(
        update_data
    )

    session.add(signalement)
    session.commit()
    session.refresh(signalement)

    return signalement


@router.delete("/{id}")
def delete_signalement(
    *,
    id: uuid.UUID,
    session: SessionDep,
) -> Any:

    signalement = session.get(
        Signalement,
        id
    )

    if not signalement:
        raise HTTPException(
            status_code=404,
            detail="Signalement introuvable"
        )

    session.delete(signalement)
    session.commit()

    return {
        "message": "Signalement supprimé"
    }