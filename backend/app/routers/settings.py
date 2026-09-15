from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel

from app.auth.manager import hash_pin, verify_pin
from app.schemas import PinChangeRequest, PinVerifyRequest, PinVerifyResponse
from app.store.memory import store

router = APIRouter(prefix="/api/settings", tags=["Settings"])


class SetMinutesRequest(BaseModel):
    minutes: int


class SetPausedRequest(BaseModel):
    paused: bool


@router.post("/pin")
async def verify_pin_endpoint(body: PinVerifyRequest) -> PinVerifyResponse:
    stored_hash = store.get_setting("manager_pin_hash")
    if stored_hash is None:
        raise HTTPException(status_code=401, detail="No PIN configured")
    if verify_pin(stored_hash, body.pin):
        import uuid
        token = str(uuid.uuid4())
        store.add_token(token, ["manager"])
        return PinVerifyResponse(valid=True, token=token)
    raise HTTPException(status_code=401, detail="Invalid PIN")


@router.patch("/pin", status_code=204)
async def change_pin_endpoint(body: PinChangeRequest) -> None:
    stored_hash = store.get_setting("manager_pin_hash")
    if stored_hash is None:
        raise HTTPException(status_code=401, detail="No PIN configured")
    if not verify_pin(stored_hash, body.current_pin):
        raise HTTPException(status_code=401, detail="Current PIN is incorrect")
    store.set_setting("manager_pin_hash", hash_pin(body.new_pin))


@router.get("/avg-turnover-time")
async def get_avg_turnover_time() -> int:
    value = store.get_setting("avg_turnover_time")
    if value is None:
        return 30
    return int(value)


@router.patch("/avg-turnover-time", status_code=204)
async def set_avg_turnover_time(body: SetMinutesRequest) -> None:
    if not (1 <= body.minutes <= 120):
        raise HTTPException(status_code=422, detail="Minutes must be between 1 and 120")
    store.set_setting("avg_turnover_time", str(body.minutes))


@router.get("/waitlist-paused")
async def get_waitlist_paused() -> bool:
    value = store.get_setting("waitlist_paused")
    if value is None:
        return False
    return value.lower() == "true"


@router.patch("/waitlist-paused", status_code=204)
async def set_waitlist_paused(body: SetPausedRequest) -> None:
    store.set_setting("waitlist_paused", str(body.paused))
