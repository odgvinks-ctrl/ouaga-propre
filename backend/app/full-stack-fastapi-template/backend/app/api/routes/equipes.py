from fastapi import APIRouter

router = APIRouter(
    prefix="/equipes",
    tags=["Equipes"]
)

@router.get("/")
def read_equipes():
    return {
        "message": "Module Equipes Collection FASO NEREE"
    }