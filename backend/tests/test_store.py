import json
import time
from datetime import datetime, timezone
from uuid import UUID, uuid4

from app.models import ActionLog, Party, PartyStatus, Table
from app.store.memory import store


def test_add_party_generates_uuid_and_token_sets_waiting():
    store.clear()
    party = store.add_party("Alice", 4)
    assert isinstance(party.id, UUID)
    assert isinstance(party.token, str) and len(party.token) > 0
    assert party.status == PartyStatus.waiting
    assert isinstance(party.created_at, datetime)
    assert isinstance(party.updated_at, datetime)
    assert party.position is not None


def test_list_parties_sorted_by_position():
    store.clear()
    p1 = store.add_party("First", 2)
    p2 = store.add_party("Second", 3)
    p3 = store.add_party("Third", 1)
    listed = store.list_parties()
    assert [p.name for p in listed] == ["First", "Second", "Third"]
    positions = [p.position or 0 for p in listed]
    assert positions[0] < positions[1] < positions[2]


def test_get_party_by_token():
    store.clear()
    party = store.add_party("Bob", 2)
    assert party.token is not None
    found = store.get_party_by_token(party.token)
    assert found is not None
    assert found.id == party.id
    assert store.get_party_by_token("nonexistent") is None


def test_update_party_partial():
    store.clear()
    party = store.add_party("Carol", 2)
    time.sleep(0.01)
    updated = store.update_party(party.id, {"name": "Carol Updated", "party_size": 4})
    assert updated is not None
    assert updated.name == "Carol Updated"
    assert updated.party_size == 4
    assert updated.status == PartyStatus.waiting
    assert updated.updated_at > party.updated_at


def test_update_party_not_found():
    store.clear()
    assert store.update_party(uuid4(), {"name": "x"}) is None


def test_delete_party():
    store.clear()
    party = store.add_party("Dave", 2)
    store.delete_party(party.id)
    assert store.get_party(party.id) is None
    store.delete_party(uuid4())


def test_add_action_log():
    store.clear()
    party = store.add_party("Eve", 2)
    previous = store.get_party(party.id)
    log = store.add_action_log(
        party.id,
        "status_change",
        previous_state=previous,
        created_by="admin",
    )
    assert isinstance(log.id, UUID)
    assert log.party_id == str(party.id)
    assert log.action == "status_change"
    assert log.created_by == "admin"
    assert log.previous_state is not None
    snapshot = json.loads(log.previous_state)
    assert snapshot["name"] == "Eve"


def test_get_action_logs_for_party_ordered_desc():
    store.clear()
    party = store.add_party("Frank", 2)
    store.add_action_log(party.id, "first")
    time.sleep(0.01)
    store.add_action_log(party.id, "second")
    logs = store.get_action_logs_for_party(party.id)
    assert len(logs) == 2
    assert logs[0].action == "second"
    assert logs[1].action == "first"


def test_add_table_defaults():
    store.clear()
    table = store.add_table(4, "Table 1")
    assert isinstance(table.id, UUID)
    assert table.is_occupied is False
    assert table.capacity == 4
    assert table.label == "Table 1"


def test_get_tables():
    store.clear()
    t1 = store.add_table(2, "T1")
    t2 = store.add_table(6, "T2")
    tables = store.get_tables()
    assert len(tables) == 2
    assert {t.id for t in tables} == {t1.id, t2.id}


def test_update_table():
    store.clear()
    table = store.add_table(4, "Table 1")
    updated = store.update_table(table.id, {"is_occupied": True, "label": "Table A"})
    assert updated is not None
    assert updated.is_occupied is True
    assert updated.label == "Table A"
    assert store.update_table(uuid4(), {"label": "x"}) is None


def test_delete_table():
    store.clear()
    table = store.add_table(2, "T1")
    store.delete_table(table.id)
    assert store.get_table(table.id) is None
    store.delete_table(uuid4())


def test_settings_set_and_get():
    store.clear()
    store.set_setting("max_party_size", "12")
    assert store.get_setting("max_party_size") == "12"
    assert store.get_setting("missing") is None


def test_tokens_add_and_remove():
    store.clear()
    store.add_token("abc123", ["read", "write"])
    assert store.get_token("abc123") == {"scopes": ["read", "write"]}
    store.remove_token("abc123")
    assert store.get_token("abc123") is None
    store.remove_token("nonexistent")


def test_clear_resets_everything():
    store.add_party("Person", 2)
    store.add_table(4, "T1")
    store.set_setting("k", "v")
    store.add_token("tok", ["r"])
    store.clear()
    assert store.list_parties() == []
    assert store.get_tables() == []
    assert store.get_setting("k") is None
    assert store.get_token("tok") is None


def test_singleton_import():
    from app.store.memory import store as imported_store
    from app.store import store as init_store
    assert imported_store is store
    assert init_store is store
