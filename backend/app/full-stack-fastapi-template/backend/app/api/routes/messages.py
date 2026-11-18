from typing import Any

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    MessageCreate,
    MessagePublic,
    MessagesPublic,
    StructureCollecte,
    User,
    UserRole,
)
from app.models.messages import Message

router = APIRouter(prefix="/messages", tags=["Messages"])


def conversation_id_for(citoyen_id: str, structure_id: str) -> str:
    return f"{citoyen_id}__{structure_id}"


@router.get("/conversation/{citoyen_id}/{structure_id}", response_model=MessagesPublic)
def get_conversation_messages(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    citoyen_id: str,
    structure_id: str,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
) -> Any:
    conversation = conversation_id_for(citoyen_id, structure_id)
    is_admin = current_user.role == UserRole.ADMIN
    is_citizen = str(current_user.id) == citoyen_id
    is_structure_owner = False
    if current_user.role == UserRole.STRUCTURE:
        structure = session.get(StructureCollecte, structure_id)
        is_structure_owner = bool(structure and structure.owner_id == current_user.id)
    if not (is_admin or is_citizen or is_structure_owner):
        raise HTTPException(status_code=403, detail="Vous n'êtes pas participant à cette conversation.")
    statement = (
        select(Message)
        .where(Message.conversation_id == conversation)
        .order_by(Message.date.asc())
        .offset(skip)
        .limit(limit)
    )
    items = session.exec(statement).all()
    for item in items:
        if item.destinataire_id == current_user.id and not item.lu:
            item.lu = True
            session.add(item)
    session.commit()
    count = session.exec(
        select(func.count()).select_from(Message).where(Message.conversation_id == conversation)
    ).one()
    return MessagesPublic(data=list(items), count=count)


@router.post("/conversation/{citoyen_id}/{structure_id}", response_model=MessagePublic)
def send_message(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    citoyen_id: str,
    structure_id: str,
    payload: MessageCreate,
) -> Any:
    conversation = conversation_id_for(citoyen_id, structure_id)
    if payload.conversation_id != conversation:
        raise HTTPException(status_code=400, detail="Identifiant de conversation invalide.")
    is_citizen = str(current_user.id) == citoyen_id
    structure = session.get(StructureCollecte, structure_id)
    is_structure_owner = bool(
        current_user.role == UserRole.STRUCTURE
        and structure
        and structure.owner_id == current_user.id
    )
    if not (is_citizen or is_structure_owner):
        raise HTTPException(status_code=403, detail="Vous n'êtes pas participant à cette conversation.")
    if len(payload.texte.strip()) == 0:
        raise HTTPException(status_code=400, detail="Le message ne peut pas être vide.")
    if len(payload.texte) > 1000:
        raise HTTPException(status_code=400, detail="Le message ne peut pas dépasser 1000 caractères.")
    if not structure:
        raise HTTPException(status_code=404, detail="Structure introuvable.")
    destinataire_id = structure.owner_id if is_citizen else citoyen_id
    message = Message.model_validate(
        payload,
        update={"expediteur_id": current_user.id, "destinataire_id": destinataire_id, "lu": False},
    )
    session.add(message)
    session.commit()
    session.refresh(message)
    return message


@router.get("/conversations", response_model=list[dict])
def list_conversations(
    *,
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    messages = session.exec(
        select(Message)
        .where((Message.expediteur_id == current_user.id) | (Message.destinataire_id == current_user.id))
        .order_by(Message.date.desc())
    ).all()
    conversations: dict[str, dict] = {}
    for message in messages:
        resume = conversations.get(message.conversation_id)
        if not resume:
            citoyen_id, _, structure_id = message.conversation_id.partition("__")
            citoyen = session.get(User, citoyen_id)
            structure = session.get(StructureCollecte, structure_id)
            resume = {
                "id": message.conversation_id,
                "citoyen_id": citoyen_id,
                "structure_id": structure_id,
                "citoyen_nom": citoyen.full_name if citoyen else "Citoyen",
                "citoyen_telephone": citoyen.telephone if citoyen else "",
                "structure_nom": structure.nom if structure else "Structure",
                "dernier_texte": message.texte,
                "dernier_auteur": str(message.expediteur_id),
                "date": message.date.isoformat(),
                "non_lus": 0,
            }
            conversations[message.conversation_id] = resume
        if message.destinataire_id == current_user.id and not message.lu:
            resume["non_lus"] += 1
    return list(conversations.values())


@router.get("/nonlus", response_model=dict)
def unread_messages_count(
    *,
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    if current_user.role == UserRole.ADMIN:
        return {"count": 0}
    count = session.exec(
        select(func.count())
        .select_from(Message)
        .where(Message.destinataire_id == current_user.id, Message.lu.is_(False))
    ).one()
    return {"count": count}
