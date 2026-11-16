import uuid
from enum import Enum
from datetime import UTC, datetime

from pydantic import EmailStr
from sqlmodel import Field, Relationship, SQLModel


def get_datetime_utc() -> datetime:
    return datetime.now(UTC)


# Shared properties
class UserRole(str, Enum):
    ADMIN = "ADMIN"
    CITOYEN = "CITOYEN"
    STRUCTURE = "STRUCTURE"


class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)

    role: UserRole = Field(default=UserRole.CITOYEN)


# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserRegister(SQLModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on update, all are optional
class UserUpdate(SQLModel):
    email: EmailStr | None = Field(default=None, max_length=255)
    is_active: bool | None = None
    is_superuser: bool | None = None
    full_name: str | None = Field(default=None, max_length=255)
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


# Database model, database table inferred from class name
class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    created_at: datetime | None = Field(default_factory=get_datetime_utc)
    items: list["Item"] = Relationship(
    back_populates="owner",
    cascade_delete=True
)


# Properties to return via API, id is always required
class UserPublic(UserBase):
    id: uuid.UUID
    created_at: datetime | None = None


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int


# Shared properties
class ItemBase(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)


# Properties to receive on item creation
class ItemCreate(ItemBase):
    pass


# Properties to receive on item update
class ItemUpdate(SQLModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)


# Database model, database table inferred from class name
class Item(ItemBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(default_factory=get_datetime_utc)
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    owner: User | None = Relationship(back_populates="items")


# Properties to return via API, id is always required
class ItemPublic(ItemBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime | None = None


class ItemsPublic(SQLModel):
    data: list[ItemPublic]
    count: int


# Generic message
class Message(SQLModel):
    message: str


# JSON payload containing access token
class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


# Contents of JWT token
class TokenPayload(SQLModel):
    sub: str | None = None


class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)

class StructureCollecteBase(SQLModel):
    nom: str = Field(max_length=255)
    responsable: str = Field(max_length=255)
    telephone: str = Field(max_length=20)
    adresse: str = Field(max_length=255)
    description: str | None = None
    zones_intervention: str = Field(max_length=255)
    validated: bool = False


class StructureCollecteCreate(StructureCollecteBase):
    pass


class StructureCollecteUpdate(SQLModel):
    nom: str | None = None
    responsable: str | None = None
    telephone: str | None = None
    adresse: str | None = None
    description: str | None = None
    zones_intervention: str | None = None
    validated: bool | None = None


class StructureCollecte(StructureCollecteBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    created_at: datetime | None = Field(
        default_factory=get_datetime_utc
    )

    owner_id: uuid.UUID = Field(
        foreign_key="user.id",
        nullable=False,
        ondelete="CASCADE"
    )


class StructureCollectePublic(StructureCollecteBase):
    id: uuid.UUID
    owner_id: uuid.UUID


class StructuresCollectePublic(SQLModel):
    data: list[StructureCollectePublic]
    count: int

class SignalementBase(SQLModel):
    type_signalement: str = Field(
        max_length=100,
        description="DEPOTOIR_SAUVAGE, CANIVEAU_OBSTRUE, DECHETS_DANGEREUX..."
    )

    description: str = Field(
        max_length=1000
    )

    photo_url: str = Field(
        max_length=500
    )

    latitude: float

    longitude: float

    adresse: str | None = None

    quartier: str | None = None

    statut: str = Field(
        default="NOUVEAU"
    )


class SignalementCreate(SignalementBase):
    pass


class SignalementUpdate(SQLModel):
    description: str | None = None

    photo_url: str | None = None

    adresse: str | None = None

    quartier: str | None = None

    statut: str | None = None


class Signalement(SignalementBase, table=True):
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True
    )

    owner_id: uuid.UUID = Field(
        foreign_key="user.id",
        nullable=False,
        ondelete="CASCADE"
    )

    created_at: datetime = Field(
        default_factory=get_datetime_utc
    )

    updated_at: datetime | None = None

    # Pour les futures fonctionnalités IA
    categorie_detectee: str | None = None

    score_confiance: float | None = None

    # Validation administrative
    valide_par: uuid.UUID | None = None

    date_validation: datetime | None = None


class SignalementPublic(SignalementBase):
    id: uuid.UUID

    owner_id: uuid.UUID

    created_at: datetime

    updated_at: datetime | None = None

    categorie_detectee: str | None = None

    score_confiance: float | None = None


class SignalementsPublic(SQLModel):
    data: list[SignalementPublic]
    count: int

class StatutSignalement(str, Enum):
    NOUVEAU = "NOUVEAU"
    EN_VERIFICATION = "EN_VERIFICATION"
    VALIDE = "VALIDE"
    TRANSMIS = "TRANSMIS"
    PLANIFIE = "PLANIFIE"
    EN_COURS = "EN_COURS"
    RESOLU = "RESOLU"
    REJETE = "REJETE"

class InterventionBase(SQLModel):
    commentaire: str | None = None

    statut: str = "PLANIFIEE"


class InterventionCreate(InterventionBase):
    signalement_id: uuid.UUID

    structure_id: uuid.UUID


class InterventionUpdate(SQLModel):
    commentaire: str | None = None

    statut: str | None = None


class Intervention(InterventionBase, table=True):
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True
    )

    signalement_id: uuid.UUID

    structure_id: uuid.UUID

    created_at: datetime = Field(
        default_factory=get_datetime_utc
    )


