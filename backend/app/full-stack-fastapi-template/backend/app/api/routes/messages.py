from fastapi import APIRouter

router = APIRouter(
    prefix="/messages",
    tags=["Messages"]
)

@router.get("/")
def read_messages():
    return {
        "message": "Module Messagerie FASO NEERE"
    }