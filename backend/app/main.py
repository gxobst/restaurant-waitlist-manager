from contextlib import asynccontextmanager
import asyncio

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.routers import waitlist, tables, settings, reports
from app.store.memory import store


@asynccontextmanager
async def lifespan(app: FastAPI):
    store.clear()
    from app.auth.manager import hash_pin
    store.set_setting("manager_pin_hash", hash_pin("1234"))
    store.set_setting("avg_turnover_time", "30")
    store.set_setting("waitlist_paused", "false")
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4827"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(waitlist.router)
app.include_router(tables.router)
app.include_router(settings.router)
app.include_router(reports.router)


@app.get("/health")
async def health():
    return {"status": "ok"}


connected_clients: set[WebSocket] = set()


@app.websocket("/ws/waitlist")
async def websocket_waitlist(websocket: WebSocket):
    await websocket.accept()
    connected_clients.add(websocket)
    await websocket.send_text("connected")
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(f"echo: {data}")
    except WebSocketDisconnect:
        pass
    finally:
        connected_clients.discard(websocket)


async def broadcast_waitlist_update():
    import json
    message = json.dumps({"type": "waitlist_update"})
    if connected_clients:
        await asyncio.gather(
            *[client.send_text(message) for client in list(connected_clients)],
            return_exceptions=True,
        )
