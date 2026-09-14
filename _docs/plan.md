````markdown
# Restaurant Waitlist Manager — Project Plan

## Overview
A web-based waitlist management tool for a single-location restaurant.
The host manages walk-in and call-ahead guests from a tablet; guests get
automatic SMS/email notifications with a personal status link.

## Users & Access
- **Hosts** — manage the waitlist during service
- **Manager** — PIN-protected mode for reports, settings, and table setup
- No user accounts/logins; manager mode unlocked with a PIN code

## Tech Stack

| Layer            | Choice                                                  | Rationale                                                    |
|------------------|---------------------------------------------------------|--------------------------------------------------------------|
| Backend          | **FastAPI** (Python 3.12+, managed with **uv**)         | Async-native, built-in WebSockets for real-time sync, Pydantic validation, auto OpenAPI docs |
| Database         | **SQLite** via **SQLAlchemy 2.0** (async)               | File-based, zero-config, easy backup; async driver via `aiosqlite` |
| Migrations       | **Alembic**                                             | Version-controlled schema changes, rollback support           |
| Frontend         | **React 18+** (Vite)                                    | Fast dev server, modern bundling, SPA for tablet use          |
| State (server)   | **TanStack Query (React Query) v5**                     | Server-state caching, optimistic updates, background refetch |
| State (client)   | **Zustand**                                             | Minimal store for WebSocket state and UI-only state           |
| Real-time        | **WebSockets** (FastAPI native)                         | Bidirectional, instant updates across 2–3 tablets            |
| Background jobs  | **APScheduler** (in-process)                            | Lightweight 10-min no-show timer, no extra infra             |
| Guest link token | **NanoID** (8 chars, URL-safe)                          | Short, readable over SMS, unguessable                        |
| PDF export       | **WeasyPrint**                                          | HTML→PDF, reuse templates for consistent branding             |
| CSV export       | **Python `csv` stdlib**                                 | Zero dependencies, sufficient for tabular data               |
| Hosting          | Local device on restaurant Wi-Fi                        | Matches single-location requirement                          |
| SMS/Email        | Mock provider (MVP); real provider (e.g., Twilio) later | Decoupled via interface for easy swap                        |

## Core Features

### Waitlist
- Single combined list for walk-ins and call-ahead guests (staff enter all)
- Party record: name, party size, phone number, estimated wait time, notes
- Statuses: `Waiting → Notified → Seated`, plus `Canceled` and `No-Show`
- Automatic ordering based on party size and table availability
- Host can move **urgent-flagged** parties up; **manager** can reorder any party
- Estimated wait time calculated in real time from queue + table status;
  host can override the estimate
- Pause/resume toggle to stop accepting new parties (e.g., kitchen backed up)
- Waitlist reset manually at closing

### Parties — Quick Actions
Per-party actions: Notify, Seat, Cancel, Edit details, Add note, Mark urgent
- **Undo button** for recent actions (e.g., wrong seat, wrong no-show)

### Tables
- Capacity-based only (2-top, 4-top, etc.) — no floor plan, no combinable tables
- Tables configured in the **manager UI**
- Host manually marks tables occupied/available
- When seating, host selects a specific table from a **list grouped by capacity**;
  the app marks that table occupied and links it to the party
- Host taps "clear table" when guests leave

### Notifications
- Automatic SMS + email sent **immediately** when a table opens and the party
  is next in line
- Host can also manually mark a party as "notified"
- Auto No-Show after a **fixed 10-minute** window if the guest doesn't arrive
- Mock notification provider for MVP (log messages / fake send); real
  provider integration comes later

### Guest Personal Link
Each notified guest receives a unique link (sent via SMS/email) where they can:
- View their position in line and estimated wait time
- **Confirm** they're still waiting — resets the no-show timer and refreshes
  their wait estimate
- **Cancel** themselves from the list
- No extra authentication on the link

### Reports (PIN-protected)
- Detailed metrics: wait times, no-show rates, party volume, daily summaries
- **CSV + PDF export**
- Accessible to managers only

## Business Rules
- Real-time sync across all 2–3 devices — changes appear instantly
- Requires internet connectivity (offline mode is a future phase)
- Expected busy-hour queue: 10–30 parties
- Auto-notification fires the moment a table opens for the next party

