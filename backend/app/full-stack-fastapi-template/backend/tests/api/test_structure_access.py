import uuid

import pytest
from fastapi import HTTPException
from sqlmodel import Session, SQLModel, create_engine

from app.api.deps import get_accessible_structure
from app.models import StructureCollecte, User, UserRole


@pytest.fixture
def session():
    engine = create_engine("sqlite://")
    SQLModel.metadata.create_all(engine)
    with Session(engine) as db:
        yield db
    engine.dispose()


def test_structure_access_allows_owner(session: Session) -> None:
    owner = User(hashed_password="hashed", role=UserRole.STRUCTURE)
    session.add(owner)
    session.commit()
    structure = StructureCollecte(
        nom="Collecte locale",
        responsable="Awa",
        telephone="70000000",
        adresse="Ouagadougou",
        zones_intervention="Centre",
        owner_id=owner.id,
    )
    session.add(structure)
    session.commit()

    assert get_accessible_structure(session, owner, structure.id).id == structure.id


def test_structure_access_denies_other_structure_owner(session: Session) -> None:
    owner = User(hashed_password="hashed", role=UserRole.STRUCTURE)
    other_owner = User(hashed_password="hashed", role=UserRole.STRUCTURE)
    session.add(owner)
    session.add(other_owner)
    session.commit()
    structure = StructureCollecte(
        nom="Collecte locale",
        responsable="Awa",
        telephone="70000000",
        adresse="Ouagadougou",
        zones_intervention="Centre",
        owner_id=other_owner.id,
    )
    session.add(structure)
    session.commit()

    with pytest.raises(HTTPException) as error:
        get_accessible_structure(session, owner, structure.id)

    assert error.value.status_code == 403


def test_structure_access_allows_admin(session: Session) -> None:
    admin = User(
        hashed_password="hashed",
        role=UserRole.ADMIN,
        is_superuser=True,
    )
    owner = User(hashed_password="hashed", role=UserRole.STRUCTURE)
    session.add(admin)
    session.add(owner)
    session.commit()
    structure = StructureCollecte(
        nom="Collecte locale",
        responsable="Awa",
        telephone="70000000",
        adresse="Ouagadougou",
        zones_intervention="Centre",
        owner_id=owner.id,
    )
    session.add(structure)
    session.commit()

    assert get_accessible_structure(session, admin, structure.id).id == structure.id


def test_structure_access_returns_not_found_for_unknown_id(session: Session) -> None:
    owner = User(hashed_password="hashed", role=UserRole.STRUCTURE)
    session.add(owner)
    session.commit()

    with pytest.raises(HTTPException) as error:
        get_accessible_structure(session, owner, uuid.uuid4())

    assert error.value.status_code == 404
