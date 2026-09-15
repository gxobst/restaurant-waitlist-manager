import asyncio
import importlib

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


@pytest.fixture(autouse=True, scope="session")
def ensure_db_initialized():
    """Use in-memory database for all tests."""
    import app.store.database as db_module

    new_engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    new_session_maker = async_sessionmaker(new_engine, class_=AsyncSession, expire_on_commit=False)
    # Patch module-level variables so store methods use in-memory DB
    db_module.engine = new_engine
    db_module.async_session_maker = new_session_maker
    yield


@pytest.fixture(autouse=True)
def clean_store():
    """Clean database before and after each test."""
    import app.store.database as db_module
    from app.store.database import store as s
    from app.models.database import Base

    async def _clean():
        async with db_module.engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
        s._next_position = 1
        from app.auth.manager import hash_pin
        await s.set_setting("manager_pin_hash", hash_pin("1234"))
        await s.set_setting("avg_turnover_time", "30")
        await s.set_setting("waitlist_paused", "false")

    asyncio.run(_clean())
    yield
    asyncio.run(_clean())
