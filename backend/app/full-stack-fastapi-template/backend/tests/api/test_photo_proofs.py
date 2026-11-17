import uuid
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from app.api.deps import get_current_user, get_db
from app.main import app
from app.models import (
    Collecte,
    Signalement,
    StatutSignalement,
    StructureCollecte,
    User,
    UserRole,
)


@pytest.fixture
def proof_api():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        owner = User(telephone="70000001", hashed_password="not-used", role=UserRole.STRUCTURE)
        citizen = User(telephone="70000002", hashed_password="not-used", role=UserRole.CITOYEN)
        session.add(owner)
        session.add(citizen)
        session.commit()
        session.refresh(owner)
        session.refresh(citizen)

        structure = StructureCollecte(
            nom="Structure test",
            responsable="Responsable test",
            telephone="70000001",
            adresse="Ouagadougou",
            zones_intervention="Paspanga",
            owner_id=owner.id,
            validated=True,
        )
        session.add(structure)
        session.commit()
        session.refresh(structure)

        signalement = Signalement(
            type_signalement="DEPOTOIR_SAUVAGE",
            description="Signalement test",
            latitude=12.37,
            longitude=-1.52,
            statut=StatutSignalement.EN_COURS,
            structure_id=structure.id,
        )
        collecte = Collecte(
            abonnement_id=uuid.uuid4(),
            citoyen_id=citizen.id,
            structure_id=structure.id,
            volume="moyen",
            statut="planifiee",
        )
        session.add(signalement)
        session.add(collecte)
        session.commit()
        session.refresh(signalement)
        session.refresh(collecte)

        def override_db() -> Generator[Session]:
            yield session

        app.dependency_overrides[get_db] = override_db
        app.dependency_overrides[get_current_user] = lambda: owner
        try:
            with TestClient(app) as client:
                yield client, session, signalement, collecte, owner
        finally:
            app.dependency_overrides.clear()
    engine.dispose()


def test_signalement_cleaning_requires_and_saves_proof(proof_api) -> None:
    client, session, signalement, _, _ = proof_api
    url = f"/api/v1/signalements/{signalement.id}/structure-statut"

    missing = client.patch(url, json={"statut": "nettoye"})
    assert missing.status_code == 400
    session.refresh(signalement)
    assert signalement.statut == StatutSignalement.EN_COURS

    success = client.patch(
        url,
        json={"statut": "nettoye", "photo_apres_url": "/api/v1/photos/after.jpg"},
    )
    assert success.status_code == 200
    assert success.json()["photo_apres_url"] == "/api/v1/photos/after.jpg"
    session.refresh(signalement)
    assert signalement.statut == StatutSignalement.RESOLU


def test_collecte_completion_requires_and_saves_proof(proof_api) -> None:
    client, session, _, collecte, _ = proof_api
    url = f"/api/v1/collectes/{collecte.id}/terminer"

    missing = client.patch(url)
    assert missing.status_code == 400
    session.refresh(collecte)
    assert collecte.statut == "planifiee"

    success = client.patch(url, json={"photo_preuve_url": "/api/v1/photos/proof.jpg"})
    assert success.status_code == 200
    assert success.json()["photo_preuve_url"] == "/api/v1/photos/proof.jpg"
    session.refresh(collecte)
    assert collecte.statut == "faite"
