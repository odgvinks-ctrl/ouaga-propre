from typing import Any

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep, get_accessible_structure
from app.models import (
    Abonnement,
    AbonnementCreate,
    AbonnementPublic,
    AbonnementsPublic,
    StructureCollecte,
    User,
    UserRole,
)

router = APIRouter(prefix="/abonnements", tags=["Abonnements"])


@router.post("/", response_model=AbonnementPublic)
def create_abonnement(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    data: AbonnementCreate,
) -> Any:
    if current_user.role != UserRole.CITOYEN:
        raise HTTPException(status_code=403, detail="Seuls les citoyens peuvent demander un abonnement.")
    structure = session.get(StructureCollecte, data.structure_id)
    if not structure or not structure.validated:
        raise HTTPException(status_code=404, detail="Structure introuvable ou non validée.")
    existing = session.exec(
        select(Abonnement).where(
            Abonnement.citoyen_id == current_user.id,
            Abonnement.structure_id == data.structure_id,
            Abonnement.statut != "refuse",
        )
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Une demande ou un abonnement existe déjà pour cette structure.")
    abonnement = Abonnement.model_validate(
        data,
        update={"citoyen_id": current_user.id, "statut": "en_attente", "motif_refus": None},
    )
    session.add(abonnement)
    session.commit()
    session.refresh(abonnement)
    return abonnement


@router.get("/me", response_model=AbonnementsPublic)
def list_my_abonnements(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
) -> Any:
    statement = (
        select(Abonnement)
        .where(Abonnement.citoyen_id == current_user.id)
        .order_by(Abonnement.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    items = session.exec(statement).all()
    count = session.exec(
        select(func.count()).select_from(Abonnement).where(Abonnement.citoyen_id == current_user.id)
    ).one()
    return AbonnementsPublic(data=list(items), count=count)


@router.get("/structure/{structure_id}", response_model=AbonnementsPublic)
def list_structure_abonnements(
    *,
    session: SessionDep,
    structure_id: str,
    current_user: CurrentUser,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
) -> Any:
    get_accessible_structure(session, current_user, structure_id)
    statement = (
        select(Abonnement)
        .where(Abonnement.structure_id == structure_id)
        .order_by(Abonnement.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    items = session.exec(statement).all()
    count = session.exec(
        select(func.count()).select_from(Abonnement).where(Abonnement.structure_id == structure_id)
    ).one()
    data = []
    for item in items:
        citoyen = session.get(User, item.citoyen_id)
        data.append(
            AbonnementPublic.model_validate(
                item,
                update={
                    "citoyen_nom": citoyen.full_name if citoyen else None,
                    "citoyen_telephone": citoyen.telephone if citoyen else None,
                },
            )
        )
    return AbonnementsPublic(data=data, count=count)


@router.patch("/{abonnement_id}/reponse")
def answer_abonnement(
    *,
    session: SessionDep,
    abonnement_id: str,
    current_user: CurrentUser,
    accepter: bool = True,
    motif: str | None = None,
) -> Any:
    abonnement = session.get(Abonnement, abonnement_id)
    if not abonnement:
        raise HTTPException(status_code=404, detail="Demande introuvable.")
    structure = session.get(StructureCollecte, abonnement.structure_id)
    if not structure or (
        current_user.role != UserRole.ADMIN
        and (current_user.role != UserRole.STRUCTURE or structure.owner_id != current_user.id)
    ):
        raise HTTPException(status_code=403, detail="Vous ne pouvez pas répondre à cette demande.")
    if accepter:
        abonnement.statut = "accepte"
        abonnement.motif_refus = None
    else:
        if not motif or not motif.strip():
            raise HTTPException(status_code=400, detail="Le motif de refus est obligatoire.")
        abonnement.statut = "refuse"
        abonnement.motif_refus = motif.strip()
    session.add(abonnement)
    session.commit()
    session.refresh(abonnement)
    return abonnement
