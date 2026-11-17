from sqlmodel import Session, create_engine, select

from app import crud
from app.core.config import settings
from app.models import User, UserCreate, UserRole


def _accept_text_uuid_on_sqlite() -> None:
    import uuid

    from sqlalchemy.sql import sqltypes

    original = sqltypes.Uuid.bind_processor

    def bind_processor(self, dialect):  # type: ignore[no-untyped-def]
        process = original(self, dialect)
        if process is None:
            return None

        def convert(value):  # type: ignore[no-untyped-def]
            if isinstance(value, str):
                value = uuid.UUID(value)
            return process(value)

        return convert

    sqltypes.Uuid.bind_processor = bind_processor  # type: ignore[method-assign]


if settings.is_sqlite:
    _accept_text_uuid_on_sqlite()

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    connect_args={"check_same_thread": False} if settings.is_sqlite else {},
)


# make sure all SQLModel models are imported (app.models) before initializing DB
# otherwise, SQLModel might fail to initialize relationships properly
# for more details: https://github.com/fastapi/full-stack-fastapi-template/issues/28


def init_db(session: Session) -> None:
    # Tables should be created with Alembic migrations
    # But if you don't want to use migrations, create
    # the tables un-commenting the next lines
    # from sqlmodel import SQLModel

    # This works because the models are already imported and registered from app.models
    # SQLModel.metadata.create_all(engine)
    if settings.is_sqlite:
        from sqlmodel import SQLModel

        SQLModel.metadata.create_all(engine)

    user = session.exec(
        select(User).where(User.email == settings.FIRST_SUPERUSER)
    ).first()
    if not user:
        user_in = UserCreate(
            email=settings.FIRST_SUPERUSER,
            password=settings.FIRST_SUPERUSER_PASSWORD,
            is_superuser=True,
            role=UserRole.ADMIN,
        )
        user = crud.create_user(session=session, user_create=user_in)
    else:
        user.is_superuser = True
        user.role = UserRole.ADMIN
        session.add(user)
        session.commit()
        session.refresh(user)

    from app.demo_data import load_demo_data

    load_demo_data(session)
