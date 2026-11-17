from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.api.routes import photos
from app.main import app


@pytest.fixture
def photo_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    monkeypatch.setattr(photos.settings, "PHOTO_STORAGE_DIR", tmp_path)
    monkeypatch.setattr(photos.settings, "PHOTO_MAX_SIZE_BYTES", 3 * 1024 * 1024)
    return tmp_path


@pytest.fixture
def client() -> Generator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


def test_upload_and_read_jpeg(client: TestClient, photo_dir: Path) -> None:
    content = b"\xff\xd8\xff" + b"demo-jpeg"
    response = client.post(
        "/api/v1/photos/",
        files={"fichier": ("photo.jpg", content, "image/jpeg")},
    )

    assert response.status_code == 200
    photo_url = response.json()["url"]
    assert photo_url.startswith("/api/v1/photos/")
    filename = photo_url.rsplit("/", 1)[-1]
    assert (photo_dir / filename).read_bytes() == content

    read_response = client.get(photo_url)
    assert read_response.status_code == 200
    assert read_response.content == content
    assert read_response.headers["content-type"] == "image/jpeg"


def test_upload_rejects_unsupported_content_type(client: TestClient) -> None:
    response = client.post(
        "/api/v1/photos/",
        files={"fichier": ("photo.gif", b"GIF89a", "image/gif")},
    )

    assert response.status_code == 415


def test_upload_rejects_mime_content_mismatch(client: TestClient) -> None:
    response = client.post(
        "/api/v1/photos/",
        files={"fichier": ("photo.jpg", b"not-an-image", "image/jpeg")},
    )

    assert response.status_code == 415


def test_upload_rejects_files_over_limit(
    client: TestClient,
    photo_dir: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(photos.settings, "PHOTO_MAX_SIZE_BYTES", 8)
    response = client.post(
        "/api/v1/photos/",
        files={"fichier": ("photo.jpg", b"\xff\xd8\xff" + b"0123456789", "image/jpeg")},
    )

    assert response.status_code == 413
    assert list(photo_dir.iterdir()) == []


def test_read_rejects_path_traversal(client: TestClient) -> None:
    response = client.get("/api/v1/photos/..%2Fsecret.jpg")

    assert response.status_code in {404, 422}
