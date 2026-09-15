import json
import threading
from dataclasses import asdict, field
from datetime import datetime, timezone
from uuid import UUID, uuid4

from nanoid import generate
from pydantic import TypeAdapter

from app.models import ActionLog, AppSettings, Party, PartyStatus, Table

PARTY_ADAPTER = TypeAdapter(Party)


class MemoryStore:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._parties: dict[UUID, Party] = {}
        self._tables: dict[UUID, Table] = {}
        self._action_logs: list[ActionLog] = []
        self._settings: dict[str, str] = {}
        self._tokens: dict[str, dict[str, object]] = {}
        self._next_position: int = 1

    # ── Parties ──────────────────────────────────────────────────────────

    def add_party(
        self,
        name: str,
        party_size: int,
        *,
        phone: str | None = None,
        email: str | None = None,
        notes: str | None = None,
        urgent: bool = False,
    ) -> Party:
        with self._lock:
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
            self._parties[party_id] = party
            return party

    def list_parties(self) -> list[Party]:
        with self._lock:
            return sorted(self._parties.values(), key=lambda p: p.position or 0)

    def get_party(self, party_id: UUID) -> Party | None:
        with self._lock:
            return self._parties.get(party_id)

    def get_party_by_token(self, token: str) -> Party | None:
        with self._lock:
            for party in self._parties.values():
                if party.token == token:
                    return party
            return None

    def update_party(self, party_id: UUID, updates: dict[str, object]) -> Party | None:
        with self._lock:
            party = self._parties.get(party_id)
            if party is None:
                return None
            updated_data = {**asdict(party), **updates}
            updated_data["updated_at"] = datetime.now(timezone.utc)
            updated = PARTY_ADAPTER.validate_python(updated_data)
            self._parties[party_id] = updated
            return updated

    def delete_party(self, party_id: UUID) -> None:
        with self._lock:
            self._parties.pop(party_id, None)

    def undo_last_action(self, party_id: UUID) -> Party | None:
        with self._lock:
            party = self._parties.get(party_id)
            if party is None:
                return None
            logs = [
                log for log in self._action_logs if log.party_id == str(party_id)
            ]
            if not logs:
                return party
            last_log = sorted(logs, key=lambda l: l.created_at, reverse=True)[0]
            if last_log.previous_state is None:
                return party
            import json
            prev = json.loads(last_log.previous_state)
            prev["id"] = str(party_id)
            updated = PARTY_ADAPTER.validate_python(prev)
            self._parties[party_id] = updated
            self._action_logs.remove(last_log)
            return updated

    # ── Action Logs ──────────────────────────────────────────────────────

    def add_action_log(
        self,
        party_id: UUID,
        action: str,
        previous_state: Party | None = None,
        *,
        created_by: str = "system",
    ) -> ActionLog:
        snapshot = json.dumps(asdict(previous_state), default=str) if previous_state else None
        log = ActionLog(
            id=uuid4(),
            party_id=str(party_id),
            action=action,
            previous_state=snapshot,
            created_by=created_by,
        )
        with self._lock:
            self._action_logs.append(log)
            return log

    def get_action_logs_for_party(self, party_id: UUID) -> list[ActionLog]:
        with self._lock:
            filtered = [
                log
                for log in self._action_logs
                if log.party_id == str(party_id)
            ]
            return sorted(filtered, key=lambda l: l.created_at, reverse=True)

    # ── Tables ───────────────────────────────────────────────────────────

    def add_table(self, capacity: int, label: str) -> Table:
        table = Table(
            id=uuid4(),
            capacity=capacity,
            label=label,
            is_occupied=False,
        )
        with self._lock:
            self._tables[table.id] = table
            return table

    def get_tables(self) -> list[Table]:
        with self._lock:
            return list(self._tables.values())

    def get_table(self, table_id: UUID) -> Table | None:
        with self._lock:
            return self._tables.get(table_id)

    def update_table(self, table_id: UUID, updates: dict[str, object]) -> Table | None:
        with self._lock:
            table = self._tables.get(table_id)
            if table is None:
                return None
            updated_data = {**asdict(table), **updates}
            updated = Table(**updated_data)
            self._tables[table_id] = updated
            return updated

    def delete_table(self, table_id: UUID) -> None:
        with self._lock:
            self._tables.pop(table_id, None)

    # ── Settings ─────────────────────────────────────────────────────────

    def set_setting(self, key: str, value: str) -> AppSettings:
        with self._lock:
            self._settings[key] = value
            return AppSettings(key=key, value=value)

    def get_setting(self, key: str) -> str | None:
        with self._lock:
            return self._settings.get(key)

    # ── Auth Tokens ──────────────────────────────────────────────────────

    def add_token(self, token: str, scopes: list[str]) -> None:
        with self._lock:
            self._tokens[token] = {"scopes": scopes}

    def remove_token(self, token: str) -> None:
        with self._lock:
            self._tokens.pop(token, None)

    def get_token(self, token: str) -> dict[str, object] | None:
        with self._lock:
            return self._tokens.get(token)

    # ── Maintenance ──────────────────────────────────────────────────────

    def clear(self) -> None:
        with self._lock:
            self._parties.clear()
            self._tables.clear()
            self._action_logs.clear()
            self._settings.clear()
            self._tokens.clear()
            self._next_position = 1


store = MemoryStore()
