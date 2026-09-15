from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from uuid import UUID, uuid4


class PartyStatus(str, Enum):
    waiting = "waiting"
    notified = "notified"
    seated = "seated"
    canceled = "canceled"
    no_show = "no_show"


@dataclass
class Party:
    id: UUID
    name: str
    party_size: int
    phone: str | None = None
    email: str | None = None
    status: PartyStatus = PartyStatus.waiting
    position: int | None = None
    estimated_wait: int | None = None
    notes: str | None = None
    urgent: bool = False
    token: str | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    notified_at: datetime | None = None
    seated_at: datetime | None = None
    canceled_at: datetime | None = None


@dataclass
class Table:
    id: UUID
    capacity: int
    label: str
    is_occupied: bool = False
    occupied_by_party_id: str | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class ActionLog:
    id: UUID
    party_id: str
    action: str
    previous_state: str | None = None
    created_by: str = "system"
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class AppSettings:
    key: str
    value: str
