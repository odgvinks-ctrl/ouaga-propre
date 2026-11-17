import json

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import func, select

from app import crud
from app.models.common import get_datetime_utc

from app.api.deps import CurrentUser, SessionDep, get_current_active_superuser
from app.models import (
    StructureCollecte,
    StructureCollecteAdmin,
    StructureCollectePublic,
    StructureCollecteUpdate,
    StructuresCollectePublic,
    User,
    UserCreate,
    UserPublic,
    UserRole,
)

router = APIRouter(
    prefix="/structures",
    tags=["Structures"],
)


class RefusStructure(BaseModel):
    motif: str


class InscriptionStructure(BaseModel):
    nom: str
    telephone: str
    password: str
    responsable: str
    type_structure: str = "GIE"
    quartier: str
    numero_cnib: str
    numero_enregistrement: str
    ifu: str = ""
    numero_autorisation: str
    pieces: dict[str, str] = {}
    conditions_acceptees: bool = False
    conditions_version: str = ""
    commission: int = 10


PIECES_OBLIGATOIRES = {
    "identite": "la pièce d'identité du responsable",
    "legal": "le document légal de la structure",
    "autorisation": "l'autorisation de pré-collecte de la mairie",
}


def find_my_structure(session: SessionDep, current_user: CurrentUser) -> StructureCollecte:
    structure = session.exec(
        select(StructureCollecte).where(StructureCollecte.owner_id == current_user.id)
    ).first()
    if not structure:
        raise HTTPException(status_code=404, detail="Aucune structure liée à ce compte")
    return structure


def to_admin(session: SessionDep, structure: StructureCollecte) -> StructureCollecteAdmin:
    owner = session.get(User, structure.owner_id)
    return StructureCollecteAdmin.model_validate(
        structure,
        update={"compte_actif": bool(owner and owner.is_active)},
    )


