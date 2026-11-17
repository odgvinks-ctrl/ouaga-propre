import uuid
from typing import Any
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import col, delete, func, select

from app.api.deps import (
    CurrentUser,
    SessionDep,
    require_brigade,
    require_mairie,
    require_mairie_or_brigade,
)
from app.core.config import settings
from app.models.brigade import (
    AgentBrigade,
    AgentBrigadeCreate,
    AgentBrigadeUpdate,
    AgentsBrigadePublic,
    RoleAgentBrigade,
    SanctionBrigade,
    SanctionBrigadeCreate,
    SanctionBrigadeStatutUpdate,
    SanctionsBrigadePublic,
    StatutSanctionBrigade,
    StatutTacheBrigade,
    TacheBrigade,
    TacheBrigadeAffectation,
    TacheBrigadeAgent,
    TacheBrigadeCorrection,
    TacheBrigadeCreate,
    TacheBrigadeHistorique,
    TacheBrigadeHistoriquePublic,
    TacheBrigadePublic,
    TacheBrigadeStatutUpdate,
    TachesBrigadePublic,
)
from app.models.common import get_datetime_utc
from app.models.signalement import Signalement
from app.models.user import User, UserRole

router = APIRouter(prefix="/brigade", tags=["Brigade Laabal"])

TRANSITIONS_TACHE = {
    StatutTacheBrigade.A_FAIRE: {
        StatutTacheBrigade.EN_COURS,
        StatutTacheBrigade.ANNULLEE,
    },
    StatutTacheBrigade.EN_COURS: {
        StatutTacheBrigade.TERMINEE,
        StatutTacheBrigade.ANNULLEE,
    },
    StatutTacheBrigade.TERMINEE: set(),
    StatutTacheBrigade.ANNULLEE: set(),
}


def normalize_phone(phone: str) -> str:
    digits = "".join(character for character in phone if character.isdigit())
    return digits[-8:] if digits else ""


def validate_position(latitude: float | None, longitude: float | None) -> None:
    if (latitude is None) != (longitude is None):
        raise HTTPException(
            status_code=422,
            detail="La latitude et la longitude doivent être fournies ensemble.",
        )
    if latitude is None or longitude is None:
        return
    bounds = settings.BRIGADE_GEO_BOUNDS
    if bounds is None:
        raise HTTPException(
            status_code=503,
            detail="Les limites géographiques de la brigade ne sont pas configurées.",
        )
    if len(bounds) != 4:
        raise HTTPException(
            status_code=503,
            detail="Les limites géographiques de la brigade sont invalides.",
        )
    try:
        west, south, east, north = (float(value) for value in bounds)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=503,
            detail="Les limites géographiques de la brigade sont invalides.",
        )
    if (
        west >= east
        or south >= north
        or not (west <= longitude <= east)
        or not (south <= latitude <= north)
    ):
        raise HTTPException(
            status_code=422,
            detail="La position est en dehors du territoire couvert par la brigade.",
        )


def record_history(
    session: SessionDep,
    task: TacheBrigade,
    current_user: CurrentUser,
    action: str,
    *,
    old_status: StatutTacheBrigade | None = None,
    new_status: StatutTacheBrigade | None = None,
    old_position: tuple[float | None, float | None] | None = None,
    new_position: tuple[float | None, float | None] | None = None,
    reason: str | None = None,
) -> None:
    session.add(
        TacheBrigadeHistorique(
            tache_id=task.id,
            action=action,
            ancien_statut=old_status.value if old_status else None,
            nouveau_statut=new_status.value if new_status else None,
            ancienne_latitude=old_position[0] if old_position else None,
            ancienne_longitude=old_position[1] if old_position else None,
            nouvelle_latitude=new_position[0] if new_position else None,
            nouvelle_longitude=new_position[1] if new_position else None,
            motif=reason,
            auteur_id=current_user.id,
            auteur_nom=current_user.full_name or str(current_user.email or current_user.telephone or ""),
        )
    )


