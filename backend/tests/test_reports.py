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


def test_daily_report_requires_manager():
    resp = client.get("/api/reports/daily")
    assert resp.status_code == 422


def test_daily_report_with_manager_token():
    pin_resp = client.post("/api/settings/pin", json={"pin": "1234"})
    token = pin_resp.json()["token"]
    resp = client.get(
        "/api/reports/daily",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_parties"] == 0
    assert data["average_wait_minutes"] == 0
    assert data["no_show_rate"] == 0
    assert data["seat_utilization"] == 0
    assert "date" in data


def test_daily_report_with_parties():
    pin_resp = client.post("/api/settings/pin", json={"pin": "1234"})
    token = pin_resp.json()["token"]

    client.post("/api/waitlist", json={"name": "A", "party_size": 2})
    client.post("/api/waitlist", json={"name": "B", "party_size": 4})
    create_resp = client.post("/api/waitlist", json={"name": "C", "party_size": 2})
    party_id = create_resp.json()["id"]
    client.patch(f"/api/waitlist/{party_id}", json={"status": "seated"})

    client.post("/api/tables", json={"capacity": 4, "label": "T1"})
    client.post("/api/tables", json={"capacity": 4, "label": "T2"})

    resp = client.get(
        "/api/reports/daily",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_parties"] == 3
    assert data["average_wait_minutes"] >= 0
    assert data["no_show_rate"] == 0
    assert data["seat_utilization"] >= 0
