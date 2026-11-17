"""Add photo metadata and proof URLs

Revision ID: f31c8d6a4b20
Revises: 00aff2046a69
Create Date: 2026-11-17 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "f31c8d6a4b20"
down_revision = "00aff2046a69"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "signalement",
        sa.Column("photo_empreinte", sa.String(length=16), nullable=True),
    )
    op.add_column(
        "signalement",
        sa.Column("photo_floutee", sa.Boolean(), server_default=sa.false(), nullable=False),
    )
    op.add_column(
        "signalement",
        sa.Column("photo_apres_url", sa.String(length=2048), nullable=True),
    )
    op.add_column(
        "collecte",
        sa.Column("photo_preuve_url", sa.String(length=2048), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("collecte", "photo_preuve_url")
    op.drop_column("signalement", "photo_apres_url")
    op.drop_column("signalement", "photo_floutee")
    op.drop_column("signalement", "photo_empreinte")
