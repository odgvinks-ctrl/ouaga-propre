import uuid
from datetime import datetime
from enum import StrEnum
from typing import Literal

from sqlmodel import Field, SQLModel

from .common import get_datetime_utc


class RoleAgentBrigade(StrEnum):
    SENSIBILISATION = "sensibilisation"
    SANCTION = "sanction"
    CHEF = "chef"


class AgentBrigadeBase(SQLModel):
    nom: str = Field(min_length=1, max_length=150)
    telephone: str = Field(min_length=1, max_length=20)
    role: RoleAgentBrigade
    quartier: str = Field(min_length=1, max_length=120)
    actif: bool = True


class AgentBrigadeCreate(SQLModel):
    nom: str = Field(min_length=1, max_length=150)
    telephone: str = Field(min_length=1, max_length=20)
    role: RoleAgentBrigade
    quartier: str = Field(min_length=1, max_length=120)


class AgentBrigadeUpdate(SQLModel):
    role: RoleAgentBrigade | None = None
    actif: bool | None = None


class AgentBrigade(AgentBrigadeBase, table=True):
    __tablename__ = "agent_brigade"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    telephone: str = Field(max_length=20, unique=True, index=True)
    created_at: datetime = Field(default_factory=get_datetime_utc)


class AgentsBrigadePublic(SQLModel):
    data: list[AgentBrigade]
    count: int


class TypeTacheBrigade(StrEnum):
    SENSIBILISATION = "sensibilisation"
    SANCTION = "sanction"


class StatutTacheBrigade(StrEnum):
    A_FAIRE = "a_faire"
    EN_COURS = "en_cours"
    TERMINEE = "terminee"
    ANNULLEE = "annulee"


class TacheBrigadeCreate(SQLModel):
    type: TypeTacheBrigade
    quartier: str = Field(min_length=1, max_length=120)
    lieu: str = Field(min_length=1, max_length=255)
    consignes: str = Field(default="", max_length=2000)
    date_prevue: datetime
    agent_ids: list[uuid.UUID] = Field(min_length=1)
    signalement_id: uuid.UUID | None = None


class TacheBrigade(SQLModel, table=True):
    __tablename__ = "tache_brigade"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    type: TypeTacheBrigade
    quartier: str = Field(max_length=120)
    lieu: str = Field(max_length=255)
    consignes: str = Field(default="", max_length=2000)
    date_prevue: datetime
    signalement_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="signalement.id",
        ondelete="SET NULL",
    )
    statut: StatutTacheBrigade = StatutTacheBrigade.A_FAIRE
    created_at: datetime = Field(default_factory=get_datetime_utc)
    terminee_le: datetime | None = None


class TacheBrigadeAgent(SQLModel, table=True):
    __tablename__ = "tache_brigade_agent"

    tache_id: uuid.UUID = Field(
        foreign_key="tache_brigade.id",
        primary_key=True,
        ondelete="CASCADE",
    )
    agent_id: uuid.UUID = Field(
        foreign_key="agent_brigade.id",
        primary_key=True,
        ondelete="CASCADE",
    )


class TacheBrigadePublic(SQLModel):
    id: uuid.UUID
    type: TypeTacheBrigade
    quartier: str
    lieu: str
    consignes: str
    date_prevue: datetime
    signalement_id: uuid.UUID | None = None
    statut: StatutTacheBrigade
    created_at: datetime
    terminee_le: datetime | None = None
    agent_ids: list[uuid.UUID] = []


class TachesBrigadePublic(SQLModel):
    data: list[TacheBrigadePublic]
    count: int


class TacheBrigadeStatutUpdate(SQLModel):
    statut: Literal["en_cours", "terminee", "annulee"]


class TypeSanctionBrigade(StrEnum):
    AVERTISSEMENT = "avertissement"
    AMENDE = "amende"


class InfractionBrigade(StrEnum):
    DEPOT_SAUVAGE = "depot_sauvage"
    CANIVEAU = "caniveau"
    BRULAGE = "brulage"
    RECIDIVE = "recidive"


class StatutSanctionBrigade(StrEnum):
    A_PAYER = "a_payer"
    AVERTIE = "avertie"
    PAYEE = "payee"
    CONTESTEE = "contestee"
    ANNULLEE = "annulee"


class SanctionBrigadeCreate(SQLModel):
    type: TypeSanctionBrigade
    infraction: InfractionBrigade
    montant: int = Field(ge=0)
    contrevenant: str = Field(min_length=1, max_length=150)
    telephone: str = Field(default="", max_length=20)
    quartier: str = Field(min_length=1, max_length=120)
    lieu: str = Field(min_length=1, max_length=255)
    agent_id: uuid.UUID
    signalement_id: uuid.UUID | None = None


class SanctionBrigade(SQLModel, table=True):
    __tablename__ = "sanction_brigade"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    type: TypeSanctionBrigade
    infraction: InfractionBrigade
    montant: int = Field(ge=0)
    contrevenant: str = Field(max_length=150)
    telephone: str = Field(default="", max_length=20)
    quartier: str = Field(max_length=120)
    lieu: str = Field(max_length=255)
    agent_id: uuid.UUID = Field(foreign_key="agent_brigade.id", ondelete="RESTRICT")
    signalement_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="signalement.id",
        ondelete="SET NULL",
    )
    statut: StatutSanctionBrigade
    created_at: datetime = Field(default_factory=get_datetime_utc)


class SanctionBrigadeStatutUpdate(SQLModel):
    statut: Literal["payee", "contestee", "annulee"]


class SanctionsBrigadePublic(SQLModel):
    data: list[SanctionBrigade]
    count: int
