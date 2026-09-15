import json
from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.models.database import ActionLog, AppSettings, AuthToken, Base, Party, PartyStatus, Table

DATABASE_URL = "sqlite+aiosqlite:///data/waitlist.db"

engine = create_async_engine(DATABASE_URL, echo=False)
async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


def _row_to_party(row: Any) -> Party | None:
    if row is None:
        return None
    d = dict(row._mapping)
    for field in ["created_at", "updated_at", "notified_at", "seated_at", "canceled_at"]:
        if d.get(field) and isinstance(d[field], str):
            dt = datetime.fromisoformat(d[field])
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            d[field] = dt
    # SQLAlchemy Enum type may return the enum member directly or a string
    status = d.get("status")
    if isinstance(status, str):
        d["status"] = PartyStatus(status)
    elif isinstance(status, PartyStatus):
        pass  # already correct
    if isinstance(d.get("id"), str):
        d["id"] = UUID(d["id"])
    return Party(**d)


def _row_to_table(row: Any) -> Table | None:
    if row is None:
        return None
    d = dict(row._mapping)
    if d.get("created_at") and isinstance(d["created_at"], str):
        d["created_at"] = datetime.fromisoformat(d["created_at"])
    if d.get("occupied_by_party_id") and isinstance(d["occupied_by_party_id"], str):
        d["occupied_by_party_id"] = UUID(d["occupied_by_party_id"])
    if isinstance(d.get("id"), str):
        d["id"] = UUID(d["id"])
    return Table(**d)


