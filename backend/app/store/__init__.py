import asyncio
import os
import types
from uuid import UUID

from app.store.database import DatabaseStore, engine, store as _db_store
from sqlalchemy import text


async def patched_clear(self) -> None:
    """Drop and recreate all tables reliably."""
    # Use DROP TABLE IF EXISTS which is safe even if tables don't exist
    try:
        async with engine.begin() as conn:
            await conn.execute(text("DROP TABLE IF EXISTS action_logs"))
            await conn.execute(text("DROP TABLE IF EXISTS auth_tokens"))
            await conn.execute(text("DROP TABLE IF EXISTS settings"))
            await conn.execute(text("DROP TABLE IF EXISTS parties"))
            await conn.execute(text("DROP TABLE IF EXISTS tables"))
            await conn.commit()
    except Exception:
        pass
    
    # Recreate tables
    await self._ensure_tables()
    self._next_position = 1


async def patched_get_party(self, party_id):
    if isinstance(party_id, str):
        party_id = UUID(party_id)
    return await DatabaseStore.get_party(self, party_id)


async def patched_update_party(self, party_id, updates):
    if isinstance(party_id, str):
        party_id = UUID(party_id)
    return await DatabaseStore.update_party(self, party_id, updates)


async def patched_delete_party(self, party_id):
    if isinstance(party_id, str):
        party_id = UUID(party_id)
    return await DatabaseStore.delete_party(self, party_id)


async def patched_undo_last_action(self, party_id):
    if isinstance(party_id, str):
        party_id = UUID(party_id)
    return await DatabaseStore.undo_last_action(self, party_id)


async def patched_get_table(self, table_id):
    if isinstance(table_id, str):
        table_id = UUID(table_id)
    return await DatabaseStore.get_table(self, table_id)


async def patched_update_table(self, table_id, updates):
    if isinstance(table_id, str):
        table_id = UUID(table_id)
    return await DatabaseStore.update_table(self, table_id, updates)


async def patched_delete_table(self, table_id):
    if isinstance(table_id, str):
        table_id = UUID(table_id)
    return await DatabaseStore.delete_table(self, table_id)


# Apply patches to the singleton instance
_db_store.clear = types.MethodType(patched_clear, _db_store)
_db_store.get_party = types.MethodType(patched_get_party, _db_store)
_db_store.update_party = types.MethodType(patched_update_party, _db_store)
_db_store.delete_party = types.MethodType(patched_delete_party, _db_store)
_db_store.undo_last_action = types.MethodType(patched_undo_last_action, _db_store)
_db_store.get_table = types.MethodType(patched_get_table, _db_store)
_db_store.update_table = types.MethodType(patched_update_table, _db_store)
_db_store.delete_table = types.MethodType(patched_delete_table, _db_store)

store = _db_store
