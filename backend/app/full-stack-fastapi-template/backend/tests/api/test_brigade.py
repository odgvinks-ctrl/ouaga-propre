import uuid
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.main import app
from app.models import Signalement, User, UserRole


@pytest.fixture
def api_client(client: TestClient, db: Session) -> Generator[TestClient]:
    def override_db() -> Generator[Session]:
        yield db

    app.dependency_overrides[get_db] = override_db
    yield client
    app.dependency_overrides.clear()


def acteur(role: UserRole) -> User:
    return User(
        id=uuid.uuid4(),
        hashed_password="unused",
        full_name=f"Compte {role.value}",
        role=role,
        is_active=True,
    )


def corps_tache(**overrides: object) -> dict:
    return {
        "type": "sensibilisation",
        "quartier": "Paspanga",
        "lieu": "Place centrale",
        "consignes": "Vérifier le lieu",
        "date_prevue": "2026-11-18T07:00:00Z",
        **overrides,
    }


def authentifier(actor: User) -> None:
    app.dependency_overrides[get_current_user] = lambda: actor


def test_gps_coordinates_validation_and_bounds(
    api_client: TestClient,
    db: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "BRIGADE_GEO_BOUNDS", [-1.6, 12.2, -1.4, 12.5])
    mairie = acteur(UserRole.ADMIN)
    db.add(mairie)
    db.commit()
    authentifier(mairie)

    valid = api_client.post(
        "/api/v1/brigade/taches",
        json=corps_tache(latitude=12.37, longitude=-1.52),
    )
    assert valid.status_code == 200

    incomplete = api_client.post(
        "/api/v1/brigade/taches",
        json=corps_tache(latitude=12.37),
    )
    assert incomplete.status_code == 422

    outside = api_client.post(
        "/api/v1/brigade/taches",
        json=corps_tache(latitude=13.0, longitude=-1.52),
    )
    assert outside.status_code == 422
    monkeypatch.setattr(settings, "BRIGADE_GEO_BOUNDS", None)
    unconfigured = api_client.post(
        "/api/v1/brigade/taches",
        json=corps_tache(latitude=12.37, longitude=-1.52),
    )
    assert unconfigured.status_code == 503


def test_missing_signalement_is_rejected_and_position_is_inherited(
    api_client: TestClient,
    db: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "BRIGADE_GEO_BOUNDS", [-1.6, 12.2, -1.4, 12.5])
    mairie = acteur(UserRole.ADMIN)
    db.add(mairie)
    db.commit()
    authentifier(mairie)
    missing_id = uuid.uuid4()
    missing = api_client.post(
        "/api/v1/brigade/taches",
        json=corps_tache(signalement_id=str(missing_id)),
    )
    assert missing.status_code == 404

    report = Signalement(
        type_signalement="Depot sauvage",
        description="Signalement de test",
        latitude=12.36,
        longitude=-1.51,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    inherited = api_client.post(
        "/api/v1/brigade/taches",
        json=corps_tache(signalement_id=str(report.id)),
    )
    assert inherited.status_code == 200
    assert inherited.json()["latitude"] == pytest.approx(12.36)
    assert inherited.json()["longitude"] == pytest.approx(-1.51)


def test_permissions_status_transitions_and_audit(
    api_client: TestClient,
    db: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "BRIGADE_GEO_BOUNDS", [-1.6, 12.2, -1.4, 12.5])
    mairie = acteur(UserRole.ADMIN)
    brigade = acteur(UserRole.BRIGADE)
    db.add(mairie)
    db.add(brigade)
    db.commit()
    authentifier(mairie)
    created = api_client.post(
        "/api/v1/brigade/taches",
        json=corps_tache(latitude=12.37, longitude=-1.52),
    )
    assert created.status_code == 200
    task_id = created.json()["id"]

    assert api_client.get("/api/v1/brigade/agents").status_code == 403
    assert api_client.patch(
        f"/api/v1/brigade/taches/{task_id}/statut",
        json={"statut": "en_cours"},
    ).status_code == 403
    assert api_client.post(
        "/api/v1/brigade/agents",
        json={"nom": "Agent test", "telephone": "70000001", "role": "sensibilisation", "quartier": "Paspanga"},
    ).status_code == 403

    authentifier(brigade)
    agent = api_client.post(
        "/api/v1/brigade/agents",
        json={"nom": "Agent test", "telephone": "70000001", "role": "sensibilisation", "quartier": "Paspanga"},
    )
    assert agent.status_code == 200
    assigned = api_client.put(
        f"/api/v1/brigade/taches/{task_id}/agents",
        json={"agent_ids": [agent.json()["id"]]},
    )
    assert assigned.status_code == 200
    assert assigned.json()["agent_ids"] == [agent.json()["id"]]
    started = api_client.patch(
        f"/api/v1/brigade/taches/{task_id}/statut",
        json={"statut": "en_cours"},
    )
    assert started.status_code == 200
    finished = api_client.patch(
        f"/api/v1/brigade/taches/{task_id}/statut",
        json={"statut": "terminee"},
    )
    assert finished.status_code == 200
    invalid_transition = api_client.patch(
        f"/api/v1/brigade/taches/{task_id}/statut",
        json={"statut": "en_cours"},
    )
    assert invalid_transition.status_code == 409

    corrected = api_client.patch(
        f"/api/v1/brigade/taches/{task_id}/position",
        json={"latitude": 12.38, "longitude": -1.53, "motif": "Point GPS vérifié"},
    )
    assert corrected.status_code == 200
    history = api_client.get(f"/api/v1/brigade/taches/{task_id}/historique")
    assert history.status_code == 200
    actions = [event["action"] for event in history.json()]
    assert actions == ["creation", "statut", "statut", "correction_position"]
    assert history.json()[-1]["ancienne_latitude"] == pytest.approx(12.37)
    assert history.json()[-1]["nouvelle_latitude"] == pytest.approx(12.38)
    assert history.json()[0]["auteur_id"] == str(mairie.id)
    assert history.json()[0]["created_at"]


def test_whatsapp_and_maps_links_require_configuration(
    api_client: TestClient,
    db: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "BRIGADE_GEO_BOUNDS", [-1.6, 12.2, -1.4, 12.5])
    monkeypatch.setattr(settings, "BRIGADE_WHATSAPP_NUMBER", "22670000000")
    mairie = acteur(UserRole.ADMIN)
    db.add(mairie)
    db.commit()
    authentifier(mairie)
    created = api_client.post(
        "/api/v1/brigade/taches",
        json=corps_tache(latitude=12.37, longitude=-1.52),
    )
    links = api_client.get(f"/api/v1/brigade/taches/{created.json()['id']}/partage")
    assert links.status_code == 200
    payload = links.json()
    assert payload["whatsapp_url"].startswith("https://wa.me/22670000000?text=")
    assert payload["maps_url"].endswith("destination=12.37,-1.52")
    assert "sensibilisation" in payload["message"]
    assert "Paspanga" in payload["message"]
    assert "Place centrale" in payload["message"]
    assert "Vérifier le lieu" in payload["message"]
    assert "2026-11-18" in payload["message"]
    assert payload["message_sent"] is False
