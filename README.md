# Restaurant Waitlist Manager 🍽️

A web-based waitlist management tool for a single-location restaurant. The host manages walk-in and call-ahead guests from a tablet, while guests receive automatic SMS/email notifications with a personal status link to check their position in line, confirm they're still waiting, or cancel themselves.

**Built during the AI Dev Tools Zoomcamp** using an AI-driven multi-agent workflow (OpenCode) to plan, implement, test, and verify every feature.

---

## Problem

Restaurant hosts juggle walk-ins, phone reservations, and seated guests all at once — and keeping track of who's waiting, who's next, and how long the wait is can get chaotic fast. Existing solutions are either expensive SaaS platforms built for chains, or pen-and-paper systems that offer no guest self-service.

This tool fills the gap for a **single-location restaurant** that needs:

- A simple, tablet-friendly waitlist the host can manage in real time
- Automatic notifications when a table is ready
- A shareable link so guests can check their status and cancel without calling the restaurant
- Manager reports for wait times, no-show rates, and table utilization

---

## Demo

The application has two views:

### Host View (tablet)
- Add parties to the waitlist with one tap
- Notify, seat, cancel, or mark urgent with action buttons
- Select a table from a capacity-grouped modal when seating
- Undo recent actions with a toast notification
- Pause/resume the waitlist when the kitchen is backed up
- Manager PIN modal for restricted features

### Guest Status Page
- Mobile-optimized page accessible via a unique shareable link (`/status/{token}`)
- Shows position in line, estimated wait time, and party size
- Buttons to **Confirm** still waiting or **Cancel** the reservation

