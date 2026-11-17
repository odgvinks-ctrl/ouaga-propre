from fastapi import APIRouter, HTTPException, Query
from sqlmodel import func, select

from app.api.deps import SessionDep
from app.models import (
    StructureCollecte,
    StructureCollectePublic,
    StructuresCollectePublic,
)

router = APIRouter(
    prefix="/structures",
    tags=["Structures"],
)


@router.get("/", response_model=StructuresCollectePublic)
def read_structures(
    session: SessionDep,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
):
    statement = (
        select(StructureCollecte)
        .where(StructureCollecte.validated.is_(True))
        .order_by(StructureCollecte.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    structures = session.exec(statement).all()
    count = session.exec(
        select(func.count())
        .select_from(StructureCollecte)
        .where(StructureCollecte.validated.is_(True))
    ).one()
    return StructuresCollectePublic(
        data=[StructureCollectePublic.model_validate(s) for s in structures],
        count=count,
    )


@router.get("/{structure_id}", response_model=StructureCollectePublic)
def read_structure(
    structure_id: str,
    session: SessionDep,
):
    structure = session.get(StructureCollecte, structure_id)
    if not structure or not structure.validated:
        raise HTTPException(status_code=404, detail="Structure introuvable")
    return structure