class InterventionPublic(InterventionBase):
    id: uuid.UUID

    signalement_id: uuid.UUID

    structure_id: uuid.UUID

    created_at: datetime


class InterventionsPublic(SQLModel):
    data: list[InterventionPublic]
    count: int

class StatutIntervention(str, Enum):
    PLANIFIEE = "PLANIFIEE"

    EN_COURS = "EN_COURS"

    TERMINEE = "TERMINEE"

    ANNULEE = "ANNULEE"

class AbonnementBase(SQLModel):
    statut: str = "EN_ATTENTE"


class AbonnementCreate(AbonnementBase):
    structure_id: uuid.UUID


class AbonnementUpdate(SQLModel):
    statut: str | None = None


class Abonnement(AbonnementBase, table=True):
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True
    )

    citoyen_id: uuid.UUID = Field(
        foreign_key="user.id",
        nullable=False,
        ondelete="CASCADE"
    )

    structure_id: uuid.UUID

    created_at: datetime | None = Field(
        default_factory=get_datetime_utc
    )


class AbonnementPublic(AbonnementBase):
    id: uuid.UUID
    citoyen_id: uuid.UUID
    structure_id: uuid.UUID
    created_at: datetime | None = None


class AbonnementsPublic(SQLModel):
    data: list[AbonnementPublic]
    count: int

class CollecteBase(SQLModel):
    adresse: str

    latitude: float

    longitude: float

    description: str

    statut: str = "EN_ATTENTE"


class CollecteCreate(CollecteBase):
    structure_id: uuid.UUID


class CollecteUpdate(SQLModel):
    statut: str | None = None

    description: str | None = None


class Collecte(CollecteBase, table=True):
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True
    )

    citoyen_id: uuid.UUID = Field(
        foreign_key="user.id",
        nullable=False,
        ondelete="CASCADE"
    )

    structure_id: uuid.UUID

    created_at: datetime = Field(
        default_factory=get_datetime_utc
    )


class CollectePublic(CollecteBase):
    id: uuid.UUID

    citoyen_id: uuid.UUID

    structure_id: uuid.UUID

    created_at: datetime


class CollectesPublic(SQLModel):
    data: list[CollectePublic]
    count: int

class VehiculeBase(SQLModel):
    immatriculation: str = Field(max_length=50)

    type_vehicule: str

    capacite_kg: float

    actif: bool = True


class VehiculeCreate(VehiculeBase):
    pass


class VehiculeUpdate(SQLModel):
    immatriculation: str | None = None
    type_vehicule: str | None = None
    capacite_kg: float | None = None
    actif: bool | None = None


class Vehicule(VehiculeBase, table=True):
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True
    )

    structure_id: uuid.UUID

    created_at: datetime = Field(
        default_factory=get_datetime_utc
    )


class VehiculePublic(VehiculeBase):
    id: uuid.UUID
    structure_id: uuid.UUID


class VehiculesPublic(SQLModel):
    data: list[VehiculePublic]
    count: int

class EquipeBase(SQLModel):
    nom: str

    nombre_agents: int


class EquipeCreate(EquipeBase):
    pass


class EquipeUpdate(SQLModel):
    nom: str | None = None
    nombre_agents: int | None = None


class Equipe(EquipeBase, table=True):
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True
    )

    structure_id: uuid.UUID

    created_at: datetime = Field(
        default_factory=get_datetime_utc
    )


class EquipePublic(EquipeBase):
    id: uuid.UUID
    structure_id: uuid.UUID


class EquipesPublic(SQLModel):
    data: list[EquipePublic]
    count: int

class NotificationBase(SQLModel):
    titre: str = Field(max_length=255)

    message: str = Field(max_length=1000)

    lu: bool = False


class NotificationCreate(NotificationBase):
    pass


class Notification(NotificationBase, table=True):
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True
    )

    user_id: uuid.UUID = Field(
        foreign_key="user.id",
        nullable=False,
        ondelete="CASCADE"
    )

    created_at: datetime = Field(
        default_factory=get_datetime_utc
    )


class NotificationPublic(NotificationBase):
    id: uuid.UUID

    user_id: uuid.UUID

    created_at: datetime


class NotificationsPublic(SQLModel):
    data: list[NotificationPublic]
    count: int

