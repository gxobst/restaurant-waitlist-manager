from fastapi.testclient import TestClient
from app.main import app
from app.store.memory import store

client = TestClient(app)


def setup_function():
    store.clear()
    from app.auth.manager import hash_pin
    store.set_setting("manager_pin_hash", hash_pin("1234"))
    store.set_setting("avg_turnover_time", "30")
    store.set_setting("waitlist_paused", "false")


def test_list_tables_empty():
    resp = client.get("/api/tables")
    assert resp.status_code == 200
    assert resp.json() == []


def test_create_table():
    resp = client.post("/api/tables", json={"capacity": 4, "label": "Table 1"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["capacity"] == 4
    assert data["label"] == "Table 1"
    assert data["is_occupied"] is False
    assert data["id"] is not None


def test_get_tables():
    client.post("/api/tables", json={"capacity": 2, "label": "T1"})
    client.post("/api/tables", json={"capacity": 6, "label": "T2"})
    resp = client.get("/api/tables")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2


def test_update_table():
    create_resp = client.post("/api/tables", json={"capacity": 4, "label": "Table 1"})
    table_id = create_resp.json()["id"]
    resp = client.patch(f"/api/tables/{table_id}", json={"is_occupied": True})
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_occupied"] is True


def test_update_table_not_found():
    from uuid import uuid4
    resp = client.patch(f"/api/tables/{uuid4()}", json={"label": "X"})
    assert resp.status_code == 404


def test_delete_table():
    create_resp = client.post("/api/tables", json={"capacity": 2, "label": "T1"})
    table_id = create_resp.json()["id"]
    resp = client.delete(f"/api/tables/{table_id}")
    assert resp.status_code == 204
    resp = client.get("/api/tables")
    assert resp.json() == []


def test_delete_table_not_found():
    from uuid import uuid4
    resp = client.delete(f"/api/tables/{uuid4()}")
    assert resp.status_code == 404


def test_create_table_validation():
    resp = client.post("/api/tables", json={"capacity": 0, "label": "T1"})
    assert resp.status_code == 422
    resp = client.post("/api/tables", json={"capacity": 4, "label": ""})
    assert resp.status_code == 422
