"""Position des tâches de la brigade Laabal

Revision ID: d7a3b9c2e5f1
Revises: c4e2f8a1b7d3
Create Date: 2026-11-17 22:00:00

"""
import sqlalchemy as sa
from alembic import op

revision = "d7a3b9c2e5f1"
down_revision = "c4e2f8a1b7d3"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("tache_brigade", sa.Column("latitude", sa.Float(), nullable=True))
    op.add_column("tache_brigade", sa.Column("longitude", sa.Float(), nullable=True))


def downgrade():
    op.drop_column("tache_brigade", "longitude")
    op.drop_column("tache_brigade", "latitude")
