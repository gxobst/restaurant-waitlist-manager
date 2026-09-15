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


def test_full_host_journey_with_tables():
    # Create a table
    table_resp = client.post("/api/tables", json={"capacity": 4, "label": "Window 1"})
    assert table_resp.status_code == 201
    table_id = table_resp.json()["id"]

    # Add and seat a party
    create_resp = client.post("/api/waitlist", json={"name": "Jones", "party_size": 4})
    party_id = create_resp.json()["id"]
    client.patch(f"/api/waitlist/{party_id}", json={"status": "seated"})

    # Occupy the table
    update_resp = client.patch(
        f"/api/tables/{table_id}",
        json={"is_occupied": True, "occupied_by_party_id": party_id},
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["is_occupied"] is True

    # Verify report reflects the state
    pin_resp = client.post("/api/settings/pin", json={"pin": "1234"})
    token = pin_resp.json()["token"]
    report_resp = client.get(
        "/api/reports/daily",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert report_resp.status_code == 200
    report = report_resp.json()
    assert report["total_parties"] == 1
    assert report["seat_utilization"] > 0
