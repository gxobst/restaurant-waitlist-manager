import asyncio
from fastapi.testclient import TestClient
from app.main import app
from app.store import store

client = TestClient(app)


def setup_function():
    asyncio.run(store.clear())
    from app.auth.manager import hash_pin
    asyncio.run(store.set_setting("manager_pin_hash", hash_pin("1234")))
    asyncio.run(store.set_setting("avg_turnover_time", "30"))
    asyncio.run(store.set_setting("waitlist_paused", "false"))


def test_create_party():
    resp = client.post(
        "/api/waitlist",
        json={"name": "Alice", "party_size": 4},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Alice"
    assert data["party_size"] == 4
    assert data["status"] == "waiting"
    assert data["token"] is not None
    assert data["position"] is not None


def test_list_parties():
    client.post("/api/waitlist", json={"name": "A", "party_size": 2})
    client.post("/api/waitlist", json={"name": "B", "party_size": 3})
    resp = client.get("/api/waitlist")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    assert data[0]["name"] == "A"
    assert data[1]["name"] == "B"


def test_update_party_status_waiting_to_notified():
    create_resp = client.post("/api/waitlist", json={"name": "Bob", "party_size": 2})
    party_id = create_resp.json()["id"]
    resp = client.patch(f"/api/waitlist/{party_id}", json={"status": "notified"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "notified"
    assert data["notified_at"] is not None


def test_update_party_status_notified_to_seated():
    create_resp = client.post("/api/waitlist", json={"name": "Carol", "party_size": 2})
    party_id = create_resp.json()["id"]
    client.patch(f"/api/waitlist/{party_id}", json={"status": "notified"})
    resp = client.patch(f"/api/waitlist/{party_id}", json={"status": "seated"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "seated"
    assert data["seated_at"] is not None


def test_update_party_invalid_transition():
    create_resp = client.post("/api/waitlist", json={"name": "Dave", "party_size": 2})
    party_id = create_resp.json()["id"]
    resp = client.patch(f"/api/waitlist/{party_id}", json={"status": "canceled"})
    assert resp.status_code == 200
    client.patch(f"/api/waitlist/{party_id}", json={"status": "notified"})
    resp = client.patch(f"/api/waitlist/{party_id}", json={"status": "waiting"})
    assert resp.status_code == 400


def test_delete_party():
    create_resp = client.post("/api/waitlist", json={"name": "Eve", "party_size": 2})
    party_id = create_resp.json()["id"]
    resp = client.delete(f"/api/waitlist/{party_id}")
    assert resp.status_code == 204
    resp = client.get("/api/waitlist")
    assert len(resp.json()) == 0


def test_delete_party_not_found():
    from uuid import uuid4
    resp = client.delete(f"/api/waitlist/{uuid4()}")
    assert resp.status_code == 404


def test_undo_last_action():
    create_resp = client.post("/api/waitlist", json={"name": "Frank", "party_size": 2})
    party_id = create_resp.json()["id"]
    client.patch(f"/api/waitlist/{party_id}", json={"status": "notified"})
    resp = client.post(f"/api/waitlist/{party_id}/undo")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "waiting"


def test_undo_no_logs():
    create_resp = client.post("/api/waitlist", json={"name": "Grace", "party_size": 2})
    party_id = create_resp.json()["id"]
    resp = client.post(f"/api/waitlist/{party_id}/undo")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "waiting"


def test_get_party_by_token():
    create_resp = client.post("/api/waitlist", json={"name": "Hank", "party_size": 2})
    token = create_resp.json()["token"]
    resp = client.get(f"/api/waitlist/token/{token}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Hank"


def test_get_party_by_token_not_found():
    resp = client.get("/api/waitlist/token/nonexistent")
    assert resp.status_code == 404


def test_confirm_waiting():
    create_resp = client.post("/api/waitlist", json={"name": "Ivy", "party_size": 2})
    token = create_resp.json()["token"]
    resp = client.post(f"/api/waitlist/token/{token}/confirm")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "notified"
    assert data["notified_at"] is not None


def test_confirm_waiting_not_found():
    resp = client.post("/api/waitlist/token/nonexistent/confirm")
    assert resp.status_code == 404


def test_cancel_by_token():
    create_resp = client.post("/api/waitlist", json={"name": "Jack", "party_size": 2})
    token = create_resp.json()["token"]
    resp = client.post(f"/api/waitlist/token/{token}/cancel")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "canceled"
    assert data["canceled_at"] is not None


def test_update_party_not_found():
    from uuid import uuid4
    resp = client.patch(f"/api/waitlist/{uuid4()}", json={"name": "Nobody"})
    assert resp.status_code == 404


def test_create_party_validation():
    resp = client.post("/api/waitlist", json={"name": "", "party_size": 2})
    assert resp.status_code == 422
    resp = client.post("/api/waitlist", json={"name": "x", "party_size": 0})
    assert resp.status_code == 422
