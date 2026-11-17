FROM python:3.14-slim

ENV PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PATH="/app/.venv/bin:$PATH" \
    DEMO_DATA_FILE=/app/data/reference/jeu_demo_faso_neere.json

RUN pip install --no-cache-dir uv

WORKDIR /app

COPY backend/app/full-stack-fastapi-template/pyproject.toml backend/app/full-stack-fastapi-template/uv.lock ./
COPY backend/app/full-stack-fastapi-template/backend/pyproject.toml backend/app/full-stack-fastapi-template/backend/alembic.ini backend/app/full-stack-fastapi-template/backend/README.md ./backend/

RUN uv sync --frozen --no-dev --no-install-workspace --package app

COPY backend/app/full-stack-fastapi-template/backend/app ./backend/app
COPY data/reference ./data/reference

RUN uv sync --frozen --no-dev --package app

WORKDIR /app/backend

EXPOSE 8000

CMD ["sh", "-c", "python app/initial_data.py && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"]
