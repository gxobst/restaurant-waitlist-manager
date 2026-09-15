## Goal

Create `backend/app/models/` with dataclasses for Party, Table, ActionLog, and AppSettings, and `backend/app/schemas/` with Pydantic v2 request and response schemas so the backend has a clean domain layer ready for the in-memory store (Task 23) and routers (Task 26+).

## Acceptance criteria

- [ ] `backend/app/models/__init__.py` exists and exports `Party`, `Table`, `ActionLog`, `AppSettings` dataclasses
- [ ] `Party` dataclass fields: `id` (uuid.UUID), `name` (str), `party_size` (int), `phone` (str | None), `email` (str | None), `status` (PartyStatus enum), `position` (int | None), `estimated_wait` (int | None), `notes` (str | None), `urgent` (bool), `token` (str | None), `created_at` (datetime), `updated_at` (datetime), `notified_at` (datetime | None), `seated_at` (datetime | None), `canceled_at` (datetime | None)
- [ ] `Table` dataclass fields: `id` (uuid.UUID), `capacity` (int), `label` (str), `is_occupied` (bool), `occupied_by_party_id` (uuid.UUID | None), `created_at` (datetime)
- [ ] `ActionLog` dataclass fields: `id` (uuid.UUID), `party_id` (uuid.UUID), `action` (str), `previous_state` (str | None), `created_by` (str), `created_at` (datetime)
- [ ] `AppSettings` dataclass fields: `key` (str), `value` (str)
- [ ] `PartyStatus` enum (Python `enum.Enum` or `StrEnum`) includes exactly: `waiting`, `notified`, `seated`, `canceled`, `no_show`
- [ ] All timestamp fields use `default_factory=lambda: datetime.now(timezone.utc)` (or equivalent) so missing defaults produce UTC now
- [ ] `token` on Party is `str | None`
- [ ] `previous_state` on ActionLog is `str | None` (JSON-serialized snapshot, not a dict)
- [ ] `backend/app/schemas/__init__.py` exists and exports: `PartyResponse`, `TableResponse`, `ActionLogResponse`, `AppSettingsResponse`, `CreatePartyRequest`, `UpdatePartyRequest`, `CreateTableRequest`, `UpdateTableRequest`, `PinVerifyRequest`, `PinChangeRequest`
- [ ] Every request schema has a `field_validator` enforcing `party_size` is between 1 and 12 (inclusive)
- [ ] Every request schema has a `field_validator` enforcing `capacity` is between 1 and 20 (inclusive)
- [ ] `PinVerifyRequest` and `PinChangeRequest` have a `field_validator` enforcing the pin field contains only digits (and is 4–8 characters long)
- [ ] `uv run pytest` passes with no new failures (the existing `test_health.py` must still pass)
- [ ] `uv run mypy backend/` or `uv run pyright backend/` exits clean (install whichever is available; if neither is installed, add the chosen one to `dev` dependency-group in `pyproject.toml` and note it)

## Out of scope

- Generating NanoID tokens (handled in Task 23 with `nanoid` package)
- Business logic, status transition rules, or wait-time calculation (handled in Task 26)
- Database models or SQLAlchemy references (backend uses in-memory store per constraints)
- Router endpoints or API wiring (Tasks 26–30)
- NotificationLog model (referenced in plan.md but not required by any active backend task)
- Response schemas that mirror the dataclasses exactly — keep them minimal; no computed or derived fields

## Constraints

- Files must stay inside `backend/app/models/` and `backend/app/schemas/`
- Use Python `dataclasses.dataclass` for models; do not use Pydantic models as domain entities
- Use Pydantic v2 (`BaseModel`, `field_validator`, `model_validator`) for all schemas
- Do not import or reference any database library (no SQLAlchemy, no asyncpg, no aiosqlite)
- Use only standard-library imports plus `pydantic` (already available via `fastapi[standard]`)
- All `datetime` fields must be timezone-aware UTC
- Request schemas must be distinct from response schemas (response schemas should not accept mutable input)
- Keep schemas minimal — no `@computed_field`, no custom `__init__`, no business logic
