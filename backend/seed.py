import asyncio
from datetime import datetime, timezone

from app.auth.manager import hash_pin
from app.store import store


async def seed() -> None:
    tables = await store.get_tables()
    if tables:
        return

    table_data = [
        (2, "Table 1"),
        (2, "Table 2"),
        (4, "Table 3"),
        (4, "Table 4"),
        (6, "Table 5"),
        (8, "Table 6"),
    ]
    for capacity, label in table_data:
        await store.add_table(capacity, label)

    pin_hash = hash_pin("1234")
    await store.set_setting("manager_pin_hash", pin_hash)
    await store.set_setting("avg_turnover_time", "30")
    await store.set_setting("waitlist_paused", "false")


if __name__ == "__main__":
    asyncio.run(seed())
    print("Seed complete.")
