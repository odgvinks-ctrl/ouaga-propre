from fastapi import APIRouter

router = APIRouter(
    prefix="/collectes",
    tags=["Collectes"]
)


@router.get("/")
def read_collectes():
    return {
        "message": "Module Collectes FASO NEREE"
    }