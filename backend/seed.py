from datetime import datetime, timezone

from app.auth.manager import hash_pin
from app.models import PartyStatus
from app.store.memory import store


def seed() -> None:
    store.clear()

    party_data = [
        ("Smith", 4, PartyStatus.waiting),
        ("Johnson", 2, PartyStatus.waiting),
        ("Williams", 6, PartyStatus.notified),
        ("Brown", 2, PartyStatus.seated),
        ("Jones", 8, PartyStatus.waiting),
        ("Garcia", 3, PartyStatus.canceled),
        ("Miller", 4, PartyStatus.waiting),
    ]

    for name, size, status in party_data:
        party = store.add_party(name, size)
        store.update_party(
            party.id,
            {"status": status},
        )

    table_data = [
        (2, "Table 1"),
        (4, "Table 2"),
        (4, "Table 3"),
        (6, "Table 4"),
        (6, "Table 5"),
        (8, "Table 6"),
    ]
    for capacity, label in table_data:
        store.add_table(capacity, label)

    pin_hash = hash_pin("1234")
    store.set_setting("manager_pin_hash", pin_hash)
    store.set_setting("avg_turnover_time", "30")
    store.set_setting("waitlist_paused", "False")


if __name__ == "__main__":
    seed()
    print("Seed complete.")