def validate_agents_for_task(
    session: SessionDep,
    agent_ids: list[uuid.UUID],
    task_type: str,
) -> list[AgentBrigade]:
    if len(set(agent_ids)) != len(agent_ids):
        raise HTTPException(status_code=400, detail="Un agent ne peut être affecté qu'une fois.")

    agents = []
    for agent_id in agent_ids:
        agent = session.get(AgentBrigade, agent_id)
        if not agent:
            raise HTTPException(status_code=400, detail="Agent introuvable.")
        if not agent.actif:
            raise HTTPException(status_code=400, detail="Tous les agents doivent être actifs.")
        if agent.role not in (RoleAgentBrigade(task_type), RoleAgentBrigade.CHEF):
            raise HTTPException(status_code=400, detail="Le rôle de l'agent ne correspond pas à la tâche.")
        agents.append(agent)
    return agents


def task_public(session: SessionDep, task: TacheBrigade) -> TacheBrigadePublic:
    links = session.exec(
        select(TacheBrigadeAgent.agent_id).where(TacheBrigadeAgent.tache_id == task.id)
    ).all()
    return TacheBrigadePublic.model_validate(task, update={"agent_ids": list(links)})


@router.get("/configuration")
def get_brigade_configuration(
    _: User = Depends(require_mairie_or_brigade),
) -> dict[str, str | None]:
    number = settings.BRIGADE_WHATSAPP_NUMBER
    if number is not None and (not number.isdigit() or len(number) < 8):
        raise HTTPException(status_code=503, detail="Le numéro WhatsApp de la brigade est invalide.")
    return {"whatsapp_number": number}


@router.get("/agents", response_model=AgentsBrigadePublic, dependencies=[Depends(require_brigade)])
def list_agents(session: SessionDep) -> AgentsBrigadePublic:
    agents = list(session.exec(select(AgentBrigade).order_by(col(AgentBrigade.created_at).desc())).all())
    count = session.exec(select(func.count()).select_from(AgentBrigade)).one()
    return AgentsBrigadePublic(data=agents, count=count)


@router.post("/agents", response_model=AgentBrigade, dependencies=[Depends(require_brigade)])
def create_agent(session: SessionDep, data: AgentBrigadeCreate) -> AgentBrigade:
    telephone = normalize_phone(data.telephone)
    if len(telephone) != 8:
        raise HTTPException(status_code=400, detail="Le téléphone doit contenir 8 chiffres.")
    if session.exec(select(AgentBrigade).where(AgentBrigade.telephone == telephone)).first():
        raise HTTPException(status_code=400, detail="Ce téléphone est déjà utilisé.")
    agent = AgentBrigade.model_validate(data, update={"telephone": telephone})
    session.add(agent)
    session.commit()
    session.refresh(agent)
    return agent


