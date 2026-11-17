from typing import Any

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep, get_accessible_structure
from app.models import (
	Intervention,
	InterventionCreate,
	InterventionPublic,
	InterventionsPublic,
	Signalement,
	StructureCollecte,
)

router = APIRouter(prefix="/interventions", tags=["Interventions"])


@router.post("/", response_model=InterventionPublic)
def create_intervention(
	*,
	session: SessionDep,
	current_user: CurrentUser,
	data: InterventionCreate,
) -> Any:
	signalement = session.get(Signalement, data.signalement_id)
	if not signalement:
		raise HTTPException(status_code=404, detail="Signalement introuvable.")

	structure = session.get(StructureCollecte, data.structure_id)
	if not structure or not structure.validated:
		raise HTTPException(status_code=404, detail="Structure introuvable ou non validée.")
	get_accessible_structure(session, current_user, str(structure.id))

	if signalement.structure_id != data.structure_id:
		raise HTTPException(status_code=400, detail="Le signalement n'est pas affecté à cette structure.")

	intervention = Intervention.model_validate(data)
	session.add(intervention)
	session.commit()
	session.refresh(intervention)
	return intervention


@router.get("/structure/{structure_id}", response_model=InterventionsPublic)
def list_interventions(
	*,
	session: SessionDep,
	current_user: CurrentUser,
	structure_id: str,
	skip: int = Query(default=0, ge=0),
	limit: int = Query(default=50, ge=1, le=100),
) -> Any:
	get_accessible_structure(session, current_user, structure_id)

	statement = (
		select(Intervention)
		.where(Intervention.structure_id == structure_id)
		.order_by(Intervention.created_at.desc())
		.offset(skip)
		.limit(limit)
	)
	items = session.exec(statement).all()
	count = session.exec(
		select(func.count()).select_from(Intervention).where(Intervention.structure_id == structure_id)
	).one()
	return InterventionsPublic(data=list(items), count=count)


@router.patch("/{intervention_id}/statut")
def update_intervention_status(
	*,
	session: SessionDep,
	current_user: CurrentUser,
	intervention_id: str,
	statut: str,
) -> Any:
	intervention = session.get(Intervention, intervention_id)
	if not intervention:
		raise HTTPException(status_code=404, detail="Intervention introuvable.")
	get_accessible_structure(session, current_user, str(intervention.structure_id))

	intervention.statut = statut
	session.add(intervention)
	session.commit()
	session.refresh(intervention)
	return intervention
