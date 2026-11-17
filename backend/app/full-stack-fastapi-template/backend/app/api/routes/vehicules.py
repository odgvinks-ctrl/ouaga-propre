from typing import Any

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep, get_accessible_structure
from app.models import (
    Vehicule,
    VehiculeCreate,
    VehiculePublic,
    VehiculesPublic,
)

router = APIRouter(prefix="/vehicules", tags=["Vehicules"])


@router.get("/structure/{structure_id}", response_model=VehiculesPublic)
def list_vehicules(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    structure_id: str,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
) -> Any:
    get_accessible_structure(session, current_user, structure_id)
    statement = (
        select(Vehicule)
        .where(Vehicule.structure_id == structure_id)
        .order_by(Vehicule.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    items = session.exec(statement).all()
    count = session.exec(
        select(func.count()).select_from(Vehicule).where(Vehicule.structure_id == structure_id)
    ).one()
    return VehiculesPublic(data=list(items), count=count)


@router.post("/structure/{structure_id}", response_model=VehiculePublic)
def create_vehicule(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    structure_id: str,
    data: VehiculeCreate,
) -> Any:
    structure = get_accessible_structure(session, current_user, structure_id)
    vehicule = Vehicule.model_validate(data, update={"structure_id": structure.id})
    session.add(vehicule)
    session.commit()
    session.refresh(vehicule)
    return vehicule


@router.patch("/{vehicule_id}/statut")
def update_vehicule_status(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    vehicule_id: str,
    statut: str,
) -> Any:
    vehicule = session.get(Vehicule, vehicule_id)
    if not vehicule:
        raise HTTPException(status_code=404, detail="Véhicule introuvable.")
    get_accessible_structure(session, current_user, str(vehicule.structure_id))
    vehicule.statut = statut
    session.add(vehicule)
    session.commit()
    session.refresh(vehicule)
    return vehicule
