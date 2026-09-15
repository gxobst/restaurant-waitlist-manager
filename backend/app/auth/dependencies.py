from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import Depends, Header, HTTPException

from app.store import store


def get_current_user_token(authorization: Annotated[str, Header(...)]) -> str:
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing token")
    return token


async def require_manager(token: Annotated[str, Depends(get_current_user_token)]) -> None:
    stored = await store.get_token(token)
    if stored is None:
        raise HTTPException(status_code=401, detail="Token not found")
    now = datetime.now(timezone.utc)
    created_at_raw = stored.get("created_at")
    if created_at_raw is not None:
        if isinstance(created_at_raw, (int, float)):
            token_created = datetime.fromtimestamp(created_at_raw, tz=timezone.utc)
        elif isinstance(created_at_raw, datetime):
            token_created = created_at_raw
            if token_created.tzinfo is None:
                token_created = token_created.replace(tzinfo=timezone.utc)
        else:
            token_created = datetime.fromisoformat(str(created_at_raw)).replace(tzinfo=timezone.utc)
        if now - token_created > timedelta(hours=24):
            await store.remove_token(token)
            raise HTTPException(status_code=401, detail="Token expired")
    scopes = stored.get("scopes", [])
    if not isinstance(scopes, list) or "manager" not in scopes:
        raise HTTPException(status_code=403, detail="Insufficient scope")
