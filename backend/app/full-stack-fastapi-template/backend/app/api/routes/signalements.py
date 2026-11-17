import hashlib
import secrets
import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Field, SQLModel, func, select

from app.api.deps import (
    CurrentUser,
    OptionalCurrentUser,
    SessionDep,
    get_current_active_superuser,
)
from app.models import (
    Signalement,
    SignalementAdmin,
    SignalementCreate,
    SignalementPublic,
    SignalementsPublic,
    SignalementUpdate,
    StatutSignalement,
    StructureCollecte,
    User,
    UserRole,
)

router = APIRouter(
    prefix="/signalements",
    tags=["Signalements"],
)

AdminUser = Annotated[User, Depends(get_current_active_superuser)]

PUBLIC_STATUSES = [
    StatutSignalement.VALIDE,
    StatutSignalement.TRANSMIS,
    StatutSignalement.EN_COURS,
    StatutSignalement.RESOLU,
]


class SignalementCreated(SignalementPublic):
    tracking_reference: str | None = None


class SignalementTrackingRequest(SQLModel):
    reference: str = Field(min_length=32, max_length=128)


class SignalementStatusUpdate(SQLModel):
    statut: StatutSignalement


class SignalementStructureStatusUpdate(SQLModel):
    statut: str


class SignalementAssignment(SQLModel):
    structure_id: uuid.UUID


class SignalementsAdmin(SQLModel):
    data: list[SignalementAdmin]
    count: int


def hash_tracking_reference(reference: str) -> str:
    return hashlib.sha256(reference.encode("utf-8")).hexdigest()


def get_signalement_or_404(
    session: SessionDep,
    signalement_id: uuid.UUID,
) -> Signalement:
    signalement = session.get(Signalement, signalement_id)

    if not signalement:
        raise HTTPException(
            status_code=404,
            detail="Signalement introuvable",
        )

    return signalement


# Création : visiteur anonyme, citoyen ou administrateur
@router.post("/", response_model=SignalementCreated)
def create_signalement(
    *,
    session: SessionDep,
    signalement_in: SignalementCreate,
    current_user: OptionalCurrentUser,
):
    if current_user and current_user.role == UserRole.STRUCTURE:
        raise HTTPException(
            status_code=403,
            detail="Une structure ne peut pas créer de signalement citoyen",
        )

    tracking_reference = None
    tracking_hash = None

    if current_user is None:
        tracking_reference = secrets.token_urlsafe(32)
        tracking_hash = hash_tracking_reference(tracking_reference)

    signalement = Signalement.model_validate(
        signalement_in,
        update={
            "owner_id": current_user.id if current_user else None,
            "statut": StatutSignalement.NOUVEAU,
            "is_archived": False,
            "tracking_token_hash": tracking_hash,
        },
    )

    session.add(signalement)
    session.commit()
    session.refresh(signalement)

    return SignalementCreated.model_validate(
        signalement,
        update={"tracking_reference": tracking_reference},
    )


# Liste publique : uniquement les signalements publiables et non archivés
@router.get("/", response_model=SignalementsPublic)
def read_signalements(
    session: SessionDep,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=100),
):
    filters = [
        Signalement.is_archived.is_(False),
        Signalement.statut.in_(PUBLIC_STATUSES),
    ]

    count = session.exec(
        select(func.count())
        .select_from(Signalement)
        .where(*filters)
    ).one()

    signalements = session.exec(
        select(Signalement)
        .where(*filters)
        .order_by(Signalement.created_at.desc())
        .offset(skip)
        .limit(limit)
    ).all()

    return SignalementsPublic(
        data=signalements,
        count=count,
    )


@router.get("/me", response_model=SignalementsPublic)
def read_my_signalements(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=100),
):
    filters = [Signalement.owner_id == current_user.id, Signalement.is_archived.is_(False)]
    count = session.exec(
        select(func.count()).select_from(Signalement).where(*filters)
    ).one()
    items = session.exec(
        select(Signalement)
        .where(*filters)
        .order_by(Signalement.created_at.desc())
        .offset(skip)
        .limit(limit)
    ).all()
    return SignalementsPublic(data=list(items), count=count)


