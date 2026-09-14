# Restaurant Waitlist Manager — Process

How work is organized in this repository.

## Lifecycle

1. Pick the next open issue from the backlog
2. **PM grooms it** — rewrites using `_docs/task-template.md`, fills in acceptance criteria
3. **Engineer implements it** — writes code + tests, commits regularly
4. **QA verifies it** — checks acceptance criteria against running code
5. On **FAIL** → back to step 3 with the QA comment as input
6. On **PASS** → close the issue
7. Repeat until the backlog is empty
8. While the current task is being implemented, PM can groom the next task in parallel

## Rules

- Do not skip step 2 (grooming)
- The engineer does not close the issue
- QA does not fix the code; only outputs PASS or FAIL
- The orchestrator closes the issue only after QA outputs PASS
- One task at a time per role; no multitasking within a role

## Roles

| Role | File | Scope |
|------|------|-------|
| Orchestrator | (main session) | Launches PM, Engineer, QA as subagents; does not groom, implement, or test |
| PM | `_docs/pm.md` | Grooms one task at a time; rewrites issues; does not write code |
| Engineer | `_docs/software-engineer.md` | Implements one groomed task; writes tests; does not close issues |
| QA | `_docs/qa-engineer.md` | Checks finished work against acceptance criteria; outputs PASS/FAIL |

## Delegation

- The orchestrator may invoke subagents for PM, Engineer, and QA roles
- Delegation depth is exactly one; leaf agents never delegate
- Leads remain accountable for all delegated work

## Task Format

All tasks follow the template in `_docs/task-template.md`:

- **Goal** — what should be true when done
- **Acceptance criteria** — checkable by looking at the result
- **Out of scope** — moved items with links to follow-up issues
- **Constraints** — files, libraries, guidelines to follow

## Port Assignments

Use random 4-5 digit ports for all services. Never use default ports.

| Service | Port (assign at startup) |
|---------|--------------------------|
| Backend (FastAPI) | e.g., 51737 |
| Frontend (Vite) | e.g., 51738 |

Verify ports are free before binding. Choose another if occupied.

## Tech Stack Reference

See `_docs/plan.md` for full tech stack and architecture decisions.

| Layer | Choice |
|-------|--------|
| Backend | FastAPI (Python, uv) |
| Database | SQLite + SQLAlchemy 2.0 (async) |
| Migrations | Alembic |
| Frontend | React 18+ (Vite) |
| State | TanStack Query + Zustand |
| Real-time | WebSockets |
| Background | APScheduler |
| Guest tokens | NanoID |
| PDF | WeasyPrint |
