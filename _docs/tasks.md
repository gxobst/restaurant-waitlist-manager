---

 ✅

Goal: The backend can verify a 4–8 digit PIN, issue a short-lived bearer token, and protect endpoints with a FastAPI dependency that validates the token.

Acceptance criteria:
- [ ] `backend/app/auth/manager.py` exports `hash_pin`, `verify_pin`, `generate_token`, `revoke_token`
- [ ] `hash_pin("1234")` produces a bcrypt hash starting with `$2b$12$`
- [ ] `verify_pin(hash, "1234")` returns True; `verify_pin(hash, "wrong")` returns False
- [ ] `generate_token()` returns a UUID v4 string
- [ ] `get_current_user_token` dependency raises `HTTPException(401)` for missing or invalid tokens
- [ ] `require_manager` dependency raises `HTTPException(403)` for valid token without manager scope
- [ ] Token is added to store on verify success and removed on revoke
- [ ] Malformed stored PIN hash does not crash verification
- [ ] Empty token after stripping "Bearer " is rejected with 401
- [ ] `uv run pytest` passes
- [ ] `uv run pyright backend/` type-checks clean

Out of scope:
- Router endpoints for PIN verification — Task 28
- JWT or session management — simple in-memory string tokens only
- Rate limiting on PIN attempts
- Password reset or account recovery

Constraints:
- Files: `backend/app/auth/__init__.py`, `backend/app/auth/manager.py`, `backend/app/auth/dependencies.py`
- Install `passlib[bcrypt]` via uv
- Do not add any router endpoints
- The token is a simple UUID string stored in-memory; no JWT needed
- PIN hashes are stored in the settings store under key `"manager_pin_hash"`

---

 ✅

Goal: The in-memory store is populated with sample parties, tables, and settings so the frontend displays meaningful data on first load.

Acceptance criteria:
- [ ] `backend/seed.py` imports the store and calls `store.clear()` then inserts data
- [ ] At least 3 parties in `waiting` status with names, party sizes, phone numbers
- [ ] At least 1 party in `notified` status
- [ ] At least 1 party in `seated` status
- [ ] At least 6 tables covering capacities 2, 4, 6, and 8
- [ ] Default PIN "1234" is hashed and stored via `store.set_setting("manager_pin_hash", ...)`
- [ ] `avg_turnover_time` setting defaults to 30
- [ ] `waitlist_paused` defaults to False
- [ ] Running `uv run seed.py` completes without errors
- [ ] Running seed twice does not increase the count of parties, tables, settings, or action logs
- [ ] At least 2 action logs with non-null `previous_state` exist for undo demonstration

Out of scope:
- Router endpoints — separate task
- Tests for seeding — verified by running seed.py manually
- Persistence to disk — in-memory only
- Notification log entries

Constraints:
- File: `backend/seed.py` only
- Use `bcrypt` to hash the PIN "1234" (install via uv)
- Use `datetime.now(timezone.utc)` for timestamps
- Keep the seed data small and deterministic (same names, sizes, capacities every run)
- Do not create any router endpoints

---

 ✅

Goal: All waitlist endpoints from the OpenAPI spec are implemented: list, create, update, delete, undo, and the three guest-facing token endpoints.

Acceptance criteria:
- [ ] `GET /api/waitlist` returns parties sorted ascending by position
- [ ] `GET /api/waitlist` includes calculated `estimated_wait` using `avg_turnover_time` from store
- [ ] `POST /api/waitlist` creates a party with UUID, NanoID token, status=waiting
- [ ] `POST /api/waitlist` writes an ActionLog entry with `action="created"`
- [ ] `PATCH /api/waitlist/{id}` with status "notified" on waiting party succeeds (200)
- [ ] `PATCH /api/waitlist/{id}` with status "seated" on notified party succeeds (200)
- [ ] `PATCH /api/waitlist/{id}` with invalid transition returns HTTP 409
- [ ] `PATCH /api/waitlist/{id}` writes an ActionLog with previous_state snapshot
- [ ] `DELETE /api/waitlist/{id}` returns 204 and removes the party
- [ ] `DELETE /api/waitlist/{id}` writes an ActionLog with `action="deleted"`
- [ ] `DELETE /api/waitlist/{id}` for non-existent party returns 404
- [ ] `POST /api/waitlist/{id}/undo` restores the party from the last ActionLog
- [ ] `POST /api/waitlist/{id}/undo` on party with no logs returns 409
- [ ] `POST /api/waitlist/{id}/undo` preserves the ActionLog entry (allows re-undo)
- [ ] `GET /api/waitlist/token/{token}` returns the party when token exists
- [ ] `GET /api/waitlist/token/{token}` returns 404 when token not found
- [ ] `POST /api/waitlist/token/{token}/confirm` transitions waiting→notified
- [ ] `POST /api/waitlist/token/{token}/cancel` sets status to canceled
- [ ] `estimated_wait` uses configured `avg_turnover_time`, not hardcoded value
- [ ] `uv run pytest` passes
- [ ] `uv run pyright backend/` type-checks clean

