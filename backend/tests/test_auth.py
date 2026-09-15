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


def test_verify_pin_creates_token():
    resp = client.post("/api/settings/pin", json={"pin": "1234"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is True
    assert data["token"] is not None
    token = data["token"]
    assert store.get_token(token) is not None


def test_invalid_pin_no_token():
    resp = client.post("/api/settings/pin", json={"pin": "0000"})
    assert resp.status_code == 401


def test_token_lifecycle():
    resp = client.post("/api/settings/pin", json={"pin": "1234"})
    token = resp.json()["token"]
    assert store.get_token(token) is not None
    store.remove_token(token)
    assert store.get_token(token) is None


def test_token_used_for_protected_endpoint():
    resp = client.post("/api/settings/pin", json={"pin": "1234"})
    token = resp.json()["token"]
    resp = client.get(
        "/api/reports/daily",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200


def test_token_rejected_when_removed():
    resp = client.post("/api/settings/pin", json={"pin": "1234"})
    token = resp.json()["token"]
    store.remove_token(token)
    resp = client.get(
        "/api/reports/daily",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 401


def test_missing_token_header():
    resp = client.get("/api/reports/daily")
    assert resp.status_code == 422


def test_wrong_pin_format():
    resp = client.post("/api/settings/pin", json={"pin": "12"})
    assert resp.status_code == 422
    resp = client.post("/api/settings/pin", json={"pin": "123456789"})
    assert resp.status_code == 422


def test_change_pin_invalidates_old():
    client.post("/api/settings/pin", json={"pin": "1234"})
    client.patch("/api/settings/pin", json={
        "current_pin": "1234",
        "new_pin": "9999",
    })
    resp = client.post("/api/settings/pin", json={"pin": "1234"})
    assert resp.status_code == 401
    resp = client.post("/api/settings/pin", json={"pin": "9999"})
    assert resp.status_code == 200
    assert resp.json()["valid"] is True
