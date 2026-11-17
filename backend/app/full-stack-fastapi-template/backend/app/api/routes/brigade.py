import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import func, select

from app.api.deps import SessionDep, get_current_active_superuser
from app.models import (
    Signalement,
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
    TacheBrigadeAgent,
    TacheBrigadeCreate,
    TacheBrigadePublic,
    TacheBrigadeStatutUpdate,
    TachesBrigadePublic,
)
from app.models.common import get_datetime_utc

router = APIRouter(
    prefix="/brigade",
    tags=["Brigade Laabal"],
    dependencies=[Depends(get_current_active_superuser)],
)


def normalize_phone(phone: str) -> str:
    digits = "".join(character for character in phone if character.isdigit())
    return digits[-8:] if digits else ""


@router.get("/agents", response_model=AgentsBrigadePublic)
def list_agents(session: SessionDep):
    agents = session.exec(select(AgentBrigade).order_by(AgentBrigade.created_at.desc())).all()
    count = session.exec(select(func.count()).select_from(AgentBrigade)).one()
    return AgentsBrigadePublic(data=agents, count=count)


@router.post("/agents", response_model=AgentBrigade)
def create_agent(session: SessionDep, data: AgentBrigadeCreate):
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


@router.patch("/agents/{agent_id}", response_model=AgentBrigade)
def update_agent(session: SessionDep, agent_id: uuid.UUID, data: AgentBrigadeUpdate):
    agent = session.get(AgentBrigade, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent introuvable.")
    agent.sqlmodel_update(data.model_dump(exclude_unset=True))
    session.add(agent)
    session.commit()
    session.refresh(agent)
    return agent


def validate_agents_for_task(
    session: SessionDep,
    agent_ids: list[uuid.UUID],
    task_type: str,
) -> list[AgentBrigade]:
    if not agent_ids:
        return []
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


@router.get("/taches", response_model=TachesBrigadePublic)
def list_tasks(session: SessionDep):
    tasks = session.exec(select(TacheBrigade).order_by(TacheBrigade.created_at.desc())).all()
    count = session.exec(select(func.count()).select_from(TacheBrigade)).one()
    return TachesBrigadePublic(data=[task_public(session, task) for task in tasks], count=count)


@router.post("/taches", response_model=TacheBrigadePublic)
def create_task(session: SessionDep, data: TacheBrigadeCreate):
    validate_agents_for_task(session, data.agent_ids, data.type.value)
    if data.signalement_id and (data.latitude is None or data.longitude is None):
        signalement = session.get(Signalement, data.signalement_id)
        if signalement:
            data.latitude = signalement.latitude
            data.longitude = signalement.longitude
    task = TacheBrigade.model_validate(
        data,
        update={"statut": StatutTacheBrigade.A_FAIRE},
    )
    task_data = task.model_dump()
    task_data.pop("agent_ids", None)
    task = TacheBrigade.model_validate(task_data)
    session.add(task)
    session.commit()
    session.refresh(task)
    for agent_id in data.agent_ids:
        session.add(TacheBrigadeAgent(tache_id=task.id, agent_id=agent_id))
    session.commit()
    return task_public(session, task)


@router.patch("/taches/{task_id}/statut", response_model=TacheBrigadePublic)
def update_task_status(session: SessionDep, task_id: uuid.UUID, data: TacheBrigadeStatutUpdate):
    task = session.get(TacheBrigade, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Tâche introuvable.")
    task.statut = StatutTacheBrigade(data.statut)
    task.terminee_le = get_datetime_utc() if task.statut == StatutTacheBrigade.TERMINEE else None
    session.add(task)
    session.commit()
    session.refresh(task)
    return task_public(session, task)


@router.get("/sanctions", response_model=SanctionsBrigadePublic)
def list_sanctions(session: SessionDep):
    sanctions = session.exec(select(SanctionBrigade).order_by(SanctionBrigade.created_at.desc())).all()
    count = session.exec(select(func.count()).select_from(SanctionBrigade)).one()
    return SanctionsBrigadePublic(data=sanctions, count=count)


@router.post("/sanctions", response_model=SanctionBrigade)
def create_sanction(session: SessionDep, data: SanctionBrigadeCreate):
    agent = session.get(AgentBrigade, data.agent_id)
    if not agent or not agent.actif:
        raise HTTPException(status_code=400, detail="L'agent doit exister et être actif.")
    if agent.role not in (RoleAgentBrigade.SANCTION, RoleAgentBrigade.CHEF):
        raise HTTPException(status_code=400, detail="L'agent doit avoir le rôle sanction ou chef.")
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


@router.patch("/sanctions/{sanction_id}/statut", response_model=SanctionBrigade)
def update_sanction_status(session: SessionDep, sanction_id: uuid.UUID, data: SanctionBrigadeStatutUpdate):
    sanction = session.get(SanctionBrigade, sanction_id)
    if not sanction:
        raise HTTPException(status_code=404, detail="Sanction introuvable.")
    sanction.statut = StatutSanctionBrigade(data.statut)
    session.add(sanction)
    session.commit()
    session.refresh(sanction)
    return sanction
