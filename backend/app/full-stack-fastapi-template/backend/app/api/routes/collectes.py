from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep, get_accessible_structure
from app.models import (
    Abonnement,
    Collecte,
    CollecteCreate,
    CollectePublic,
    CollectesPublic,
    StructureCollecte,
    User,
    UserRole,
)

router = APIRouter(prefix="/collectes", tags=["Collectes"])


@router.post("/", response_model=CollectePublic)
def create_collecte(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    data: CollecteCreate,
) -> Any:
    if current_user.role != UserRole.CITOYEN:
        raise HTTPException(status_code=403, detail="Seuls les citoyens peuvent demander une collecte.")
    abonnement = session.get(Abonnement, data.abonnement_id)
    if not abonnement or abonnement.citoyen_id != current_user.id:
        raise HTTPException(status_code=404, detail="Abonnement introuvable.")
    if abonnement.statut != "accepte":
        raise HTTPException(status_code=400, detail="Un abonnement accepté est requis pour demander une collecte.")
    existing = session.exec(
        select(Collecte).where(
            Collecte.abonnement_id == data.abonnement_id,
            Collecte.statut.in_(["demandee", "planifiee"]),
        )
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Une collecte est déjà en cours pour cet abonnement.")
    structure = session.get(StructureCollecte, abonnement.structure_id)
    if not structure or not structure.validated:
        raise HTTPException(status_code=404, detail="Structure non valide.")
    collecte = Collecte.model_validate(
        data,
        update={"citoyen_id": current_user.id, "structure_id": abonnement.structure_id, "date": datetime.now(timezone.utc)},
    )
    session.add(collecte)
    session.commit()
    session.refresh(collecte)
    return collecte


@router.get("/me", response_model=CollectesPublic)
def list_my_collectes(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
) -> Any:
    statement = (
        select(Collecte)
        .where(Collecte.citoyen_id == current_user.id)
        .order_by(Collecte.date.desc())
        .offset(skip)
        .limit(limit)
    )
    items = session.exec(statement).all()
    count = session.exec(
        select(func.count()).select_from(Collecte).where(Collecte.citoyen_id == current_user.id)
    ).one()
    return CollectesPublic(data=list(items), count=count)


@router.get("/structure/{structure_id}", response_model=CollectesPublic)
def list_structure_collectes(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    structure_id: str,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
) -> Any:
    get_accessible_structure(session, current_user, structure_id)
    statement = (
        select(Collecte)
        .where(Collecte.structure_id == structure_id)
        .order_by(Collecte.date.desc())
        .offset(skip)
        .limit(limit)
    )
    items = session.exec(statement).all()
    count = session.exec(
        select(func.count()).select_from(Collecte).where(Collecte.structure_id == structure_id)
    ).one()
    data = []
    for item in items:
        citoyen = session.get(User, item.citoyen_id)
        abonnement = session.get(Abonnement, item.abonnement_id)
        data.append(
            CollectePublic.model_validate(
                item,
                update={
                    "citoyen_nom": citoyen.full_name if citoyen else None,
                    "citoyen_telephone": citoyen.telephone if citoyen else None,
                    "quartier": abonnement.quartier if abonnement else None,
                    "repere": abonnement.repere if abonnement else None,
                },
            )
        )
    return CollectesPublic(data=data, count=count)


@router.patch("/{collecte_id}/planifier")
def planifier_collecte(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    collecte_id: str,
    date_prevue: datetime,
) -> Any:
    collecte = session.get(Collecte, collecte_id)
    if not collecte:
        raise HTTPException(status_code=404, detail="Collecte introuvable.")
    if collecte.citoyen_id == current_user.id:
        raise HTTPException(status_code=403, detail="Seule la structure peut planifier une collecte.")
    get_accessible_structure(session, current_user, str(collecte.structure_id))
    if current_user.role not in {UserRole.STRUCTURE, UserRole.ADMIN}:
        raise HTTPException(status_code=403, detail="Action non autorisée.")
    collecte.date_prevue = date_prevue
    collecte.statut = "planifiee"
    session.add(collecte)
    session.commit()
    session.refresh(collecte)
    return collecte


@router.patch("/{collecte_id}/terminer")
def terminer_collecte(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    collecte_id: str,
) -> Any:
    collecte = session.get(Collecte, collecte_id)
    if not collecte:
        raise HTTPException(status_code=404, detail="Collecte introuvable.")
    get_accessible_structure(session, current_user, str(collecte.structure_id))
    collecte.statut = "faite"
    session.add(collecte)
    session.commit()
    session.refresh(collecte)
    return collecte


@router.patch("/{collecte_id}/reporter")
def reporter_collecte(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    collecte_id: str,
    jours: int = 1,
) -> Any:
    collecte = session.get(Collecte, collecte_id)
    if not collecte:
        raise HTTPException(status_code=404, detail="Collecte introuvable.")
    get_accessible_structure(session, current_user, str(collecte.structure_id))
    nouvelle_date = datetime.now(timezone.utc).replace(hour=9, minute=0, second=0, microsecond=0)
    nouvelle_date += timedelta(days=max(jours, 1))
    collecte.date_prevue = nouvelle_date
    session.add(collecte)
    session.commit()
    session.refresh(collecte)
    return collecte
