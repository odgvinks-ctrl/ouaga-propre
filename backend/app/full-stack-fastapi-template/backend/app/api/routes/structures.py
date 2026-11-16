from fastapi import APIRouter

router = APIRouter(
    prefix="/structures",
    tags=["Structures"]
)

@router.get("/")
def read_structures():
    return {
        "message": "Module Structures FASO NEERE"
    }