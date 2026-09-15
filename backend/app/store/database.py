import asyncio
import json
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from uuid import UUID, uuid4

import aiosqlite
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.models.database import ActionLog, AppSettings, Base, Party, PartyStatus, Table
from app.store.memory import MemoryStore

# Use in-memory database for tests, file-based for production
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "sqlite+aiosqlite:///data/waitlist.db"
)

engine = create_async_engine(DATABASE_URL, echo=False)
async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


@asynccontextmanager
async def get_session() -> AsyncSession:
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


class DatabaseStore:
    def __init__(self) -> None:
        self._parties: dict[UUID, Party] = {}
        self._tables: dict[UUID, Table] = {}
        self._action_logs: list[ActionLog] = []
        self._settings: dict[str, str] = {}
        self._tokens: dict[str, dict[str, object]] = {}
        self._next_position: int = 1
        self._memory = MemoryStore()

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
        async with get_session() as session:
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
            return party

    async def _row_to_party(self, row) -> Party | None:
        if row is None:
            return None
        d = dict(row._mapping)
        # Convert string datetime back to datetime objects (make timezone-aware)
        for field in ["created_at", "updated_at", "notified_at", "seated_at", "canceled_at"]:
            if d.get(field) and isinstance(d[field], str):
                dt = datetime.fromisoformat(d[field])
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                d[field] = dt
        # Convert status string back to enum
        if isinstance(d.get("status"), str):
            d["status"] = PartyStatus(d["status"])
        # Convert id from hex string back to UUID
        if isinstance(d.get("id"), str):
            from uuid import UUID
            d["id"] = UUID(d["id"])
        return Party(**d)

    async def list_parties(self) -> list[Party]:
        async with get_session() as session:
            result = await session.execute(
                text("SELECT * FROM parties ORDER BY position ASC")
            )
            rows = result.fetchall()
            parties = []
            for row in rows:
                party = await self._row_to_party(row)
                if party:
                    parties.append(party)
            return sorted(parties, key=lambda p: p.position or 0)

    async def get_party(self, party_id: UUID) -> Party | None:
        async with get_session() as session:
            result = await session.execute(text(f"SELECT * FROM parties WHERE id = '{party_id.hex}'"))
            row = result.fetchone()
            return await self._row_to_party(row)

    async def get_party_by_token(self, token: str) -> Party | None:
        async with get_session() as session:
            result = await session.execute(text(f"SELECT * FROM parties WHERE token = '{token}'"))
            row = result.fetchone()
            return await self._row_to_party(row)

    async def update_party(self, party_id: UUID, updates: dict[str, object]) -> Party | None:
        async with get_session() as session:
            result = await session.execute(text(f"SELECT * FROM parties WHERE id = '{party_id.hex}'"))
            row = result.fetchone()
            if row is None:
                return None
            party = await self._row_to_party(row)
            if party is None:
                return None
            # Apply updates
            for key, value in updates.items():
                setattr(party, key, value)
            party.updated_at = datetime.now(timezone.utc)
            # Serialize for database write
            await session.execute(
                text(f"UPDATE parties SET name=:name, party_size=:party_size, phone=:phone, "
                     f"email=:email, status=:status, position=:position, estimated_wait=:estimated_wait, "
                     f"notes=:notes, urgent=:urgent, token=:token, created_at=:created_at, "
                     f"updated_at=:updated_at, notified_at=:notified_at, seated_at=:seated_at, "
                     f"canceled_at=:canceled_at WHERE id=:id"),
                {
                    "id": party_id.hex,
                    "name": party.name,
                    "party_size": party.party_size,
                    "phone": party.phone,
                    "email": party.email,
                    "status": party.status.value if hasattr(party.status, 'value') else str(party.status),
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
            )
            return party

    async def delete_party(self, party_id: UUID) -> None:
        async with get_session() as session:
            await session.execute(text(f"DELETE FROM parties WHERE id = '{party_id.hex}'"))

    async def undo_last_action(self, party_id: UUID) -> Party | None:
        async with get_session() as session:
            result = await session.execute(text(f"SELECT * FROM parties WHERE id = '{party_id.hex}'"))
            row = result.fetchone()
            if row is None:
                return None
            party = await self._row_to_party(row)

            logs_result = await session.execute(
                text(f"SELECT * FROM action_logs WHERE party_id = '{party_id.hex}' ORDER BY created_at DESC LIMIT 1")
            )
            log_row = logs_result.fetchone()
            if log_row is None:
                return party
            log = ActionLog(**dict(log_row._mapping))

            if log.previous_state is None:
                return party
            prev = json.loads(log.previous_state)
            prev["id"] = str(party_id)
            # Provide default values for fields not stored in snapshot
            defaults = {
                "party_size": party.party_size,
                "phone": party.phone,
                "email": party.email,
                "status": party.status.value if hasattr(party.status, 'value') else str(party.status),
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
            # Convert status string back to enum
            if isinstance(prev.get("status"), str):
                prev["status"] = PartyStatus(prev["status"])
            restored = Party(**prev)
            # Ensure restored.id is a UUID
            if isinstance(restored.id, str):
                from uuid import UUID
                restored.id = UUID(restored.id)
            # Ensure timestamps are datetime objects, not strings
            for field in ["created_at", "updated_at", "notified_at", "seated_at", "canceled_at"]:
                val = getattr(restored, field, None)
                if isinstance(val, str):
                    setattr(restored, field, datetime.fromisoformat(val))
                elif val is None:
                    setattr(restored, field, now if field in ["created_at", "updated_at"] else None)
            await session.execute(
                text(f"UPDATE parties SET name=:name, party_size=:party_size, phone=:phone, "
                     f"email=:email, status=:status, position=:position, estimated_wait=:estimated_wait, "
                     f"notes=:notes, urgent=:urgent, token=:token, created_at=:created_at, "
                     f"updated_at=:updated_at, notified_at=:notified_at, seated_at=:seated_at, "
                     f"canceled_at=:canceled_at WHERE id=:id"),
                {
                    "id": restored.id.hex,
                    "name": restored.name,
                    "party_size": restored.party_size,
                    "phone": restored.phone,
                    "email": restored.email,
                    "status": restored.status.value if hasattr(restored.status, 'value') else str(restored.status),
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
                }
            )
            await session.execute(text(f"DELETE FROM action_logs WHERE id = '{log.id}'"))
            return restored

    async def add_action_log(
        self,
        party_id: UUID,
        action: str,
        previous_state: Party | None = None,
        *,
        created_by: str = "system",
    ) -> ActionLog:
        snapshot = json.dumps({"id": str(party_id), "name": previous_state.name if previous_state else None}, default=str) if previous_state else None
        log = ActionLog(
            id=uuid4(),
            party_id=party_id.hex,
            action=action,
            previous_state=snapshot,
            created_by=created_by,
        )
        async with get_session() as session:
            session.add(log)
            await session.flush()
            return log

    async def get_action_logs_for_party(self, party_id: UUID) -> list[ActionLog]:
        async with get_session() as session:
            result = await session.execute(
                text(f"SELECT * FROM action_logs WHERE party_id = '{party_id.hex}' ORDER BY created_at DESC")
            )
            rows = result.fetchall()
            return [ActionLog(**dict(r._mapping)) for r in rows]

    async def add_table(self, capacity: int, label: str) -> Table:
        table = Table(
            id=uuid4(),
            capacity=capacity,
            label=label,
            is_occupied=False,
        )
        async with get_session() as session:
            session.add(table)
            await session.flush()
            return table

    async def get_tables(self) -> list[Table]:
        async with get_session() as session:
            result = await session.execute(text("SELECT * FROM tables"))
            rows = result.fetchall()
            return [await self._row_to_table(r) for r in rows]

    async def get_table(self, table_id: UUID) -> Table | None:
        async with get_session() as session:
            result = await session.execute(text(f"SELECT * FROM tables WHERE id = '{table_id.hex}'"))
            row = result.fetchone()
            return await self._row_to_table(row)

    async def _row_to_table(self, row) -> Table | None:
        if row is None:
            return None
        d = dict(row._mapping)
        if d.get("created_at") and isinstance(d["created_at"], str):
            d["created_at"] = datetime.fromisoformat(d["created_at"])
        if d.get("occupied_by_party_id") and isinstance(d["occupied_by_party_id"], str):
            from uuid import UUID
            d["occupied_by_party_id"] = UUID(d["occupied_by_party_id"])
        # Convert id from hex string back to UUID
        if isinstance(d.get("id"), str):
            from uuid import UUID
            d["id"] = UUID(d["id"])
        return Table(**d)

    async def update_table(self, table_id: UUID, updates: dict[str, object]) -> Table | None:
        async with get_session() as session:
            result = await session.execute(text(f"SELECT * FROM tables WHERE id = '{table_id.hex}'"))
            row = result.fetchone()
            if row is None:
                return None
            table = await self._row_to_table(row)
            if table is None:
                return None
            for key, value in updates.items():
                setattr(table, key, value)
            await session.execute(
                text(f"UPDATE tables SET capacity=:capacity, label=:label, is_occupied=:is_occupied, "
                     f"occupied_by_party_id=:occupied_by_party_id, created_at=:created_at WHERE id=:id"),
                {
                    "id": table_id.hex,
                    "capacity": table.capacity,
                    "label": table.label,
                    "is_occupied": table.is_occupied,
                    "occupied_by_party_id": str(table.occupied_by_party_id) if table.occupied_by_party_id else None,
                    "created_at": table.created_at.isoformat() if table.created_at else None,
                }
            )
            return table

    async def delete_table(self, table_id: UUID) -> None:
        async with get_session() as session:
            await session.execute(text(f"DELETE FROM tables WHERE id = '{table_id.hex}'"))

    async def set_setting(self, key: str, value: str) -> AppSettings:
        async with get_session() as session:
            await session.execute(
                text("INSERT OR REPLACE INTO settings (key, value) VALUES (:key, :value)"),
                {"key": key, "value": value}
            )
            return AppSettings(key=key, value=value)

    async def get_setting(self, key: str) -> str | None:
        async with get_session() as session:
            result = await session.execute(text(f"SELECT value FROM settings WHERE key = '{key}'"))
            row = result.fetchone()
            return row[0] if row else None

    async def add_token(self, token: str, scopes: list[str]) -> None:
        async with get_session() as session:
            await session.execute(
                text("INSERT OR REPLACE INTO auth_tokens (token, scopes) VALUES (:token, :scopes)"),
                {"token": token, "scopes": json.dumps({"scopes": scopes})}
            )

    async def remove_token(self, token: str) -> None:
        async with get_session() as session:
            await session.execute(text(f"DELETE FROM auth_tokens WHERE token = '{token}'"))

    async def get_token(self, token: str) -> dict[str, object] | None:
        async with get_session() as session:
            result = await session.execute(text(f"SELECT scopes FROM auth_tokens WHERE token = '{token}'"))
            row = result.fetchone()
            if row is None:
                return None
            return json.loads(row[0])

    async def clear(self) -> None:
        async with engine.begin() as conn:
            await conn.run_sync(lambda c: Base.metadata.drop_all(c))
            await conn.run_sync(Base.metadata.create_all)
        self._next_position = 1


store = DatabaseStore()
