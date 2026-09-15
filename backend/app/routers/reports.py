from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.auth.dependencies import require_manager
from app.models import PartyStatus
from app.schemas import DailyReportResponse
from app.store.memory import store

router = APIRouter(prefix="/api/reports", tags=["Reports"])


@router.get("/daily", response_model=DailyReportResponse)
async def daily_report(
    _: None = Depends(require_manager),
) -> DailyReportResponse:
    today = datetime.now(timezone.utc).date()
    today_start = datetime(today.year, today.month, today.day, tzinfo=timezone.utc)
    today_end = datetime(today.year, today.month, today.day, 23, 59, 59, 999999, tzinfo=timezone.utc)

    parties = store.list_parties()
    tables = store.get_tables()

    today_parties = [
        p for p in parties
        if p.created_at >= today_start and p.created_at <= today_end
    ]

    total_parties = len(today_parties)

    seated = [p for p in today_parties if p.status == PartyStatus.seated]
    no_shows = [p for p in today_parties if p.status == PartyStatus.no_show]

    wait_times = []
    for p in seated:
        if p.created_at and p.seated_at:
            wait_times.append((p.seated_at - p.created_at).total_seconds() / 60)
    avg_wait = sum(wait_times) / len(wait_times) if wait_times else 0.0

    no_show_rate = len(no_shows) / total_parties if total_parties > 0 else 0.0

    total_capacity = sum(t.capacity for t in tables) if tables else 1
    occupied_capacity = sum(
        t.capacity for t in tables if t.is_occupied
    )
    seat_utilization = occupied_capacity / total_capacity if total_capacity > 0 else 0.0

    return DailyReportResponse(
        date=today.isoformat(),
        total_parties=total_parties,
        average_wait_minutes=round(avg_wait, 2),
        no_show_rate=round(no_show_rate, 4),
        seat_utilization=round(seat_utilization, 4),
    )
