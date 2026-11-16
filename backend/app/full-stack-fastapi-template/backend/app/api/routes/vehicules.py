from fastapi import APIRouter

router = APIRouter(
    prefix="/vehicules",
    tags=["Vehicules"]
)

@router.get("/")
def read_vehicules():
    return {
        "message": "Module Vehicules FASO NEERE"
    }