Run the app locally to see both views in action. See the [Quickstart](#quickstart) section.

---

## Testing

The project has comprehensive test coverage across both backend and frontend:

| Layer | Command | Result |
|-------|---------|--------|
| Backend | `cd backend && uv run pytest` | ✅ 68 passed |
| Frontend | `cd frontend && npm run test` | ✅ 236 passed |
| Type check (backend) | `uv run pyright backend/` | ✅ 0 errors |
| Type check (frontend) | `npm run typecheck` | ✅ 0 errors |

Test files are co-located with their source code (e.g. `tests/test_waitlist.py`, `src/components/PartyActions.test.tsx`).

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (Vite + React)            │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │   HostView   │  │ GuestStatus  │  │ Manager    │ │
│  │   (tablet)   │  │  (mobile)    │  │  Settings  │ │
│  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘ │
│         │                 │                │        │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌────▼─────┐  │
│  │ TanStack     │  │  react-      │  │  Zustand │  │
│  │ Query (data) │  │  router-dom  │  │ (UI state│  │
│  └──────────────┘  └──────────────┘  └──────────┘  │
│  ┌──────────────────────────────────────────────┐   │
│  │  WebSocket hook (real-time sync)             │   │
│  └──────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────┘
                         │ HTTP + WebSocket
┌────────────────────────▼────────────────────────────┐
│                  Backend (FastAPI)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │  Waitlist    │  │   Tables     │  │  Reports  │ │
│  │   Router     │  │   Router     │  │  Router   │ │
│  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘ │
│         └──────────────────┼──────────────────┘      │
│                     ┌──────▼───────┐                │
│                     │  Auth       │                │
│                     │  (PIN/token)│                │
│                     └──────┬───────┘                │
│            ┌───────────────┼───────────────┐        │
│            │               │               │        │
│     ┌──────▼──────┐ ┌─────▼──────┐ ┌──────▼──────┐ │
│     │ Database    │ │  WebSocket │ │  APScheduler│ │
│     │  Store      │ │  Manager   │ │  (no-show)  │ │
│     └──────┬──────┘ └────────────┘ └─────────────┘ │
│            │                                        │
│     ┌──────▼──────┐                                │
│     │  SQLite     │                                │
│     │  (aiosqlite)│                                │
│     └─────────────┘                                │
└─────────────────────────────────────────────────────┘
```

---

## Project Structure

```
restaurant-waitlist-manager/
├── backend/                          # FastAPI backend
│   ├── app/
│   │   ├── main.py                   # FastAPI app, lifespan, WebSocket
│   │   ├── models/                   # Pydantic schemas + SQLAlchemy models
│   │   │   ├── __init__.py           # Dataclasses (Party, Table, ActionLog)
│   │   │   └── database.py           # SQLAlchemy async declarative models
│   │   ├── routers/                  # API endpoint routers
│   │   │   ├── waitlist.py           # /api/waitlist endpoints
│   │   │   ├── tables.py             # /api/tables endpoints
│   │   │   ├── settings.py           # /api/settings endpoints
│   │   │   └── reports.py            # /api/reports endpoints
│   │   ├── store/                    # Data access layer
│   │   │   ├── memory.py             # In-memory store (legacy)
│   │   │   └── database.py           # SQLite-backed store (production)
│   │   └── auth/                     # PIN verification & token management
│   │       ├── manager.py            # hash_pin, verify_pin, issue_token
│   │       └── dependencies.py       # FastAPI auth dependencies
│   ├── tests/                        # 68 pytest tests
│   ├── seed.py                       # First-run database seeding
│   └── pyproject.toml                # uv-managed dependencies
├── frontend/                         # React + Vite frontend
│   ├── src/
│   │   ├── pages/                    # Route-level components
│   │   │   ├── HostView.tsx          # Main tablet waitlist view
│   │   │   ├── GuestStatus.tsx       # Mobile guest status page
│   │   │   ├── ManagerSettings.tsx   # PIN-protected settings
│   │   │   └── Reports.tsx           # Manager reports dashboard
│   │   ├── components/               # Reusable UI components
│   │   │   ├── AddPartyForm.tsx
│   │   │   ├── PartyActions.tsx
│   │   │   ├── TableSelectionModal.tsx
│   │   │   ├── UndoBar.tsx
│   │   │   ├── PauseToggle.tsx
│   │   │   ├── ManagerPinModal.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   └── SkeletonLoader.tsx
│   │   ├── hooks/                    # Custom React hooks
│   │   │   └── useWebSocket.ts       # WS connection with reconnect
│   │   ├── store/                    # Zustand stores
│   │   │   └── appStore.ts           # UI state (view, manager flag, toasts)
│   │   ├── services/                 # API client layer
│   │   │   ├── api.ts                # Real fetch-based API calls
│   │   │   ├── mock.ts               # In-memory mock for dev/testing
│   │   │   └── index.ts              # Barrel selector (mock vs real)
│   │   ├── types/                    # TypeScript interfaces
│   │   └── tests/                    # 236 Vitest tests
│   └── package.json
├── _docs/                            # Project documentation
│   ├── plan.md                       # Full architecture & phase plan
│   ├── tasks.md                      # Task backlog (41 tasks)
│   └── tasks/                        # Groomed task specs
├── start.ps1                         # Launch script (backend + frontend)
└── openapi.yaml                      # Auto-generated API spec
```

---

## Quickstart

### Prerequisites

- **Python 3.12+** with [`uv`](https://github.com/astral-sh/uv) installed
- **Node.js 18+** with npm
- **PowerShell** (for `start.ps1`; Windows) — or run services manually (see below)

### One-command start (Windows)

```powershell
.\start.ps1
```

This starts the backend on `http://localhost:5173` and the frontend on `http://localhost:4827`, then waits for both to be healthy.

### Manual start

```bash
# Terminal 1 — Backend
cd backend
uv sync
uv run seed.py              # seeds default tables & settings on first run
uv run uvicorn app.main:app --host 0.0.0.0 --port 5173

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev                 # starts on port 4827
```

### Key URLs

| Service | URL |
|---------|-----|
| Frontend (Host View) | http://localhost:4827 |
| Frontend (Guest Status) | http://localhost:4827/status/{token} |
| Frontend (Manager Settings) | http://localhost:4827/settings |
| Frontend (Reports) | http://localhost:4827/reports |
| Backend API | http://localhost:5173/api |
| Backend Health | http://localhost:5173/health |
| OpenAPI Docs | http://localhost:5173/docs |
| WebSocket | ws://localhost:5173/ws/waitlist |

### Default Manager PIN

The default manager PIN is **`1234`**. Change it in Settings after first login.

---

## Configuration

No environment variables are required for local development. The app uses sensible defaults:

| Setting | Default | Description |
|---------|---------|-------------|
| `VITE_API_BASE_URL` | `http://localhost:5173` | Backend API base URL (frontend only) |
| `VITE_WS_URL` | `ws://localhost:51737/ws/waitlist` | WebSocket endpoint (frontend only) |
| `VITE_USE_MOCK` | `false` | Set to `"true"` to use mock API (no backend needed) |

---

## Technology Choices

| Choice | Rationale |
|--------|-----------|
| **FastAPI** over Flask/Django | Async-native, built-in WebSocket support, auto OpenAPI docs, Pydantic validation |
| **SQLite + aiosqlite** over PostgreSQL | Zero-config, file-based (easy backup), sufficient for single-location restaurant |
| **SQLAlchemy 2.0 (async)** over raw SQL | Typed queries, migration support via Alembic, clean separation of concerns |
| **React + Vite** over Next.js | SPA is sufficient (no SSR needed for internal tablet app), faster dev server |
| **TanStack Query** over manual fetch | Automatic caching, background refetch, optimistic updates out of the box |
| **Zustand** over Redux | Minimal boilerplate, perfect for client-side UI state (not server data) |
| **Native WebSockets** over Socket.io | FastAPI has built-in WebSocket support; no extra dependency needed |
| **Tailwind CSS v4** over styled-components | Utility-first, no runtime CSS-in-JS overhead, consistent design system |
| **Vitest** over Jest | Native ESM, faster, better TypeScript support, already in the Vite ecosystem |
| **pyright** over mypy | Faster type-checking, better IDE integration, stricter by default |
| **OpenCode agents** for implementation | Multi-agent workflow (PM → Engineer → QA) ensured every task met acceptance criteria |

---

## How It Was Built

This project was developed entirely with AI coding agents using the **OpenCode** CLI tool, following a structured multi-agent workflow defined in `_docs/process.md`:

1. **PM Agent** grooms each task from the backlog into a detailed spec with checkable acceptance criteria
2. **Engineer Agent** implements the task against those criteria, writing tests as it goes
3. **QA Agent** verifies every acceptance criterion against the running code, outputting PASS/FAIL
4. **Orchestrator** coordinates the pipeline, ensures quality gates, and closes completed tasks

The full task backlog (41 tasks across frontend and backend) is tracked in `_docs/tasks.md`. Each completed task is marked with ✅.

---

## Limitations

- 🔒 **No user accounts or role-based access control** — manager mode uses a simple PIN, not a login system
- 📱 **No offline mode** — requires an active Wi-Fi connection (matches single-location requirement)
- 🌍 **Single location only** — no multi-location or franchise support
- 📊 **No historical analytics** — reports show today's data only; no trend analysis
- 🔔 **Mock notifications** — SMS/email delivery is logged but not actually sent (designed for easy swap to Twilio later)
- 🗄️ **In-memory test store** — tests use an in-memory SQLite database; the production store uses a file-based SQLite database at `backend/data/waitlist.db`
- 🧪 **No E2E browser tests** — frontend has 236 unit/integration tests but no Playwright/Cypress tests yet

---

## Future Work

- [ ] Integrate real SMS provider (Twilio) for guest notifications
- [ ] Add user authentication (email/password or SSO) for hosts and managers
- [ ] Implement offline mode with service workers and local storage sync
- [ ] Add historical report charts (weekly/monthly trends)
- [ ] Write Playwright E2E tests for critical user journeys
- [ ] Add a backup script that snapshots the SQLite database on a schedule
- [ ] Support table combinations and floor plan visualization
- [ ] Deploy to a cloud provider for multi-device access over the internet
