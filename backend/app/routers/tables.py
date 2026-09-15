from fastapi import APIRouter, HTTPException

from app.schemas import CreateTableRequest, TableResponse, UpdateTableRequest
from app.store import store

router = APIRouter(prefix="/api/tables", tags=["tables"])


def _table_to_response(table):
    return TableResponse(
        id=str(table.id),
        capacity=table.capacity,
        label=table.label,
        is_occupied=table.is_occupied,
        occupied_by_party_id=table.occupied_by_party_id,
        created_at=table.created_at.isoformat(),
    )


@router.get("", response_model=list[TableResponse])
def list_tables():
    tables = store.get_tables()
    return [_table_to_response(t) for t in tables]


@router.post("", response_model=TableResponse, status_code=201)
def create_table(body: CreateTableRequest):
    table = store.add_table(body.capacity, body.label)
    return _table_to_response(table)


@router.patch("/{table_id}", response_model=TableResponse)
def update_table(table_id: str, body: UpdateTableRequest):
    from uuid import UUID
    table_uuid = UUID(table_id)
    table = store.get_table(table_uuid)
    if table is None:
        raise HTTPException(status_code=404, detail="Table not found")

    updates: dict = {}
    if body.capacity is not None:
        updates["capacity"] = body.capacity
    if body.label is not None:
        updates["label"] = body.label
    if body.is_occupied is not None:
        updates["is_occupied"] = body.is_occupied
    if body.occupied_by_party_id is not None:
        updates["occupied_by_party_id"] = body.occupied_by_party_id

    updated = store.update_table(table_uuid, updates)
    if updated is None:
        raise HTTPException(status_code=404, detail="Table not found")
    return _table_to_response(updated)


@router.delete("/{table_id}", status_code=204)
def delete_table(table_id: str):
    from uuid import UUID
    table_uuid = UUID(table_id)
    table = store.get_table(table_uuid)
    if table is None:
        raise HTTPException(status_code=404, detail="Table not found")
    store.delete_table(table_uuid)
    return None