@router.get("/", response_model=StructuresCollectePublic)
def read_structures(
    session: SessionDep,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
):
    statement = (
        select(StructureCollecte)
        .join(User, User.id == StructureCollecte.owner_id)
        .where(StructureCollecte.validated.is_(True), User.is_active.is_(True))
        .order_by(StructureCollecte.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    structures = session.exec(statement).all()
    count = session.exec(
        select(func.count())
        .select_from(StructureCollecte)
        .join(User, User.id == StructureCollecte.owner_id)
        .where(StructureCollecte.validated.is_(True), User.is_active.is_(True))
    ).one()
    return StructuresCollectePublic(
        data=[StructureCollectePublic.model_validate(s) for s in structures],
        count=count,
    )


@router.post("/inscription", response_model=UserPublic)
def register_structure(session: SessionDep, data: InscriptionStructure):
    telephone = crud.normalize_phone(data.telephone)
    if len(data.nom.strip()) < 3:
        raise HTTPException(status_code=400, detail="Le nom de la structure est trop court.")
    if not telephone or len(telephone) != 8:
        raise HTTPException(status_code=400, detail="Le numéro doit contenir 8 chiffres.")
    if len(data.password) < 8:
        raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins 8 caractères.")
    if not data.responsable.strip():
        raise HTTPException(status_code=400, detail="Indiquez le nom du responsable.")
    if len(data.numero_cnib.strip()) < 6:
        raise HTTPException(status_code=400, detail="Indiquez le numéro de la CNIB ou du passeport du responsable.")
    if not data.numero_enregistrement.strip():
        raise HTTPException(status_code=400, detail="Le numéro d'enregistrement de la structure est obligatoire.")
    if data.type_structure == "Entreprise" and not data.ifu.strip():
        raise HTTPException(status_code=400, detail="Le numéro IFU est obligatoire pour une entreprise.")
    if len(data.numero_autorisation.strip()) < 4:
        raise HTTPException(status_code=400, detail="Indiquez le numéro de l'autorisation de pré-collecte délivrée par la mairie.")
    if not data.conditions_acceptees:
        raise HTTPException(status_code=400, detail="Acceptez les conditions de partenariat pour créer un compte structure.")
    obligatoires = dict(PIECES_OBLIGATOIRES)
    if data.type_structure == "Entreprise":
        obligatoires["ifu"] = "l'attestation IFU"
    for cle, libelle in obligatoires.items():
        if not data.pieces.get(cle):
            raise HTTPException(status_code=400, detail=f"Ajoutez le document : {libelle}.")
    if crud.get_user_by_email(session=session, email=telephone):
        raise HTTPException(status_code=409, detail="Ce numéro est déjà utilisé par un compte.")

    user = crud.create_user(
        session=session,
        user_create=UserCreate(
            telephone=telephone,
            full_name=data.nom.strip(),
            password=data.password,
            role=UserRole.STRUCTURE,
        ),
    )
    structure = StructureCollecte(
        owner_id=user.id,
        nom=data.nom.strip(),
        responsable=data.responsable.strip(),
        telephone=telephone,
        adresse=f"{data.quartier}, Ouagadougou",
        zones_intervention=data.quartier,
        statut="en_attente",
        validated=False,
        type_structure=data.type_structure,
        numero_cnib=data.numero_cnib.strip().upper(),
        numero_enregistrement=data.numero_enregistrement.strip(),
        ifu=data.ifu.strip().upper(),
        numero_autorisation=data.numero_autorisation.strip().upper(),
        pieces=json.dumps(data.pieces, ensure_ascii=False),
        conditions_version=data.conditions_version,
        conditions_commission=data.commission,
        conditions_acceptees_le=get_datetime_utc(),
    )
    session.add(structure)
    session.commit()
    return user


@router.get("/moi", response_model=StructureCollectePublic)
def read_my_structure(session: SessionDep, current_user: CurrentUser):
    return find_my_structure(session, current_user)


@router.patch("/moi", response_model=StructureCollectePublic)
def update_my_structure(
    session: SessionDep,
    current_user: CurrentUser,
    data: StructureCollecteUpdate,
):
    if current_user.role != UserRole.STRUCTURE:
        raise HTTPException(status_code=403, detail="Réservé aux structures.")
    structure = find_my_structure(session, current_user)
    changes = data.model_dump(exclude_unset=True, exclude_none=True)
    for field in ("statut", "validated"):
        changes.pop(field, None)
    structure.sqlmodel_update(changes)
    session.add(structure)
    session.commit()
    session.refresh(structure)
    return structure


@router.get(
    "/admin/toutes",
    response_model=list[StructureCollecteAdmin],
    dependencies=[Depends(get_current_active_superuser)],
)
def read_all_structures_admin(session: SessionDep):
    structures = session.exec(
        select(StructureCollecte).order_by(StructureCollecte.created_at.desc())
    ).all()
    return [to_admin(session, s) for s in structures]


@router.patch(
    "/admin/{structure_id}/valider",
    response_model=StructureCollecteAdmin,
    dependencies=[Depends(get_current_active_superuser)],
)
def validate_structure(structure_id: str, session: SessionDep):
    structure = session.get(StructureCollecte, structure_id)
    if not structure:
        raise HTTPException(status_code=404, detail="Structure introuvable")
    structure.validated = True
    structure.statut = "actif"
    structure.motif_refus = None
    session.add(structure)
    session.commit()
    session.refresh(structure)
    return to_admin(session, structure)


@router.patch(
    "/admin/{structure_id}/refuser",
    response_model=StructureCollecteAdmin,
    dependencies=[Depends(get_current_active_superuser)],
)
def refuse_structure(structure_id: str, data: RefusStructure, session: SessionDep):
    if not data.motif.strip():
        raise HTTPException(status_code=400, detail="Indiquez le motif du refus.")
    structure = session.get(StructureCollecte, structure_id)
    if not structure:
        raise HTTPException(status_code=404, detail="Structure introuvable")
    structure.validated = False
    structure.statut = "refuse"
    structure.motif_refus = data.motif.strip()
    session.add(structure)
    session.commit()
    session.refresh(structure)
    return to_admin(session, structure)


@router.get("/{structure_id}", response_model=StructureCollectePublic)
def read_structure(
    structure_id: str,
    session: SessionDep,
):
    structure = session.get(StructureCollecte, structure_id)
    if not structure or not structure.validated:
        raise HTTPException(status_code=404, detail="Structure introuvable")
    return structure
