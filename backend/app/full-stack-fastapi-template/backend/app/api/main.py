from fastapi import APIRouter

from app.api.routes import (
    abonnements,
    collectes,
    equipes,
    interventions,
    login,
    messages,
    notifications,
    photos,
    private,
    signalements,
    simulation,
    structures,
    users,
    utils,
    vehicules,
)
from app.core.config import settings

api_router = APIRouter()

api_router.include_router(login.router)
api_router.include_router(users.router)
api_router.include_router(utils.router)
api_router.include_router(signalements.router)
api_router.include_router(interventions.router)
api_router.include_router(abonnements.router)
api_router.include_router(collectes.router)
api_router.include_router(vehicules.router)
api_router.include_router(equipes.router)
api_router.include_router(notifications.router)
api_router.include_router(messages.router)
api_router.include_router(photos.router)

# Nouveau module
api_router.include_router(structures.router)
api_router.include_router(simulation.router)

if settings.FASTAPI_ENV == "development":
    api_router.include_router(private.router)
