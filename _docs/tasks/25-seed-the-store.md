## Goal

`backend/seed.py` populates the in-memory store with deterministic sample data so the app has meaningful parties, tables, settings, and action logs on first run — and running it twice produces identical results with no duplicates.

## Acceptance criteria

- [ ] `backend/seed.py` exists and imports `store` from `app.store.memory`
- [ ] The `seed()` function calls `store.clear()` as its first action before inserting any data
- [ ] At least 3 parties are created with `status="waiting"`, each having a distinct name, `party_size`, and `phone`
- [ ] At least 1 party is created with `status="notified"`
- [ ] At least 1 party is created with `status="seated"`
- [ ] At least 6 tables are created covering all four capacities: 2, 4, 6, and 8
- [ ] The default PIN `"1234"` is hashed via `bcrypt.hashpw` (or the existing `hash_pin` helper) and stored with `store.set_setting("manager_pin_hash", <hash>)`
- [ ] `store.set_setting("avg_turnover_time", "30")` is called
- [ ] `store.set_setting("waitlist_paused", "false")` is called
- [ ] At least 2 `ActionLog` entries are added via `store.add_action_log()` referencing existing party IDs, each with a non-null `previous_state` JSON string
- [ ] Running `uv run seed.py` from the `backend/` directory exits with code 0 and produces no errors
- [ ] Running `uv run seed.py` a second time does not increase party count, table count, setting count, or action log count (verifiable by inspecting the store state or adding print assertions)
- [ ] All timestamps use `datetime.now(timezone.utc)`
- [ ] No router endpoints are created in this task

## Out of scope

- Writing unit tests for `seed.py` — covered in Task 31+ when routers exist
- Persisting seed data to disk or a database — the store is in-memory only
- Seeding notification logs or auth tokens — not needed for display purposes
- Any router or API wiring — that is Tasks 26–30
- Verifying `GET /api/waitlist` returns data — the waitlist router does not exist yet; reachability is tested when the router is built

## Constraints

- File: `backend/seed.py` only (standalone script, not inside `app/`)
- Use the existing `store` singleton from `app.store.memory`
- Use `bcrypt` for PIN hashing (available via `passlib[bcrypt]` already installed)
- Use `datetime.now(timezone.utc)` for all timestamps
- Seed data must be fully deterministic: same names, sizes, and labels on every run
- Party `status` transitions for seeded parties must be set directly on creation (the store sets `waiting` by default; use `store.update_party()` afterward for non-waiting statuses)
- Do not import or reference any FastAPI router modules
