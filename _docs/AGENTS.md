# Restaurant Waitlist Manager — Agent Rules

These rules apply to every OpenCode session working on this repository.
They supplement the global `AGENTS.md` at `C:\Users\guest\.config\opencode\AGENTS.md`.

## Commands

- `uv sync` — install Python dependencies
- `uv run pytest` — run the full test suite
- `uv run pytest tests/test_home.py` — run a single test file
- `cd frontend && npm install` — install frontend dependencies
- `cd frontend && npm run dev` — start Vite dev server
- `cd frontend && npm run build` — production build
- `cd frontend && npm run lint` — lint frontend code
- `cd frontend && npm run typecheck` — type-check frontend code

## Rules

- Dependencies are added in `pyproject.toml` (backend) or `package.json` (frontend). Do not add one without asking.
- Never use system/global Python. Always use `E:\Project\devenv\Scripts\python.exe` or activate `E:\Project\devenv\Scripts\activate`.
- Use assigned random 4-5 digit ports for services. Never use default ports (3000, 8000, 5432, etc.).
- Do not kill processes by name, image, or wildcard. Only stop explicit PIDs captured by your task or `start.ps1`.

## Documents

- `_docs/plan.md` — full project plan, tech stack, architecture, phases
- `_docs/process.md` — how work is organized (lifecycle, roles, rules)
- `_docs/pm.md` — PM agent instructions
- `_docs/software-engineer.md` — Engineer agent instructions
- `_docs/qa-engineer.md` — QA agent instructions
- `_docs/task-template.md` — template for groomed tasks
- Before writing tests, read `_docs/testing-guidelines.md` (if present)
- For anything touching the UI, read `_docs/design-system.md` (if present)

## Agent Roles

### Orchestrator (main session)
- Launches PM, Engineer, and QA as subagents
- Does not groom, implement, or test itself
- Closes the issue only after QA outputs PASS

### PM (`_docs/pm.md`)
- Grooms one task at a time before anyone implements it
- Rewrites the issue using the task template
- Makes acceptance criteria checkable by looking at the result
- Thinks about edge cases the original writer missed
- Does not write any code

### Software Engineer (`_docs/software-engineer.md`)
- Implements one groomed task at a time
- Implements against the acceptance criteria; does not change them
- Stays inside the files and constraints the issue names
- Writes tests for what was built
- Does not close the issue
- Commits regularly

### QA Engineer (`_docs/qa-engineer.md`)
- Checks finished work against the issue that specified it
- Reads acceptance criteria, checks each one against the running code
- Runs the tests and reports which ones were run
- Does not fix anything; reports via PASS/FAIL comment
- Output format: verdict with per-criterion checklist

## Protected Files

OpenCode may read but must not modify:

- `JUDGE_FEEDBACK.md`
- `HUMAN_FEEDBACK.md`
- `.tasks/*/spec.md`
- `.tasks/*/contracts/**`
- `.tasks/*/judge-report.md`

## Reports

Reports must include:

- Role, work package, result state
- Branch/worktree, commit SHA
- Files changed, criteria addressed
- Test/check results, UI journeys and findings
- Evidence, assumptions, blockers, cleanup result

No agent may return `ACCEPT`, `REJECT`, or `ALL_PASSED`; those belong to the independent Hermes Judge.