@router.get("/structure/me", response_model=SignalementsPublic)
def read_structure_signalements(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=100),
):
    if current_user.role != UserRole.STRUCTURE:
        raise HTTPException(status_code=403, detail="Accès réservé aux structures.")
    structure = session.exec(
        select(StructureCollecte).where(StructureCollecte.owner_id == current_user.id)
    ).first()
    if not structure or not structure.validated:
        raise HTTPException(status_code=403, detail="Structure introuvable ou non validée.")
    filters = [Signalement.structure_id == structure.id, Signalement.is_archived.is_(False)]
    count = session.exec(
        select(func.count()).select_from(Signalement).where(*filters)
    ).one()
    items = session.exec(
        select(Signalement)
        .where(*filters)
        .order_by(Signalement.created_at.desc())
        .offset(skip)
        .limit(limit)
    ).all()
    return SignalementsPublic(data=list(items), count=count)


@router.patch("/{signalement_id}/structure-statut", response_model=SignalementPublic)
def update_structure_signalement_status(
    *,
    signalement_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUser,
    status_in: SignalementStructureStatusUpdate,
):
    if current_user.role != UserRole.STRUCTURE:
        raise HTTPException(status_code=403, detail="Accès réservé aux structures.")
    signalement = get_signalement_or_404(session, signalement_id)
    structure = session.exec(
        select(StructureCollecte).where(StructureCollecte.owner_id == current_user.id)
    ).first()
    if not structure or not structure.validated or signalement.structure_id != structure.id:
        raise HTTPException(status_code=403, detail="Ce signalement n'est pas affecté à votre structure.")
    transitions = {
        StatutSignalement.TRANSMIS: ("pris_en_charge", StatutSignalement.EN_COURS),
        StatutSignalement.EN_COURS: ("nettoye", StatutSignalement.RESOLU),
    }
    expected = transitions.get(signalement.statut)
    if not expected or status_in.statut != expected[0]:
        raise HTTPException(status_code=409, detail="Transition de statut non autorisée.")
    signalement.statut = expected[1]
    session.add(signalement)
    session.commit()
    session.refresh(signalement)
    return signalement


@router.get("/me/{signalement_id}", response_model=SignalementPublic)
def read_my_signalement(
    *,
    signalement_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUser,
):
    signalement = get_signalement_or_404(session, signalement_id)
    if signalement.owner_id != current_user.id or signalement.is_archived:
        raise HTTPException(status_code=404, detail="Signalement introuvable.")
    return signalement


# Suivi d'un signalement anonyme par référence secrète
@router.post("/suivi", response_model=SignalementPublic)
def track_anonymous_signalement(
    *,
    session: SessionDep,
    tracking: SignalementTrackingRequest,
):
    reference_hash = hash_tracking_reference(tracking.reference)

    signalement = session.exec(
        select(Signalement).where(
            Signalement.tracking_token_hash == reference_hash,
            Signalement.is_archived.is_(False),
        )
    ).first()

    if not signalement:
        raise HTTPException(
            status_code=404,
            detail="Référence de suivi invalide ou signalement introuvable",
        )

    return signalement


# Liste complète réservée à l'administration
@router.get("/admin", response_model=SignalementsAdmin)
def read_all_signalements_admin(
    *,
    session: SessionDep,
    _current_user: AdminUser,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=100),
):
    count = session.exec(
        select(func.count()).select_from(Signalement)
    ).one()

    signalements = session.exec(
        select(Signalement)
        .order_by(Signalement.created_at.desc())
        .offset(skip)
        .limit(limit)
    ).all()

    return SignalementsAdmin(
        data=signalements,
        count=count,
    )


# Détail complet réservé à l'administration
@router.get("/admin/{signalement_id}", response_model=SignalementAdmin)
def read_signalement_admin(
    *,
    signalement_id: uuid.UUID,
    session: SessionDep,
    _current_user: AdminUser,
):
    return get_signalement_or_404(session, signalement_id)


