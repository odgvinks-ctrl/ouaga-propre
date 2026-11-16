from fastapi import APIRouter

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"]
)

@router.get("/")
def read_notifications():
    return {
        "message": "Module Notifications FASO NEERE"
    }