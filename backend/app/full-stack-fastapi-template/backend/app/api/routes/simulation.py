from typing import Any

from fastapi import APIRouter, Depends
from fastapi.concurrency import run_in_threadpool

from app.api.deps import get_current_active_superuser
from app.simulation.modele import simuler
from app.simulation.parametres import FICHIER, valeurs_formulaire

router = APIRouter(
    prefix="/simulation",
    tags=["Simulation"],
    dependencies=[Depends(get_current_active_superuser)],
)


@router.get("/parametres")
def read_parameters() -> dict[str, Any]:
    return {"valeurs": valeurs_formulaire(), "fichier": FICHIER.read_text(encoding="utf-8")}


@router.post("/")
async def run_simulation(changements: dict[str, Any] | None = None) -> dict[str, Any]:
    return await run_in_threadpool(simuler, changements or {})
