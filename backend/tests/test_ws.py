import asyncio

import pytest
from fastapi.testclient import TestClient

from app.main import app, connected_clients
from app.store import store


@pytest.fixture(autouse=True)
def clean_store():
    asyncio.run(store.clear())
    from app.auth.manager import hash_pin
    asyncio.run(store.set_setting("manager_pin_hash", hash_pin("1234")))
    asyncio.run(store.set_setting("avg_turnover_time", "30"))
    asyncio.run(store.set_setting("waitlist_paused", "false"))
    connected_clients.clear()
    yield
    connected_clients.clear()


def test_websocket_connect_and_disconnect():
    client = TestClient(app)
    with client.websocket_connect("/ws/waitlist") as websocket:
        data = websocket.receive_text()
        assert data == "connected"


def test_websocket_send_and_receive():
    client = TestClient(app)
    with client.websocket_connect("/ws/waitlist") as websocket:
        websocket.receive_text()  # "connected"
        websocket.send_text("hello")
        data = websocket.receive_text()
        assert data == "echo: hello"


def test_broadcast_waitlist_update():
    from app.main import broadcast_waitlist_update
    import json

    class MockClient:
        def __init__(self):
            self.messages = []
        async def send_text(self, text):
            self.messages.append(text)

    mock_client = MockClient()
    connected_clients.add(mock_client)  # pyright: ignore[reportArgumentType]

    asyncio.run(broadcast_waitlist_update())

    expected = json.dumps({"type": "waitlist_update"})
    assert mock_client.messages == [expected]


def test_broadcast_to_empty_set():
    from app.main import broadcast_waitlist_update

    connected_clients.clear()
    asyncio.run(broadcast_waitlist_update())


def test_websocket_multiple_clients():
    client = TestClient(app)
    with (
        client.websocket_connect("/ws/waitlist") as ws1,
        client.websocket_connect("/ws/waitlist") as ws2,
    ):
        ws1.receive_text()
        ws2.receive_text()
        assert len(connected_clients) == 2
