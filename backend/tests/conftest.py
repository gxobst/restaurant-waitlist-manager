import asyncio
import os

import pytest
from app.store import store


@pytest.fixture(autouse=True, scope="session")
def ensure_db_initialized():
    """Ensure database tables exist before any tests run."""
    # Use in-memory database for tests
    os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
    yield


@pytest.fixture(autouse=True)
def clean_store():
    """Clean database before and after each test."""
    from app.store.database import engine
    from app.models.database import Base
    
    async def _clean():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
        from app.store import store as s
        s._next_position = 1
        from app.auth.manager import hash_pin
        await s.set_setting("manager_pin_hash", hash_pin("1234"))
        await s.set_setting("avg_turnover_time", "30")
        await s.set_setting("waitlist_paused", "false")
    
    asyncio.run(_clean())
    yield
    asyncio.run(_clean())
