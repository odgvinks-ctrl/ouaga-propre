from typing import Any

from fastapi import APIRouter, Query
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep, get_accessible_structure
from app.models import Equipe, EquipeCreate, EquipePublic, EquipesPublic

router = APIRouter(prefix="/equipes", tags=["Equipes"])


@router.get("/structure/{structure_id}", response_model=EquipesPublic)
def list_equipes(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    structure_id: str,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
) -> Any:
    get_accessible_structure(session, current_user, structure_id)
    statement = (
        select(Equipe)
        .where(Equipe.structure_id == structure_id)
        .order_by(Equipe.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    items = session.exec(statement).all()
    count = session.exec(
        select(func.count()).select_from(Equipe).where(Equipe.structure_id == structure_id)
    ).one()
    return EquipesPublic(data=list(items), count=count)


@router.post("/structure/{structure_id}", response_model=EquipePublic)
def create_equipe(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    structure_id: str,
    data: EquipeCreate,
) -> Any:
    structure = get_accessible_structure(session, current_user, structure_id)
    equipe = Equipe.model_validate(data, update={"structure_id": structure.id})
    session.add(equipe)
    session.commit()
    session.refresh(equipe)
    return equipe