@router.patch("/agents/{agent_id}", response_model=AgentBrigade, dependencies=[Depends(require_brigade)])
def update_agent(session: SessionDep, agent_id: uuid.UUID, data: AgentBrigadeUpdate) -> AgentBrigade:
    agent = session.get(AgentBrigade, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent introuvable.")
    agent.sqlmodel_update(data.model_dump(exclude_unset=True))
    session.add(agent)
    session.commit()
    session.refresh(agent)
    return agent


@router.get("/taches", response_model=TachesBrigadePublic, dependencies=[Depends(require_mairie_or_brigade)])
def list_tasks(session: SessionDep) -> TachesBrigadePublic:
    tasks = session.exec(
        select(TacheBrigade).order_by(col(TacheBrigade.created_at).desc())
    ).all()
    count = session.exec(select(func.count()).select_from(TacheBrigade)).one()
    return TachesBrigadePublic(data=[task_public(session, task) for task in tasks], count=count)


@router.post("/taches", response_model=TacheBrigadePublic, dependencies=[Depends(require_mairie)])
def create_task(
    session: SessionDep,
    current_user: CurrentUser,
    data: TacheBrigadeCreate,
) -> TacheBrigadePublic:
    if data.agent_ids:
        raise HTTPException(status_code=403, detail="Seule la brigade peut affecter ses agents.")
    if data.signalement_id:
        signalement = session.get(Signalement, data.signalement_id)
        if not signalement:
            raise HTTPException(status_code=404, detail="Signalement introuvable.")
        if data.latitude is None:
            data.latitude = signalement.latitude
            data.longitude = signalement.longitude
    validate_position(data.latitude, data.longitude)
    task = TacheBrigade.model_validate(
        data,
        update={"statut": StatutTacheBrigade.A_FAIRE, "created_by": current_user.id},
    )
    session.add(task)
    session.flush()
    record_history(
        session,
        task,
        current_user,
        "creation",
        new_status=task.statut,
        new_position=(task.latitude, task.longitude),
    )
    session.commit()
    session.refresh(task)
    return task_public(session, task)


@router.patch(
    "/taches/{task_id}/statut",
    response_model=TacheBrigadePublic,
    dependencies=[Depends(require_mairie_or_brigade)],
)
def update_task_status(
    session: SessionDep,
    task_id: uuid.UUID,
    data: TacheBrigadeStatutUpdate,
    current_user: CurrentUser,
) -> TacheBrigadePublic:
    task = session.get(TacheBrigade, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Tâche introuvable.")
    new_status = StatutTacheBrigade(data.statut)
    if new_status not in TRANSITIONS_TACHE[task.statut]:
        raise HTTPException(status_code=409, detail="Transition de statut non autorisée.")
    if current_user.role == UserRole.ADMIN and (
        new_status != StatutTacheBrigade.ANNULLEE
        or task.statut != StatutTacheBrigade.A_FAIRE
    ):
        raise HTTPException(
            status_code=403,
            detail="La mairie ne peut annuler qu'une intervention encore à faire.",
        )
    old_status = task.statut
    task.statut = new_status
    task.terminee_le = get_datetime_utc() if new_status == StatutTacheBrigade.TERMINEE else None
    session.add(task)
    record_history(
        session,
        task,
        current_user,
        "annulation" if new_status == StatutTacheBrigade.ANNULLEE else "statut",
        old_status=old_status,
        new_status=new_status,
        reason=(
            data.motif or "Motif non fourni avec la demande d'annulation."
            if new_status == StatutTacheBrigade.ANNULLEE
            else data.motif
        ),
    )
    session.commit()
    session.refresh(task)
    return task_public(session, task)


@router.patch(
    "/taches/{task_id}/position",
    response_model=TacheBrigadePublic,
    dependencies=[Depends(require_brigade)],
)
def correct_task_position(
    session: SessionDep,
    task_id: uuid.UUID,
    data: TacheBrigadeCorrection,
    current_user: CurrentUser,
) -> TacheBrigadePublic:
    task = session.get(TacheBrigade, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Tâche introuvable.")
    validate_position(data.latitude, data.longitude)
    old_position = (task.latitude, task.longitude)
    task.latitude = data.latitude
    task.longitude = data.longitude
    session.add(task)
    record_history(
        session,
        task,
        current_user,
        "correction_position",
        old_position=old_position,
        new_position=(task.latitude, task.longitude),
        reason=data.motif,
    )
    session.commit()
    session.refresh(task)
    return task_public(session, task)


@router.put(
    "/taches/{task_id}/agents",
    response_model=TacheBrigadePublic,
    dependencies=[Depends(require_brigade)],
)
def assign_task_agents(
    session: SessionDep,
    task_id: uuid.UUID,
    data: TacheBrigadeAffectation,
) -> TacheBrigadePublic:
    task = session.get(TacheBrigade, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Tâche introuvable.")
    validate_agents_for_task(session, data.agent_ids, task.type.value)
    session.exec(
        delete(TacheBrigadeAgent).where(col(TacheBrigadeAgent.tache_id) == task.id)
    )
    for agent_id in data.agent_ids:
        session.add(TacheBrigadeAgent(tache_id=task.id, agent_id=agent_id))
    session.commit()
    return task_public(session, task)


@router.get(
    "/taches/{task_id}/historique",
    response_model=list[TacheBrigadeHistoriquePublic],
    dependencies=[Depends(require_mairie_or_brigade)],
)
def get_task_history(
    session: SessionDep,
    task_id: uuid.UUID,
) -> list[TacheBrigadeHistoriquePublic]:
    if not session.get(TacheBrigade, task_id):
        raise HTTPException(status_code=404, detail="Tâche introuvable.")
    events = session.exec(
        select(TacheBrigadeHistorique)
        .where(col(TacheBrigadeHistorique.tache_id) == task_id)
        .order_by(col(TacheBrigadeHistorique.created_at))
    ).all()
    return [TacheBrigadeHistoriquePublic.model_validate(event) for event in events]


@router.get("/taches/{task_id}/partage", dependencies=[Depends(require_mairie_or_brigade)])
def get_task_share_links(session: SessionDep, task_id: uuid.UUID) -> dict[str, Any]:
    task = session.get(TacheBrigade, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Tâche introuvable.")
    message_lines = [
        f"FASO NEERE · Brigade Laabal : {task.type.value}",
        f"{task.quartier} · {task.lieu}",
        f"Consignes : {task.consignes}",
        f"Date : {task.date_prevue.isoformat()}",
    ]
    maps_url = None
    if task.latitude is not None and task.longitude is not None:
        maps_url = (
            "https://www.google.com/maps/dir/?api=1&destination="
            f"{task.latitude},{task.longitude}"
        )
        message_lines.append(f"Position : {maps_url}")
    number = settings.BRIGADE_WHATSAPP_NUMBER
    whatsapp_url = None
    if number:
        if not number.isdigit() or len(number) < 8:
            raise HTTPException(status_code=503, detail="Le numéro WhatsApp de la brigade est invalide.")
        whatsapp_url = f"https://wa.me/{number}?text={quote(chr(10).join(message_lines))}"
    return {
        "whatsapp_url": whatsapp_url,
        "maps_url": maps_url,
        "message": "\n".join(message_lines),
        "message_sent": False,
    }


@router.get("/sanctions", response_model=SanctionsBrigadePublic, dependencies=[Depends(require_brigade)])
def list_sanctions(session: SessionDep) -> SanctionsBrigadePublic:
    sanctions = list(
        session.exec(
            select(SanctionBrigade).order_by(col(SanctionBrigade.created_at).desc())
        ).all()
    )
    count = session.exec(select(func.count()).select_from(SanctionBrigade)).one()
    return SanctionsBrigadePublic(data=sanctions, count=count)


@router.post("/sanctions", response_model=SanctionBrigade, dependencies=[Depends(require_brigade)])
def create_sanction(session: SessionDep, data: SanctionBrigadeCreate) -> SanctionBrigade:
    agent = session.get(AgentBrigade, data.agent_id)
    if not agent or not agent.actif:
        raise HTTPException(status_code=400, detail="L'agent doit exister et être actif.")
    if agent.role not in (RoleAgentBrigade.SANCTION, RoleAgentBrigade.CHEF):
        raise HTTPException(status_code=400, detail="L'agent doit avoir le rôle sanction ou chef.")
    if data.signalement_id and not session.get(Signalement, data.signalement_id):
        raise HTTPException(status_code=404, detail="Signalement introuvable.")
    if data.type.value == "avertissement" and data.montant != 0:
        raise HTTPException(status_code=400, detail="Un avertissement doit avoir un montant de 0.")
    if data.type.value == "amende" and data.montant <= 0:
        raise HTTPException(status_code=400, detail="Une amende doit avoir un montant positif.")
    statut = StatutSanctionBrigade.AVERTIE if data.type.value == "avertissement" else StatutSanctionBrigade.A_PAYER
    sanction = SanctionBrigade.model_validate(data, update={"statut": statut})
    session.add(sanction)
    session.commit()
    session.refresh(sanction)
    return sanction


@router.patch("/sanctions/{sanction_id}/statut", response_model=SanctionBrigade, dependencies=[Depends(require_brigade)])
def update_sanction_status(
    session: SessionDep,
    sanction_id: uuid.UUID,
    data: SanctionBrigadeStatutUpdate,
) -> SanctionBrigade:
    sanction = session.get(SanctionBrigade, sanction_id)
    if not sanction:
        raise HTTPException(status_code=404, detail="Sanction introuvable.")
    sanction.statut = StatutSanctionBrigade(data.statut)
    session.add(sanction)
    session.commit()
    session.refresh(sanction)
    return sanction
