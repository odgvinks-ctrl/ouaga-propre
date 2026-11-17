"""tables brigade laabal

Revision ID: c4e2f8a1b7d3
Revises: f31c8d6a4b20
Create Date: 2026-11-17
"""

import sqlalchemy as sa
import sqlmodel
from alembic import op


revision = "c4e2f8a1b7d3"
down_revision = "f31c8d6a4b20"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "agent_brigade",
        sa.Column("nom", sqlmodel.sql.sqltypes.AutoString(length=150), nullable=False),
        sa.Column("telephone", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
        sa.Column("role", sa.Enum("sensibilisation", "sanction", "chef", name="roleagentbrigade"), nullable=False),
        sa.Column("quartier", sqlmodel.sql.sqltypes.AutoString(length=120), nullable=False),
        sa.Column("actif", sa.Boolean(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sqlmodel.sql.sqltypes.UTCDateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_agent_brigade_telephone"), "agent_brigade", ["telephone"], unique=True)

    op.create_table(
        "tache_brigade",
        sa.Column("type", sa.Enum("sensibilisation", "sanction", name="typetachebrigade"), nullable=False),
        sa.Column("quartier", sqlmodel.sql.sqltypes.AutoString(length=120), nullable=False),
        sa.Column("lieu", sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column("consignes", sqlmodel.sql.sqltypes.AutoString(length=2000), nullable=False),
        sa.Column("date_prevue", sqlmodel.sql.sqltypes.UTCDateTime(), nullable=False),
        sa.Column("signalement_id", sa.Uuid(), nullable=True),
        sa.Column("statut", sa.Enum("a_faire", "en_cours", "terminee", "annulee", name="statuttachebrigade"), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sqlmodel.sql.sqltypes.UTCDateTime(), nullable=False),
        sa.Column("terminee_le", sqlmodel.sql.sqltypes.UTCDateTime(), nullable=True),
        sa.ForeignKeyConstraint(["signalement_id"], ["signalement.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "tache_brigade_agent",
        sa.Column("tache_id", sa.Uuid(), nullable=False),
        sa.Column("agent_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(["agent_id"], ["agent_brigade.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tache_id"], ["tache_brigade.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("tache_id", "agent_id"),
    )
    op.create_table(
        "sanction_brigade",
        sa.Column("type", sa.Enum("avertissement", "amende", name="typesanctionbrigade"), nullable=False),
        sa.Column("infraction", sa.Enum("depot_sauvage", "caniveau", "brulage", "recidive", name="infractionbrigade"), nullable=False),
        sa.Column("montant", sa.Integer(), nullable=False),
        sa.Column("contrevenant", sqlmodel.sql.sqltypes.AutoString(length=150), nullable=False),
        sa.Column("telephone", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
        sa.Column("quartier", sqlmodel.sql.sqltypes.AutoString(length=120), nullable=False),
        sa.Column("lieu", sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column("agent_id", sa.Uuid(), nullable=False),
        sa.Column("signalement_id", sa.Uuid(), nullable=True),
        sa.Column("statut", sa.Enum("a_payer", "avertie", "payee", "contestee", "annulee", name="statutsanctionbrigade"), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sqlmodel.sql.sqltypes.UTCDateTime(), nullable=False),
        sa.ForeignKeyConstraint(["agent_id"], ["agent_brigade.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["signalement_id"], ["signalement.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("sanction_brigade")
    op.drop_table("tache_brigade_agent")
    op.drop_table("tache_brigade")
    op.drop_index(op.f("ix_agent_brigade_telephone"), table_name="agent_brigade")
    op.drop_table("agent_brigade")