class DatabaseStore:
    def __init__(self) -> None:
        self._next_position: int = 1

    async def _ensure_tables(self) -> None:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    async def add_party(
        self,
        name: str,
        party_size: int,
        *,
        phone: str | None = None,
        email: str | None = None,
        notes: str | None = None,
        urgent: bool = False,
    ) -> Party:
        from nanoid import generate

        session = async_session_maker()
        try:
            party_id = uuid4()
            token = generate(size=8)
            position = self._next_position
            self._next_position += 1
            now = datetime.now(timezone.utc)
            party = Party(
                id=party_id,
                name=name,
                party_size=party_size,
                phone=phone,
                email=email,
                status=PartyStatus.waiting,
                position=position,
                notes=notes,
                urgent=urgent,
                token=token,
                created_at=now,
                updated_at=now,
            )
            session.add(party)
            await session.flush()
            await session.commit()
            return party
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

    async def list_parties(self) -> list[Party]:
        session = async_session_maker()
        try:
            result = await session.execute(text("SELECT * FROM parties ORDER BY position ASC"))
            rows = result.fetchall()
            return [_row_to_party(r) for r in rows if _row_to_party(r) is not None]  # type: ignore[arg-type]
        finally:
            await session.close()

    async def get_party(self, party_id: UUID) -> Party | None:
        session = async_session_maker()
        try:
            result = await session.execute(text(f"SELECT * FROM parties WHERE id = '{party_id.hex}'"))
            row = result.fetchone()
            return _row_to_party(row)
        finally:
            await session.close()

    async def get_party_by_token(self, token: str) -> Party | None:
        session = async_session_maker()
        try:
            result = await session.execute(text(f"SELECT * FROM parties WHERE token = '{token}'"))
            row = result.fetchone()
            return _row_to_party(row)
        finally:
            await session.close()

    async def update_party(self, party_id: UUID, updates: dict[str, Any]) -> Party | None:
        session = async_session_maker()
        try:
            result = await session.execute(text(f"SELECT * FROM parties WHERE id = '{party_id.hex}'"))
            row = result.fetchone()
            if row is None:
                return None
            party = _row_to_party(row)
            if party is None:
                return None
            for key, value in updates.items():
                setattr(party, key, value)
            party.updated_at = datetime.now(timezone.utc)
            status_val = party.status.value if isinstance(party.status, PartyStatus) else str(party.status)
            await session.execute(
                text(
                    "UPDATE parties SET name=:name, party_size=:party_size, phone=:phone, "
                    "email=:email, status=:status, position=:position, estimated_wait=:estimated_wait, "
                    "notes=:notes, urgent=:urgent, token=:token, created_at=:created_at, "
                    "updated_at=:updated_at, notified_at=:notified_at, seated_at=:seated_at, "
                    "canceled_at=:canceled_at WHERE id=:id"
                ),
                {
                    "id": party_id.hex,
                    "name": party.name,
                    "party_size": party.party_size,
                    "phone": party.phone,
                    "email": party.email,
                    "status": party.status.value if isinstance(party.status, PartyStatus) else str(party.status),
                    "position": party.position,
                    "estimated_wait": party.estimated_wait,
                    "notes": party.notes,
                    "urgent": party.urgent,
                    "token": party.token,
                    "created_at": party.created_at.isoformat() if party.created_at else None,
                    "updated_at": party.updated_at.isoformat() if party.updated_at else None,
                    "notified_at": party.notified_at.isoformat() if party.notified_at else None,
                    "seated_at": party.seated_at.isoformat() if party.seated_at else None,
                    "canceled_at": party.canceled_at.isoformat() if party.canceled_at else None,
                },
            )
            await session.commit()
            return party
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

    async def delete_party(self, party_id: UUID) -> None:
        session = async_session_maker()
        try:
            await session.execute(text(f"DELETE FROM parties WHERE id = '{party_id.hex}'"))
            await session.commit()
        finally:
            await session.close()

    async def undo_last_action(self, party_id: UUID) -> Party | None:
        session = async_session_maker()
        try:
            result = await session.execute(text(f"SELECT * FROM parties WHERE id = '{party_id.hex}'"))
            row = result.fetchone()
            if row is None:
                return None
            party = _row_to_party(row)
            if party is None:
                return None
            logs_result = await session.execute(
                text(
                    f"SELECT * FROM action_logs WHERE party_id = '{party_id.hex}' "
                    "ORDER BY created_at DESC LIMIT 1"
                )
            )
            log_row = logs_result.fetchone()
            if log_row is None:
                return party
            log = ActionLog(**dict(log_row._mapping))

            if log.previous_state is None:
                return party
            prev = json.loads(log.previous_state)
            prev["id"] = str(party_id)
            defaults: dict[str, Any] = {
                "party_size": party.party_size,
                "phone": party.phone,
                "email": party.email,
                "status": party.status.value if isinstance(party.status, PartyStatus) else str(party.status),
                "position": party.position,
                "estimated_wait": party.estimated_wait,
                "notes": party.notes,
                "urgent": party.urgent,
                "token": party.token,
                "created_at": party.created_at.isoformat() if party.created_at else None,
                "updated_at": party.updated_at.isoformat() if party.updated_at else None,
                "notified_at": party.notified_at.isoformat() if party.notified_at else None,
                "seated_at": party.seated_at.isoformat() if party.seated_at else None,
                "canceled_at": party.canceled_at.isoformat() if party.canceled_at else None,
            }
            prev.update(defaults)
            if isinstance(prev.get("status"), str):
                prev["status"] = PartyStatus(prev["status"])
            restored = Party(**prev)
            if isinstance(restored.id, str):
                restored.id = UUID(restored.id)
            for field in ["created_at", "updated_at", "notified_at", "seated_at", "canceled_at"]:
                val = getattr(restored, field, None)
                if isinstance(val, str):
                    setattr(restored, field, datetime.fromisoformat(val))
                elif val is None and field in ("created_at", "updated_at"):
                    setattr(restored, field, datetime.now(timezone.utc))
            # pyright: ignore[reportOptionalMemberAccess] - restored is guaranteed non-None above
            await session.execute(
                text(
                    "UPDATE parties SET name=:name, party_size=:party_size, phone=:phone, "
                    "email=:email, status=:status, position=:position, estimated_wait=:estimated_wait, "
                    "notes=:notes, urgent=:urgent, token=:token, created_at=:created_at, "
                    "updated_at=:updated_at, notified_at=:notified_at, seated_at=:seated_at, "
                    "canceled_at=:canceled_at WHERE id=:id"
                ),
                {
                    "id": restored.id.hex,
                    "name": restored.name,
                    "party_size": restored.party_size,
                    "phone": restored.phone,
                    "email": restored.email,
                    "status": restored.status.value if isinstance(restored.status, PartyStatus) else str(restored.status),
                    "position": restored.position,
                    "estimated_wait": restored.estimated_wait,
                    "notes": restored.notes,
                    "urgent": restored.urgent,
                    "token": restored.token,
                    "created_at": restored.created_at.isoformat(),
                    "updated_at": restored.updated_at.isoformat(),
                    "notified_at": restored.notified_at.isoformat() if restored.notified_at else None,
                    "seated_at": restored.seated_at.isoformat() if restored.seated_at else None,
                    "canceled_at": restored.canceled_at.isoformat() if restored.canceled_at else None,
                },
            )
            await session.execute(text(f"DELETE FROM action_logs WHERE id = '{log.id}'"))
            await session.commit()
            return restored
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

    async def add_action_log(
        self,
        party_id: UUID,
        action: str,
        previous_state: Party | None = None,
        *,
        created_by: str = "system",
    ) -> ActionLog:
        snapshot = (
            json.dumps({"id": str(party_id), "name": previous_state.name if previous_state else None}, default=str)
            if previous_state
            else None
        )
        log = ActionLog(
            id=uuid4(),
            party_id=party_id.hex,
            action=action,
            previous_state=snapshot,
            created_by=created_by,
        )
        session = async_session_maker()
        try:
            session.add(log)
            await session.flush()
            await session.commit()
            return log
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

    async def get_action_logs_for_party(self, party_id: UUID) -> list[ActionLog]:
        session = async_session_maker()
        try:
            result = await session.execute(
                text(
                    f"SELECT * FROM action_logs WHERE party_id = '{party_id.hex}' "
                    "ORDER BY created_at DESC"
                )
            )
            rows = result.fetchall()
            return [ActionLog(**dict(r._mapping)) for r in rows]
        finally:
            await session.close()

    async def add_table(self, capacity: int, label: str) -> Table:
        table = Table(
            id=uuid4(),
            capacity=capacity,
            label=label,
            is_occupied=False,
        )
        session = async_session_maker()
        try:
            session.add(table)
            await session.flush()
            await session.commit()
            return table
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

    async def get_tables(self) -> list[Table]:
        session = async_session_maker()
        try:
            result = await session.execute(text("SELECT * FROM tables"))
            rows = result.fetchall()
            return [_row_to_table(r) for r in rows if _row_to_table(r) is not None]  # type: ignore[arg-type]
        finally:
            await session.close()

    async def get_table(self, table_id: UUID) -> Table | None:
        session = async_session_maker()
        try:
            result = await session.execute(text(f"SELECT * FROM tables WHERE id = '{table_id.hex}'"))
            row = result.fetchone()
            return _row_to_table(row)
        finally:
            await session.close()

    async def update_table(self, table_id: UUID, updates: dict[str, Any]) -> Table | None:
        session = async_session_maker()
        try:
            result = await session.execute(text(f"SELECT * FROM tables WHERE id = '{table_id.hex}'"))
            row = result.fetchone()
            if row is None:
                return None
            table = _row_to_table(row)
            if table is None:
                return None
            for key, value in updates.items():
                setattr(table, key, value)
            await session.execute(
                text(
                    "UPDATE tables SET capacity=:capacity, label=:label, is_occupied=:is_occupied, "
                    "occupied_by_party_id=:occupied_by_party_id, created_at=:created_at WHERE id=:id"
                ),
                {
                    "id": table_id.hex,
                    "capacity": table.capacity,
                    "label": table.label,
                    "is_occupied": table.is_occupied,
                    "occupied_by_party_id": str(table.occupied_by_party_id) if table.occupied_by_party_id else None,
                    "created_at": table.created_at.isoformat() if table.created_at else None,
                },
            )
            await session.commit()
            return table
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

    async def delete_table(self, table_id: UUID) -> None:
        session = async_session_maker()
        try:
            await session.execute(text(f"DELETE FROM tables WHERE id = '{table_id.hex}'"))
            await session.commit()
        finally:
            await session.close()

    async def set_setting(self, key: str, value: str) -> AppSettings:
        session = async_session_maker()
        try:
            await session.execute(
                text("INSERT OR REPLACE INTO settings (key, value) VALUES (:key, :value)"),
                {"key": key, "value": value},
            )
            await session.commit()
            return AppSettings(key=key, value=value)
        finally:
            await session.close()

    async def get_setting(self, key: str) -> str | None:
        session = async_session_maker()
        try:
            result = await session.execute(text(f"SELECT value FROM settings WHERE key = '{key}'"))
            row = result.fetchone()
            return row[0] if row else None
        finally:
            await session.close()

    async def add_token(self, token: str, scopes: list[str]) -> None:
        session = async_session_maker()
        try:
            await session.execute(
                text("INSERT OR REPLACE INTO auth_tokens (token, scopes) VALUES (:token, :scopes)"),
                {"token": token, "scopes": json.dumps({"scopes": scopes})},
            )
            await session.commit()
        finally:
            await session.close()

    async def remove_token(self, token: str) -> None:
        session = async_session_maker()
        try:
            await session.execute(text(f"DELETE FROM auth_tokens WHERE token = '{token}'"))
            await session.commit()
        finally:
            await session.close()

    async def get_token(self, token: str) -> dict[str, Any] | None:
        session = async_session_maker()
        try:
            result = await session.execute(text(f"SELECT scopes FROM auth_tokens WHERE token = '{token}'"))
            row = result.fetchone()
            if row is None:
                return None
            return json.loads(row[0])
        finally:
            await session.close()

    async def clear(self) -> None:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
        self._next_position = 1


store = DatabaseStore()