Out of scope:
- WebSocket push notifications
- Frontend UI for guest endpoints
- Bulk operations
- SMS/email notification delivery

Constraints:
- Create `backend/app/routers/waitlist.py`
- Register router in `backend/app/main.py` under prefix `/api/waitlist`
- Status transitions: `waiting→{notified,canceled,no_show}`, `notified→{seated,canceled,no_show}`
- ActionLog `previous_state` must be JSON-serialized Party snapshot

---

 ✅

Goal: Table listing, creation, update, and deletion endpoints are implemented. Creation and deletion require manager authentication.

Acceptance criteria:
- [ ] `GET /api/tables` returns all tables without requiring authentication
- [ ] `POST /api/tables` creates a table with UUID, defaults is_occupied=False, requires manager token
- [ ] `POST /api/tables` without a valid token returns HTTP 401
- [ ] `PATCH /api/tables/{id}` updates is_occupied and occupied_by_party_id
- [ ] `DELETE /api/tables/{id}` removes the table, requires manager token
- [ ] `DELETE /api/tables/{id}` without a valid token returns HTTP 401
- [ ] `DELETE /api/tables/{id}` for a non-existent table returns HTTP 404
- [ ] Occupying a table links it to a party_id; clearing unlinks it
- [ ] Deleting an occupied table succeeds (no block)
- [ ] `uv run pytest` passes
- [ ] `uv run pyright backend/` type-checks clean

Out of scope:
- Table editing UI (frontend)
- Automatic table assignment or capacity-matching logic
- Notification when a table is occupied/cleared

Constraints:
- Create `backend/app/routers/tables.py`
- Reuse `require_manager` auth dependency from Task 24 for POST and DELETE
- Do not add any notification logic

---

 ✅

Goal: PIN verification, PIN change, average turnover time, and waitlist pause state endpoints are implemented. PIN change requires the current PIN.

Acceptance criteria:
- [ ] `POST /api/settings/pin` with correct PIN returns `{"valid": true, "token": "..."}`
- [ ] `POST /api/settings/pin` with wrong PIN returns `{"valid": false}` and HTTP 401
- [ ] `PATCH /api/settings/pin` with correct current PIN and new PIN updates the hash and returns 204
- [ ] `PATCH /api/settings/pin` with wrong current PIN returns HTTP 401
- [ ] `GET /api/settings/avg-turnover-time` returns a number (default 30)
- [ ] `PATCH /api/settings/avg-turnover-time` with value 45 and valid token updates and returns 204
- [ ] `PATCH /api/settings/avg-turnover-time` with value 0 returns HTTP 422
- [ ] `PATCH /api/settings/avg-turnover-time` without token returns HTTP 401
- [ ] `GET /api/settings/waitlist-paused` returns a boolean
- [ ] `PATCH /api/settings/waitlist-paused` with token toggles and returns 204
- [ ] The token from `POST /api/settings/pin` is accepted by `require_manager`
- [ ] `uv run pytest` passes
- [ ] `uv run pyright backend/` type-checks clean

Out of scope:
- PIN change requiring the old token
- Audit logging for PIN changes
- Rate limiting on PIN attempts

Constraints:
- Create `backend/app/routers/settings.py`
- Reuse `verify_pin` and `hash_pin` from `backend/app/auth/manager.py`
- Reuse `require_manager` from `backend/app/auth/dependencies.py`
- Store PIN hash under key `"manager_pin_hash"`

---

 ✅

Goal: The daily report endpoint calculates and returns statistics: total parties, average wait time, no-show rate, and seat utilization.

Acceptance criteria:
- [ ] `GET /api/reports/daily` returns all five fields: date, total_parties, average_wait_minutes, no_show_rate, seat_utilization
- [ ] Without a valid manager token, the endpoint returns HTTP 401
- [ ] When the store is empty, all numeric fields return 0
- [ ] `date` is ISO 8601 date string (YYYY-MM-DD) for today
- [ ] `average_wait_minutes` is rounded to 1 decimal place
- [ ] `no_show_rate` and `seat_utilization` are floats between 0 and 1
- [ ] `uv run pytest` passes
- [ ] `uv run pyright backend/` type-checks clean

