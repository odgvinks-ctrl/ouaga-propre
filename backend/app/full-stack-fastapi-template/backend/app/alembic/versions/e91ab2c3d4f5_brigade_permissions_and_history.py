"""permissions and audit history for Brigade Laabal

Revision ID: e91ab2c3d4f5
Revises: d7a3b9c2e5f1
Create Date: 2026-11-17
"""

import uuid

import sqlalchemy as sa
from alembic import context, op

revision = "e91ab2c3d4f5"
down_revision = "d7a3b9c2e5f1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'BRIGADE'")

    with op.batch_alter_table("tache_brigade") as batch:
        batch.add_column(sa.Column("created_by", sa.Uuid(), nullable=True))
        batch.create_foreign_key(
            "fk_tache_brigade_created_by_user",
            "user",
            ["created_by"],
            ["id"],
            ondelete="SET NULL",
        )
        batch.create_check_constraint(
            "ck_tache_brigade_coordinate_pair",
            "(latitude IS NULL AND longitude IS NULL) OR "
            "(latitude IS NOT NULL AND longitude IS NOT NULL)",
        )
    op.create_table(
        "tache_brigade_historique",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("tache_id", sa.Uuid(), nullable=False),
        sa.Column("action", sa.String(length=30), nullable=False),
        sa.Column("ancien_statut", sa.String(length=20), nullable=True),
        sa.Column("nouveau_statut", sa.String(length=20), nullable=True),
        sa.Column("ancienne_latitude", sa.Float(), nullable=True),
        sa.Column("ancienne_longitude", sa.Float(), nullable=True),
        sa.Column("nouvelle_latitude", sa.Float(), nullable=True),
        sa.Column("nouvelle_longitude", sa.Float(), nullable=True),
        sa.Column("motif", sa.String(length=500), nullable=True),
        sa.Column("auteur_id", sa.Uuid(), nullable=True),
        sa.Column("auteur_nom", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["auteur_id"],
            ["user.id"],
            name="fk_tache_brigade_historique_auteur_id_user",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["tache_id"],
            ["tache_brigade.id"],
            name="fk_tache_brigade_historique_tache_id_tache_brigade",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_tache_brigade_historique_tache_id",
        "tache_brigade_historique",
        ["tache_id"],
    )

    if not context.is_offline_mode():
        tasks = bind.execute(
            sa.text(
                "SELECT id, statut, latitude, longitude, created_at "
                "FROM tache_brigade"
            )
        ).mappings()
        for task in tasks:
            bind.execute(
                sa.text(
                    "INSERT INTO tache_brigade_historique "
                    "(id, tache_id, action, nouveau_statut, nouvelle_latitude, "
                    "nouvelle_longitude, auteur_nom, created_at) "
                    "VALUES (:id, :tache_id, 'legacy', :statut, :latitude, "
                    ":longitude, 'Auteur non enregistré dans les anciennes données', "
                    ":created_at)"
                ),
                {
                    "id": str(uuid.uuid4()),
                    "tache_id": str(task["id"]),
                    "statut": task["statut"],
                    "latitude": task["latitude"],
                    "longitude": task["longitude"],
                    "created_at": task["created_at"],
                },
            )


def downgrade() -> None:
    op.drop_index(
        "ix_tache_brigade_historique_tache_id",
        table_name="tache_brigade_historique",
    )
    op.drop_table("tache_brigade_historique")
    with op.batch_alter_table("tache_brigade") as batch:
        batch.drop_constraint("ck_tache_brigade_coordinate_pair", type_="check")
        batch.drop_constraint("fk_tache_brigade_created_by_user", type_="foreignkey")
        batch.drop_column("created_by")
