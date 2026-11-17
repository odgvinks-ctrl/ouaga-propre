import os
from collections.abc import Generator

os.environ["LOAD_DEMO_DATA"] = "false"
os.environ["FASTAPI_ENV"] = "development"

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, select

from app import crud
from app.core.config import settings
from app.core.db import engine, init_db
from app.core.security import get_password_hash
from app.main import app
from app.models import User, UserCreate, UserRole
from tests.utils.utils import get_superuser_token_headers


@pytest.fixture(scope="session", autouse=True)
def db() -> Generator[Session]:
    with Session(engine) as session:
        for table in reversed(SQLModel.metadata.sorted_tables):
            session.execute(table.delete())
        session.commit()
        init_db(session)
        yield session
        session.rollback()
        for table in reversed(SQLModel.metadata.sorted_tables):
            session.execute(table.delete())
        session.commit()


@pytest.fixture(scope="module")
def client() -> Generator[TestClient]:
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def superuser_token_headers(
    client: TestClient,
    db: Session,
) -> dict[str, str]:
    superuser = db.exec(
        select(User).where(User.email == settings.FIRST_SUPERUSER)
    ).first()
    if superuser:
        superuser.hashed_password = get_password_hash(settings.FIRST_SUPERUSER_PASSWORD)
        superuser.is_active = True
        superuser.is_superuser = True
        superuser.role = UserRole.ADMIN
        db.add(superuser)
        db.commit()
    return get_superuser_token_headers(client)


@pytest.fixture(scope="module")
def normal_user_token_headers(client: TestClient, db: Session) -> dict[str, str]:
    normal_user = db.exec(
        select(User).where(User.email == settings.EMAIL_TEST_USER)
    ).first()
    password = "normal-user-password"
    if normal_user is None:
        normal_user = crud.create_user(
            session=db,
            user_create=UserCreate(
                email=settings.EMAIL_TEST_USER,
                full_name="Test User",
                password=password,
                is_active=True,
                is_superuser=False,
                role=UserRole.CITOYEN,
            ),
        )
    else:
        normal_user.hashed_password = get_password_hash(password)
        normal_user.is_superuser = False
        normal_user.role = UserRole.CITOYEN
        normal_user.is_active = True
        db.add(normal_user)
        db.commit()
    response = client.post(
        f"{settings.API_V1_STR}/login/access-token",
        data={"username": settings.EMAIL_TEST_USER, "password": password},
    )
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    return headers
