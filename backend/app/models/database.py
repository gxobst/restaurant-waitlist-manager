from datetime import datetime, timezone
from enum import Enum as PyEnum
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    Enum,
    ForeignKey,
    Index,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class PartyStatus(str, PyEnum):
    waiting = "waiting"
    notified = "notified"
    seated = "seated"
    canceled = "canceled"
    no_show = "no_show"


class Base(DeclarativeBase):
    pass


class Party(Base):
    __tablename__ = "parties"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    party_size: Mapped[int] = mapped_column(nullable=False)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(
        Enum(PartyStatus, values_callable=lambda e: [s.value for s in e]),
        nullable=False,
        default=PartyStatus.waiting,
    )
    position: Mapped[int | None] = mapped_column(nullable=True)
    estimated_wait: Mapped[int | None] = mapped_column(nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    urgent: Mapped[bool] = mapped_column(default=False)
    token: Mapped[str | None] = mapped_column(String(16), unique=True, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
    )
    notified_at: Mapped[datetime | None] = mapped_column(nullable=True)
    seated_at: Mapped[datetime | None] = mapped_column(nullable=True)
    canceled_at: Mapped[datetime | None] = mapped_column(nullable=True)

    action_logs: Mapped[list["ActionLog"]] = relationship(
        "ActionLog", back_populates="party", cascade="all, delete-orphan"
    )

    __table_args__ = (
        CheckConstraint("party_size >= 1 AND party_size <= 12", name="chk_party_size"),
        Index("ix_parties_status", "status"),
        Index("ix_parties_token", "token"),
    )


class Table(Base):
    __tablename__ = "tables"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    capacity: Mapped[int] = mapped_column(nullable=False)
    label: Mapped[str] = mapped_column(String(100), nullable=False)
    is_occupied: Mapped[bool] = mapped_column(default=False)
    occupied_by_party_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("parties.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
    )

    __table_args__ = (
        CheckConstraint("capacity >= 1 AND capacity <= 20", name="chk_table_capacity"),
        Index("ix_tables_occupied", "is_occupied"),
    )


class ActionLog(Base):
    __tablename__ = "action_logs"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    party_id: Mapped[str] = mapped_column(String(36), ForeignKey("parties.id", ondelete="CASCADE"), nullable=False)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    previous_state: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[str] = mapped_column(String(50), default="system")
    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
    )

    party: Mapped["Party"] = relationship("Party", back_populates="action_logs")

    __table_args__ = (
        Index("ix_action_logs_party_id", "party_id"),
        Index("ix_action_logs_created_at", "created_at"),
    )


class AppSettings(Base):
    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    value: Mapped[str] = mapped_column(Text, nullable=False)


class AuthToken(Base):
    __tablename__ = "auth_tokens"

    token: Mapped[str] = mapped_column(String(255), primary_key=True)
    scopes: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
    )
