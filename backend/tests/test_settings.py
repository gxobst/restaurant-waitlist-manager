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


def test_verify_pin_correct():
    resp = client.post("/api/settings/pin", json={"pin": "1234"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is True
    assert "token" in data


def test_verify_pin_incorrect():
    resp = client.post("/api/settings/pin", json={"pin": "0000"})
    assert resp.status_code == 401


def test_verify_pin_invalid_format():
    resp = client.post("/api/settings/pin", json={"pin": "abc"})
    assert resp.status_code == 422


def test_change_pin():
    client.post("/api/settings/pin", json={"pin": "1234"})
    resp = client.patch("/api/settings/pin", json={
        "current_pin": "1234",
        "new_pin": "5678",
    })
    assert resp.status_code == 204
    resp = client.post("/api/settings/pin", json={"pin": "5678"})
    assert resp.status_code == 200
    assert resp.json()["valid"] is True


def test_change_pin_wrong_current():
    resp = client.patch("/api/settings/pin", json={
        "current_pin": "0000",
        "new_pin": "5678",
    })
    assert resp.status_code == 401


def test_get_avg_turnover_time_default():
    store.clear()
    from app.auth.manager import hash_pin
    store.set_setting("manager_pin_hash", hash_pin("1234"))
    resp = client.get("/api/settings/avg-turnover-time")
    assert resp.status_code == 200
    assert resp.json() == 30


def test_set_avg_turnover_time():
    resp = client.patch("/api/settings/avg-turnover-time", json={"minutes": 30})
    assert resp.status_code == 204
    resp = client.get("/api/settings/avg-turnover-time")
    assert resp.json() == 30


def test_set_avg_turnover_time_out_of_range():
    resp = client.patch("/api/settings/avg-turnover-time", json={"minutes": 0})
    assert resp.status_code == 422
    resp = client.patch("/api/settings/avg-turnover-time", json={"minutes": 121})
    assert resp.status_code == 422


def test_get_waitlist_paused_default():
    store.clear()
    from app.auth.manager import hash_pin
    store.set_setting("manager_pin_hash", hash_pin("1234"))
    resp = client.get("/api/settings/waitlist-paused")
    assert resp.status_code == 200
    assert resp.json() is False


def test_set_waitlist_paused():
    resp = client.patch("/api/settings/waitlist-paused", json={"paused": True})
    assert resp.status_code == 204
    resp = client.get("/api/settings/waitlist-paused")
    assert resp.json() is True
    resp = client.patch("/api/settings/waitlist-paused", json={"paused": False})
    assert resp.status_code == 204
    resp = client.get("/api/settings/waitlist-paused")
    assert resp.json() is False
