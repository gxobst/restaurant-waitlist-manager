## Goal

`backend/app/auth/` provides pure PIN hashing/verification, UUID token generation, token revocation, and two FastAPI dependencies (`get_current_user_token`, `require_manager`) that gate protected endpoints with 401/403 responses.

## Acceptance criteria

- [ ] `backend/app/auth/manager.py` exports `hash_pin(pin: str) -> str` that returns a bcrypt hash starting with `$2b$12$`
- [ ] `hash_pin("1234")` produces a hash that `verify_pin(hash, "1234")` returns `True` for
- [ ] `verify_pin(hash, "0000")` returns `False` for the hash produced by `hash_pin("1234")`
- [ ] `verify_pin("not-a-hash", "1234")` returns `False` (graceful handling of malformed stored hashes)
- [ ] `generate_token()` returns a non-empty string matching the UUID v4 format (8-4-4-4-12 hex digits)
- [ ] `backend/app/auth/manager.py` exports `issue_token(pin: str) -> str | None` that: reads `"manager_pin_hash"` from the store, returns `None` if no hash is stored or the PIN is wrong, otherwise generates a token, stores it in `auth_tokens` with `{"scopes": ["manager"], "created_at": datetime.now(timezone.utc)}`, and returns the token string
- [ ] `issue_token("1234")` returns a token string and `store.get_token(result)` is not `None` when the store has been seeded with `hash_pin("1234")`
- [ ] `issue_token("wrong")` returns `None` when the stored PIN is `"1234"`
- [ ] `issue_token("1234")` returns `None` when no `"manager_pin_hash"` setting exists in the store
- [ ] `revoke_token(token)` removes the token from the store; calling it on a non-existent token does not raise
- [ ] `backend/app/auth/dependencies.py` exports `get_current_user_token` that raises `HTTPException(401)` when the `Authorization` header is missing
- [ ] `get_current_user_token` raises `HTTPException(401)` when the token string is empty after stripping `"Bearer "` prefix
- [ ] `get_current_user_token` raises `HTTPException(401)` when the token is not present in `store.auth_tokens`
- [ ] `get_current_user_token` returns the raw token string (without `"Bearer "` prefix) when the token is valid and not expired
- [ ] `get_current_user_token` raises `HTTPException(401)` with detail `"Token expired"` when the stored token's `created_at` is more than 24 hours old
- [ ] `backend/app/auth/dependencies.py` exports `require_manager` that raises `HTTPException(401)` for any token rejected by `get_current_user_token`
- [ ] `require_manager` raises `HTTPException(403)` when the token exists but `scopes` does not contain `"manager"`
- [ ] `require_manager` passes silently (returns `None`) when the token is valid and has `"manager"` scope
- [ ] `uv run pytest backend/tests/test_auth.py` passes (new or updated test file covering all above unit cases)
- [ ] `uv run pyright backend/` type-checks clean

## Out of scope

- Router endpoints for PIN verify/change — moved to #28
- WebSocket authentication — moved to #30
- JWT or persistent token storage — simple in-memory string store only
- PIN format validation at the auth layer (handled by request schemas in #28)
- Seeding the default PIN into the store — handled in `main.py` lifespan (already present)

## Constraints

- Files must stay inside `backend/app/auth/` (`manager.py` and `dependencies.py`)
- Tests must stay inside `backend/tests/test_auth.py`
- Use `bcrypt` directly (via `passlib[bcrypt]`, already installed); do not add new packages
- `python-multipart` is NOT required for this task (remove from constraints if present)
- The store singleton is imported from `app.store.memory` — do not modify the store interface
- `get_current_user_token` must accept an optional `Authorization` header (default `None`) so missing headers produce 401, not 422
- Token data stored in `auth_tokens` must be a dict with keys `"scopes"` (list of str) and `"created_at"` (datetime, UTC-aware)
- All functions in `manager.py` except `revoke_token` and `issue_token` are pure (no store interaction)
- Do not import or reference any router module from `backend/app/auth/`