## Out of Scope (MVP)
- Customer self-join (remote/online queue joining)
- Offline mode
- Real SMS/email provider integration (mocked for now)
- Floor plans, table combinations, sections/zones
- Multi-location support
- Historical-data-based wait predictions
- User accounts / role-based logins

## Non-Functional
- Single location deployment; runs on local Wi-Fi
- Simple enough for a coding agent to build iteratively
- SQLite file-based DB — easy backup (copy the file)

---

## Architecture Decisions

### Real-Time Sync Strategy
- **Host UI** uses WebSockets for bidirectional communication
  - Server pushes waitlist changes, table updates, and notifications to all connected clients
  - Clients send actions (seat, cancel, notify) via REST; server broadcasts results via WebSocket
- **Guest personal link** uses standard HTTP (polling or SSE acceptable — read-only)
- WebSocket connection management: each tablet connects on page load, reconnects on disconnect

### Notification Architecture
- Abstract `NotificationProvider` interface with two implementations:
  - `MockNotificationProvider` — logs messages, fake sends (MVP)
  - `TwilioNotificationProvider` — real SMS/email (later phase)
- Provider injected via FastAPI dependency injection; swap with env var

### Undo System
- Action log table (`action_logs`) records every state change with timestamp and previous state
- Undo restores the previous state and logs a new "undo" entry
- Undo available for: Seat, Cancel, No-Show, Notify (last N actions, configurable)

### Wait Time Calculation
- Algorithm: `(parties_ahead × avg_turnover_time) + (current_table_utilization_factor)`
- `avg_turnover_time` is a configurable constant (default 15 min, manager-adjustable)
- Calculation runs on every waitlist read and on each WebSocket broadcast

### Manager PIN
- PIN stored as bcrypt hash in a `settings` table
- Manager mode is session-based: once entered on a device, stays active until browser close or explicit lock
- PIN change requires entering current PIN first

---

## Implementation Phases

### Phase 1: Foundation (Backend + DB)
**Goal:** Core data model and API endpoints working, no frontend yet.

1. Initialize project with `uv`, FastAPI app structure
2. Define SQLAlchemy models:
   - `parties` — id, name, party_size, phone, email, status, position, estimated_wait, notes, urgent, created_at, updated_at, notified_at, seated_at, canceled_at
   - `tables` — id, capacity, label, is_occupied, occupied_by_party_id (FK), created_at
   - `action_logs` — id, party_id, action, previous_state, created_by, created_at
   - `settings` — key, value (for manager PIN, config constants)
   - `notification_log` — id, party_id, channel (sms/email), status, sent_at
3. Alembic setup and initial migration
4. REST endpoints:
   - `POST /api/waitlist` — add party
   - `GET /api/waitlist` — list all (with calculated wait times)
   - `PATCH /api/waitlist/{id}` — update party (status, reorder, urgent, notes)
   - `DELETE /api/waitlist/{id}` — remove party
   - `POST /api/waitlist/{id}/undo` — undo last action
   - `GET /api/tables` — list tables (grouped by capacity)
   - `POST /api/tables` — create table (manager)
   - `PATCH /api/tables/{id}` — update table (occupy, clear)
   - `GET /api/reports/daily` — daily stats
   - `POST /api/settings/pin` — verify manager PIN
   - `PATCH /api/settings/pin` — change manager PIN
5. WebSocket endpoint: `ws/waitlist` — broadcast on any state change
6. Mock notification provider, APScheduler no-show timer
7. Seed data script for testing

**Exit criteria:** All API endpoints functional, WebSocket broadcasts state changes, no-show timer fires correctly.

### Phase 2: Frontend — Host UI
**Goal:** Hosts can manage the full waitlist from a tablet.

1. Vite + React project setup, TanStack Query + Zustand configured
2. WebSocket integration — connect on mount, sync state
3. Waitlist view:
   - Sortable list with position, name, party size, wait time, status badges
   - Color-coded urgency (urgent = red highlight)
   - Pull-to-refresh or auto-sync indicator
4. Party actions — buttons per row: Notify, Seat, Cancel, Edit, Add Note, Mark Urgent
5. Undo bar — toast/snackbar with undo button for last action
6. Add party form — name, party size, phone, email (optional), notes
7. Table selection modal — grouped by capacity, tap to assign
8. Pause/resume toggle in header
9. Manager PIN entry modal (for settings access)

