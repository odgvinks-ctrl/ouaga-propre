from fastapi import APIRouter

router = APIRouter(
    prefix="/interventions",
    tags=["Interventions"]
)


@router.get("/")
def read_interventions():
    return {
        "message": "Module Interventions FASO NEERE"
    }