from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException

from app.models import PartyStatus
from app.schemas import CreatePartyRequest, PartyResponse, TableResponse, UpdatePartyRequest, UpdateTableRequest
from app.store import store

VALID_TRANSITIONS = {
    PartyStatus.waiting: {PartyStatus.notified, PartyStatus.canceled, PartyStatus.no_show},
    PartyStatus.notified: {PartyStatus.seated, PartyStatus.canceled, PartyStatus.no_show},
}

router = APIRouter(prefix="/api/waitlist", tags=["waitlist"])


def _compute_estimated_wait() -> int:
    parties = store.list_parties()
    waiting = [p for p in parties if p.status == PartyStatus.waiting]
    if not waiting:
        return 0
    return len(waiting) * 15


def _party_to_response(party) -> PartyResponse:
    ahead = store.list_parties()
    position = party.position or 0
    waiting_parties = [p for p in ahead if p.status == PartyStatus.waiting and (p.position or 0) < position]
    estimated_wait = len(waiting_parties) * 15
    return PartyResponse(
        id=str(party.id),
        name=party.name,
        party_size=party.party_size,
        phone=party.phone,
        email=party.email,
        status=party.status.value,
        position=party.position,
        estimated_wait=estimated_wait,
        notes=party.notes,
        urgent=party.urgent,
        token=party.token,
        created_at=party.created_at.isoformat(),
        updated_at=party.updated_at.isoformat(),
        notified_at=party.notified_at.isoformat() if party.notified_at else None,
        seated_at=party.seated_at.isoformat() if party.seated_at else None,
        canceled_at=party.canceled_at.isoformat() if party.canceled_at else None,
    )


@router.get("", response_model=list[PartyResponse])
def list_parties():
    parties = store.list_parties()
    return [_party_to_response(p) for p in parties]


@router.post("", response_model=PartyResponse, status_code=201)
def create_party(body: CreatePartyRequest):
    party = store.add_party(
        body.name,
        body.party_size,
        phone=body.phone,
        email=body.email,
        notes=body.notes,
        urgent=body.urgent,
    )
    store.add_action_log(party.id, "created", previous_state=None)
    return _party_to_response(party)


@router.patch("/{party_id}", response_model=PartyResponse)
def update_party(party_id: str, body: UpdatePartyRequest):
    from uuid import UUID
    party_uuid = UUID(party_id)
    party = store.get_party(party_uuid)
    if party is None:
        raise HTTPException(status_code=404, detail="Party not found")

    previous_state = store.get_party(party_uuid)
    updates: dict = {}
    if body.name is not None:
        updates["name"] = body.name
    if body.party_size is not None:
        updates["party_size"] = body.party_size
    if body.phone is not None:
        updates["phone"] = body.phone
    if body.email is not None:
        updates["email"] = body.email
    if body.status is not None:
        new_status = PartyStatus(body.status)
        if new_status not in VALID_TRANSITIONS.get(party.status, set()):
            allowed = VALID_TRANSITIONS.get(party.status, set())
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status transition from {party.status.value} to {new_status.value}. Allowed: {[s.value for s in allowed]}",
            )
        updates["status"] = new_status
        if new_status == PartyStatus.notified:
            from datetime import datetime, timezone
            updates["notified_at"] = datetime.now(timezone.utc)
        elif new_status == PartyStatus.seated:
            from datetime import datetime, timezone
            updates["seated_at"] = datetime.now(timezone.utc)
        elif new_status == PartyStatus.canceled:
            from datetime import datetime, timezone
            updates["canceled_at"] = datetime.now(timezone.utc)
        elif new_status == PartyStatus.no_show:
            from datetime import datetime, timezone
            updates["canceled_at"] = datetime.now(timezone.utc)
    if body.position is not None:
        updates["position"] = body.position
    if body.estimated_wait is not None:
        updates["estimated_wait"] = body.estimated_wait
    if body.notes is not None:
        updates["notes"] = body.notes
    if body.urgent is not None:
        updates["urgent"] = body.urgent

    updated = store.update_party(party_uuid, updates)
    if updated is None:
        raise HTTPException(status_code=404, detail="Party not found")

    action = body.status or "updated"
    store.add_action_log(party_uuid, action, previous_state=previous_state)
    return _party_to_response(updated)


@router.delete("/{party_id}", status_code=204)
def delete_party(party_id: str):
    from uuid import UUID
    party_uuid = UUID(party_id)
    party = store.get_party(party_uuid)
    if party is None:
        raise HTTPException(status_code=404, detail="Party not found")
    store.delete_party(party_uuid)
    return None


@router.post("/{party_id}/undo", response_model=PartyResponse)
def undo_last_action(party_id: str):
    from uuid import UUID
    party_uuid = UUID(party_id)
    party = store.get_party(party_uuid)
    if party is None:
        raise HTTPException(status_code=404, detail="Party not found")
    updated = store.undo_last_action(party_uuid)
    return _party_to_response(updated)


@router.get("/token/{token}", response_model=PartyResponse)
def get_party_by_token(token: str):
    party = store.get_party_by_token(token)
    if party is None:
        raise HTTPException(status_code=404, detail="Party not found")
    return _party_to_response(party)


@router.post("/token/{token}/confirm", response_model=PartyResponse)
def confirm_waiting(token: str):
    party = store.get_party_by_token(token)
    if party is None:
        raise HTTPException(status_code=404, detail="Party not found")
    if party.status != PartyStatus.waiting:
        raise HTTPException(status_code=400, detail=f"Cannot confirm party with status {party.status.value}")
    previous_state = store.get_party(party.id)
    updated = store.update_party(party.id, {"status": PartyStatus.notified, "notified_at": datetime.now(timezone.utc)})
    if updated is None:
        raise HTTPException(status_code=404, detail="Party not found")
    store.add_action_log(party.id, "confirmed", previous_state=previous_state)
    return _party_to_response(updated)


@router.post("/token/{token}/cancel", response_model=PartyResponse)
def cancel_by_token(token: str):
    party = store.get_party_by_token(token)
    if party is None:
        raise HTTPException(status_code=404, detail="Party not found")
    if party.status not in (PartyStatus.waiting, PartyStatus.notified):
        raise HTTPException(status_code=400, detail=f"Cannot cancel party with status {party.status.value}")
    previous_state = store.get_party(party.id)
    updated = store.update_party(party.id, {"status": PartyStatus.canceled, "canceled_at": datetime.now(timezone.utc)})
    if updated is None:
        raise HTTPException(status_code=404, detail="Party not found")
    store.add_action_log(party.id, "canceled", previous_state=previous_state)
    return _party_to_response(updated)