Out of scope:
- Multi-day or date-range report queries
- CSV/PDF export (frontend concern)
- Historical trend data

Constraints:
- Create `backend/app/routers/reports.py`
- Reuse `require_manager` auth dependency
- Date should be ISO 8601 date string (YYYY-MM-DD) for today

---

 ✅

Goal: The FastAPI application ties together all routers, configures CORS for the frontend dev server, starts the WebSocket connection manager on lifespan, and seeds data on startup.

Acceptance criteria:
- [ ] `GET /api/waitlist` works through the full app (not just the router in isolation)
- [ ] `GET /api/tables` works
- [ ] `GET /api/settings/pin` works
- [ ] `GET /api/reports/daily` requires auth and returns 401 without token
- [ ] CORS headers are present on responses (Allow-Origin: http://localhost:4827)
- [ ] On startup, the store is seeded with test data
- [ ] `ws://localhost:5173/ws/waitlist` accepts a WebSocket connection
- [ ] Broadcasting a waitlist_update message connects to the store's change events
- [ ] `uv run pytest` passes
- [ ] `uv run pyright backend/` type-checks clean

Out of scope:
- WebSocket authentication
- Reconnection logic on the server side
- Broadcasting only on party mutations (table mutations included too)

Constraints:
- Update `backend/app/main.py`
- Use FastAPI's `lifespan` parameter (not deprecated `on_event`)
- Use `websockets` library for WebSocket server
- Do not add any business logic -- this task is purely wiring

---

 ✅

Goal: Every waitlist endpoint is covered by tests: CRUD, status transitions, undo, guest token endpoints, and error cases.

Acceptance criteria:
- [ ] Test: `GET /api/waitlist` returns a list
- [ ] Test: `POST /api/waitlist` creates a party and returns it with status "waiting"
- [ ] Test: `PATCH /api/waitlist/{id}` with status "notified" on a waiting party succeeds
- [ ] Test: `PATCH /api/waitlist/{id}` with status "waiting" on a notified party returns 409
- [ ] Test: `DELETE /api/waitlist/{id}` returns 204
- [ ] Test: `POST /api/waitlist/{id}/undo` restores previous state
- [ ] Test: `GET /api/waitlist/token/{token}` returns the party
- [ ] Test: `POST /api/waitlist/token/{token}/confirm` returns updated party
- [ ] Test: `POST /api/waitlist/token/{token}/cancel` sets status to canceled
- [ ] Test: 404 when party ID does not exist
- [ ] Test: 422 when request body is invalid (e.g. party_size=0)
- [ ] All tests pass with `uv run pytest`
- [ ] Store is reset between tests

Out of scope:
- WebSocket tests — Task 35
- Auth-gated endpoint tests — Tasks 32 and 33
- Integration across multiple routers — Task 34

Constraints:
- Create `backend/tests/test_waitlist.py`
- Use `pytest` fixtures for app and store cleanup
- Use `httpx` (already available via FastAPI TestClient) for requests
- Do not test WebSocket in this file

---

 ✅

Goal: Table CRUD and settings (PIN, config) endpoints are fully tested, including auth gating.

Acceptance criteria:
- [ ] `test_tables.py`: GET returns tables without auth
- [ ] `test_tables.py`: POST without token returns 401
- [ ] `test_tables.py`: POST with valid token creates a table
- [ ] `test_tables.py`: PATCH updates is_occupied and occupied_by_party_id
- [ ] `test_tables.py`: DELETE without token returns 401
- [ ] `test_tables.py`: DELETE with token removes the table
- [ ] `test_settings.py`: POST /api/settings/pin with "1234" returns valid=true and a token
- [ ] `test_settings.py`: POST /api/settings/pin with wrong PIN returns valid=false
- [ ] `test_settings.py`: PATCH /api/settings/pin with correct current PIN succeeds
- [ ] `test_settings.py`: PATCH /api/settings/pin with wrong current PIN returns 401
- [ ] `test_settings.py`: GET /api/settings/avg-turnover-time returns a number
- [ ] `test_settings.py`: PATCH /api/settings/avg-turnover-time with valid token updates
- [ ] `test_settings.py`: PATCH /api/settings/avg-turnover-time out of range returns 422
- [ ] `test_settings.py`: GET /api/settings/waitlist-paused returns a boolean
- [ ] `test_settings.py`: PATCH /api/settings/waitlist-paused with token toggles
- [ ] All tests pass with `uv run pytest`
- [ ] Store is reset between tests

Out of scope:
- WebSocket tests
- Report calculation tests
- Full integration across routers

Constraints:
- Split into two test files: `test_tables.py` and `test_settings.py`
- Reuse the token obtained from the PIN verify endpoint for protected requests
- Do not test WebSocket in these files

---

 ✅

Goal: Report calculations and auth token lifecycle are tested end-to-end through the HTTP layer.

Acceptance criteria:
- [ ] `test_reports.py`: GET /api/reports/daily returns correct total_parties from seeded data
- [ ] `test_reports.py`: no_show_rate is calculated correctly
- [ ] `test_reports.py`: seat_utilization is calculated correctly
- [ ] `test_reports.py`: unauthenticated request returns 401
- [ ] `test_auth.py`: valid PIN returns a token
- [ ] `test_auth.py`: revoked token is rejected (401)
- [ ] `test_auth.py`: token older than 24h is rejected
- [ ] All tests pass with `uv run pytest`
- [ ] Store is reset between tests

Out of scope:
- Token generation internals (bcrypt hashing)
- WebSocket auth
- Rate limiting on PIN attempts

Constraints:
- Use `TestClient` with the real app
- For expiry testing, manipulate the stored token's created_at timestamp directly
- Do not test WebSocket in these files

---

 ✅

Goal: A single end-to-end test exercises the complete host workflow through the real HTTP API: add party -> notify -> seat with table -> undo.

Acceptance criteria:
- [ ] Test adds a party and asserts it appears in the waitlist
- [ ] Test notifies the party and asserts status changed to "notified"
- [ ] Test creates a table and seats the party on it
- [ ] Test asserts the party status is now "seated" and the table is occupied
- [ ] Test calls undo on the seat action and asserts the party is back to "notified"
- [ ] Test calls GET /api/reports/daily and asserts total_parties increased
- [ ] Test uses the manager PIN to obtain a token and reuses it for all protected calls
- [ ] All assertions pass
- [ ] `uv run pytest` passes

Out of scope:
- WebSocket broadcast verification
- Frontend UI verification
- Error-path coverage (network failures, invalid transitions)

Constraints:
- Use the real app, not mocked services
- Reset the store before the test via a fixture
- Use `pytest` sequential steps (not separate test functions)
- Do not test WebSocket in this file

---

 ✅

Goal: The WebSocket endpoint is tested: connections are accepted, messages are broadcast on store mutations, and clients disconnect cleanly.

Acceptance criteria:
- [ ] Test: client can connect to `ws://localhost:5173/ws/waitlist`
- [ ] Test: after connecting, a party creation via HTTP triggers a `waitlist_update` message received by the WS client
- [ ] Test: multiple connected clients all receive the broadcast
- [ ] Test: after client disconnects, it is removed from the client set
- [ ] `uv run pytest` passes
- [ ] Store is reset between tests

Out of scope:
- WebSocket authentication
- Reconnection logic on the server side
- Message payload validation beyond `{"type": "waitlist_update"}`

Constraints:
- Use `pytest-asyncio` for async test fixtures (install via uv)
- The WebSocket URL is configured in the app; tests should connect to the test server
- Use `anyio` or `websockets` test utilities for async WebSocket testing

---

 ✅

Goal: A `start.ps1` script at the repository root launches both the backend (port 5173) and frontend (port 4827) together, and the frontend renders real data from the backend instead of mock services.

Acceptance criteria:
- [ ] `start.ps1` exists at the repository root
- [ ] Running `start.ps1` starts both backend and frontend
- [ ] Backend is reachable at `http://localhost:5173/health` before frontend starts
- [ ] Frontend is reachable at `http://localhost:4827`
- [ ] Frontend displays seeded party data from the backend (not mock data)
- [ ] The HostView shows at least one party in the waitlist
- [ ] Adding a party via the frontend form creates it in the backend store
- [ ] `uv run pytest` in backend still passes
- [ ] `npm run test` in frontend still passes

Out of scope:
- Production deployment configuration
- Docker or container orchestration
- HTTPS or certificate configuration
- Cross-platform (bash) support — PowerShell only per Windows environment
- Auto-restart on crash — manual restart is acceptable

Constraints:
- The start script should work on Windows (PowerShell)
- Kill any existing processes on ports 5173 and 4827 before starting
- Track child PIDs for clean shutdown
- Do not use default ports (3000, 8000) -- use the assigned 5173/4827