**Exit criteria:** Host can add, manage, seat, and cancel parties; real-time sync confirmed on 2 simulated devices.

### Phase 3: Frontend — Guest Link + Notifications
**Goal:** Guests receive a status link; no-show auto-fires.

1. Guest status page — mobile-optimized, shows position, estimated wait, party size
2. Confirm button — resets no-show timer, refreshes wait estimate
3. Cancel button — removes party from list
4. Token-based routing: `/status/{nanoid_token}`
5. Mock notification provider — logs link in console, prints to stdout
6. Auto no-show trigger — after 10 min, mark party as no-show
7. Integration test: end-to-end flow from add → notify → guest confirms → seat

**Exit criteria:** Full guest journey works end-to-end; mock notifications logged correctly.

### Phase 4: Reports + Manager UI
**Goal:** Managers can view reports and configure the system.

1. Manager PIN modal — enter PIN to unlock manager mode
2. Settings page:
   - Table management (add/edit/delete tables)
   - Change manager PIN
   - Configure avg_turnover_time and no_show_timeout
3. Reports page:
   - Daily summary: total parties, avg wait, no-show rate, seat utilization
   - Charts (simple bar/line via lightweight lib like Recharts)
4. CSV export — download daily/weekly report
5. PDF export — WeasyPrint, styled HTML template → PDF download
6. Waitlist reset button (end-of-day)

**Exit criteria:** Manager can configure tables, view reports, export CSV/PDF; end-of-day reset works.

### Phase 5: Polish + Testing
**Goal:** Production-ready MVP.

1. Error handling and loading states across all views
2. Responsive tablet layout (1024px+ primary target)
3. WebSocket reconnection logic with visual indicator
4. Input validation (Pydantic on backend, form validation on frontend)
5. Security: rate limiting on PIN entry, input sanitization
6. End-to-end tests (Playwright or Cypress)
7. Deployment script: `start.ps1` — starts backend + frontend, binds to local IP
8. Backup script: copies SQLite file to timestamped backup

**Exit criteria:** All flows tested on tablet viewport; no crashes on simulated network interruption.

---

## Project Structure (Recommended)

```
restaurant-waitlist-manager/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, WebSocket, startup
│   │   ├── models/              # SQLAlchemy models
│   │   │   ├── party.py
│   │   │   ├── table.py
│   │   │   ├── action_log.py
│   │   │   ├── settings.py
│   │   │   └── notification_log.py
│   │   ├── routes/              # API routers
│   │   │   ├── waitlist.py
│   │   │   ├── tables.py
│   │   │   ├── reports.py
│   │   │   └── settings.py
│   │   ├── services/            # Business logic
│   │   │   ├── wait_time.py
│   │   │   ├── no_show.py
│   │   │   ├── undo.py
│   │   │   └── notifications.py
│   │   ├── notifications/       # Provider interface + impls
│   │   │   ├── base.py          # Abstract provider
│   │   │   ├── mock.py
│   │   │   └── twilio.py        # Future
│   │   ├── ws/                  # WebSocket manager
│   │   │   └── manager.py
│   │   └── schemas/             # Pydantic request/response schemas
│   ├── alembic/                 # Migrations
│   ├── alembic.ini
│   ├── pyproject.toml           # uv-managed deps
│   └── seed.py                  # Test data seeder
├── frontend/
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   ├── pages/               # Route-level components
│   │   │   ├── HostView.tsx
│   │   │   ├── GuestStatus.tsx
│   │   │   ├── ManagerSettings.tsx
│   │   │   └── Reports.tsx
│   │   ├── hooks/               # Custom hooks
│   │   │   ├── useWebSocket.ts
│   │   │   ├── useWaitlist.ts
│   │   │   └── useManagerPin.ts
│   │   ├── store/               # Zustand stores
│   │   ├── api/                 # API client functions
│   │   ├── types/               # TypeScript interfaces
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
├── start.ps1                    # Launch script
├── backup.ps1                   # SQLite backup script
└── _docs/
    ├── plan.md
    └── ... (other docs)
```
````