# Validation, rejet et changement de statut : administration uniquement
@router.patch("/admin/{signalement_id}/statut", response_model=SignalementAdmin)
def update_signalement_status(
    *,
    signalement_id: uuid.UUID,
    session: SessionDep,
    _current_user: AdminUser,
    status_in: SignalementStatusUpdate,
):
    signalement = get_signalement_or_404(session, signalement_id)

    if signalement.is_archived:
        raise HTTPException(
            status_code=409,
            detail="Un signalement archivé ne peut plus changer de statut",
        )

    signalement.statut = status_in.statut

    session.add(signalement)
    session.commit()
    session.refresh(signalement)

    return signalement


# Affectation à une structure validée : administration uniquement
@router.patch("/admin/{signalement_id}/affecter", response_model=SignalementAdmin)
def assign_signalement(
    *,
    signalement_id: uuid.UUID,
    session: SessionDep,
    _current_user: AdminUser,
    assignment: SignalementAssignment,
):
    signalement = get_signalement_or_404(session, signalement_id)

    if signalement.is_archived:
        raise HTTPException(
            status_code=409,
            detail="Impossible d'affecter un signalement archivé",
        )

    structure = session.get(StructureCollecte, assignment.structure_id)

    if not structure or not structure.validated:
        raise HTTPException(
            status_code=404,
            detail="Structure introuvable ou non validée",
        )

    if signalement.statut not in [
        StatutSignalement.VALIDE,
        StatutSignalement.TRANSMIS,
    ]:
        raise HTTPException(
            status_code=409,
            detail="Le signalement doit être validé avant son affectation",
        )

    signalement.structure_id = structure.id
    signalement.statut = StatutSignalement.TRANSMIS

    session.add(signalement)
    session.commit()
    session.refresh(signalement)

    return signalement


# Modification du contenu : propriétaire ou administrateur
@router.put("/{signalement_id}", response_model=SignalementPublic)
def update_signalement(
    *,
    signalement_id: uuid.UUID,
    session: SessionDep,
    signalement_in: SignalementUpdate,
    current_user: CurrentUser,
):
    signalement = get_signalement_or_404(session, signalement_id)

    is_admin = (
        current_user.is_superuser
        and current_user.role == UserRole.ADMIN
    )

    if not is_admin and signalement.owner_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Vous ne pouvez pas modifier ce signalement",
        )

    if signalement.is_archived:
        raise HTTPException(
            status_code=409,
            detail="Un signalement archivé ne peut pas être modifié",
        )

    if not is_admin and signalement.statut not in [
        StatutSignalement.NOUVEAU,
        StatutSignalement.EN_VERIFICATION,
    ]:
        raise HTTPException(
            status_code=409,
            detail="Ce signalement ne peut plus être modifié",
        )

    update_data = signalement_in.model_dump(exclude_unset=True)
    signalement.sqlmodel_update(update_data)

    session.add(signalement)
    session.commit()
    session.refresh(signalement)

    return signalement


# Détail public : uniquement les signalements publiables
@router.get("/{signalement_id}", response_model=SignalementPublic)
def read_signalement(
    *,
    signalement_id: uuid.UUID,
    session: SessionDep,
):
    signalement = get_signalement_or_404(session, signalement_id)

    if signalement.is_archived or signalement.statut not in PUBLIC_STATUSES:
        raise HTTPException(
            status_code=404,
            detail="Signalement introuvable",
        )

    return signalement


# Archivage logique : administration uniquement
@router.delete("/{signalement_id}")
def archive_signalement(
    *,
    signalement_id: uuid.UUID,
    session: SessionDep,
    current_user: AdminUser,
):
    signalement = get_signalement_or_404(session, signalement_id)

    if signalement.is_archived:
        raise HTTPException(
            status_code=409,
            detail="Ce signalement est déjà archivé",
        )

    signalement.is_archived = True
    signalement.archived_at = datetime.now().astimezone()
    signalement.archived_by = current_user.id

    session.add(signalement)
    session.commit()

    return {
        "message": "Signalement archivé avec succès",
        "id": str(signalement.id),
    }
