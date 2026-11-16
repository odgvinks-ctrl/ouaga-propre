from fastapi import APIRouter

router = APIRouter(
    prefix="/abonnements",
    tags=["Abonnements"]
)

@router.get("/")
def read_abonnements():
    return {
        "message": "Module Abonnements FASO NEERE"
    }