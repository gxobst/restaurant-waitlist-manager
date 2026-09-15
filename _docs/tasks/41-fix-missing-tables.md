## Goal

On first startup (empty database), the backend auto-seeds a default set of tables and settings so the frontend always has data to display. Subsequent restarts preserve user-created data; re-running the seed script from the CLI is safe and idempotent.

### Root cause

`backend/app/main.py` lifespan calls `store.clear()` on every startup, wiping all data. The existing `backend/seed.py` imports from `app.store.memory` (the old `MemoryStore`) instead of `app.store.database` (`DatabaseStore`), and uses synchronous calls against an async store — so it raises `RuntimeError` or simply does nothing. Result: every restart produces an empty database, and the frontend always shows "No tables available" in the Seat modal.

## Acceptance criteria

- [x] `backend/seed.py` imports `store` from `app.store` (which resolves to `DatabaseStore` via `app.store.__init__`), not from `app.store.memory`
- [x] `seed.py` defines an `async def seed()` coroutine that uses `await` on all store method calls
- [x] The `if __name__ == "__main__"` block runs the async seed via `asyncio.run(seed())`
- [x] Running `uv run seed.py` from the `backend/` directory exits with code 0 and prints no errors
- [x] After running `uv run seed.py`, `GET /api/tables` returns exactly 6 tables with these capacity/label pairs: `(2, "Table 1")`, `(2, "Table 2")`, `(4, "Table 3")`, `(4, "Table 4")`, `(6, "Table 5")`, `(8, "Table 6")`
- [x] After running `uv run seed.py`, the following settings exist: `manager_pin_hash` (a bcrypt hash), `avg_turnover_time` = `"30"`, `waitlist_paused` = `"false"`
- [x] Running `uv run seed.py` a second time does NOT double the table count or settings (idempotent — conditional on empty DB)
- [x] `backend/app/main.py` lifespan calls `store._ensure_tables()` to create schema if needed, then seeds only when `await store.get_tables()` returns an empty list
- [x] `backend/app/main.py` lifespan does NOT call `store.clear()` (removing the unconditional wipe)
- [x] After a fresh server start with no `data/waitlist.db`, `GET /api/tables` returns the 6 seeded tables
- [x] After a restart with an existing `data/waitlist.db` containing user-created tables, those tables are preserved (no duplication, no wipe)
- [x] `uv run pytest` passes all tests (current count; do not add or remove tests in this task)
- [x] `uv run pyright backend/` type-checks clean
- [x] No new dependencies are added to `pyproject.toml`

## Out of scope

- Seeding parties on first run — parties are user-created and transient; only tables and settings are seeded
- Configurable seed data (env vars, config files, or per-restaurant customization) — follow up as a separate task
- Database migration of any existing `MemoryStore` data to `DatabaseStore`
- Removing `store.clear()` from test fixtures (`setup_function` in test files and `clean_store` in `conftest.py`) — tests already handle their own isolation
- Adding a CLI flag to force-reseed (e.g. `--force`) — out of scope for MVP
- Seeding action logs or notification logs

## Constraints

- Files to change: `backend/seed.py` and `backend/app/main.py` only
- Do not modify any test files, `conftest.py`, router files, or store implementations
- The seed table layout must be exactly: 2-top × 2, 4-top × 2, 6-top × 1, 8-top × 1, labeled "Table 1" through "Table 6" in that order
- The conditional seed check must use `await store.get_tables()` (or equivalent) — if the result is truthy (tables exist), skip seeding
- `_ensure_tables()` must still be called unconditionally in the lifespan to guarantee schema creation on first boot
- The `store.clear()` call currently in `main.py`'s lifespan must be removed entirely; it is redundant because tests reset state via `setup_function` and `conftest.py`
- Use `asyncio.run(seed())` in the CLI entry point; the lifespan is already async so it can `await seed()` directly
- All timestamps must use `datetime.now(timezone.utc)`
- Do not import or reference any FastAPI router modules in `seed.py`
