# Frontend Backlog

Each task is independent and can be handed to someone who has not read the others.
All tasks live inside the `frontend/` directory.

---

## 1. Scaffold React project with a passing test ✅

Goal: A Vite + React + TypeScript project lives in `frontend/`, builds without errors, starts a dev server on a non-default port, and has at least one passing test.

Acceptance criteria:
- [x] `frontend/` directory exists with a Vite React TypeScript project
- [x] `frontend/package.json` defines scripts: `dev`, `build`, `test`, `typecheck`
- [x] `npm run dev` starts the Vite dev server on a 4-5 digit port (not 3000, 5173, 8000, 8080, or other defaults)
- [x] `npm run build` produces a `dist/` folder with no errors
- [x] `npm run test` runs Vitest and reports at least 1 passing test
- [x] `npm run typecheck` exits with code 0 (no type errors)
- [x] `frontend/src/App.tsx` renders a component that the test exercises
- [x] `frontend/src/App.test.tsx` (or similar) contains at least one test that asserts the app renders without crashing

Out of scope:
- UI component libraries, Tailwind CSS, or styling (#6)
- Zustand or TanStack Query setup (#5)
- Any real application components or pages beyond a minimal render
- ESLint / Prettier configuration
- WebSocket or API integration

Constraints:
- TypeScript only; no `.js` or `.jsx` source files in `frontend/src/`
- React 18+ (check `react` version in `package.json`)
- Vitest as the test runner; do not use Jest
- Dev server port must be configured in `vite.config.ts` (not hardcoded at runtime) and must be a random 4-5 digit number
- Do not install UI libraries (Material UI, Chakra, Ant Design, etc.)
- All scripts (`dev`, `build`, `test`, `typecheck`) must succeed on a clean checkout

---

## 2. Define TypeScript types for the entire API ✅

Goal: `frontend/src/types/index.ts` exports TypeScript interfaces for every entity and request/response shape the frontend needs, matching the backend schema in `_docs/plan.md` Phase 1.

Acceptance criteria:
- [x] `frontend/src/types/index.ts` exists and exports `Party`, `Table`, `WaitlistEntry`, `DailyReport`, `NotificationLog`, `ActionLog`, `ManagerSettings`
- [x] `Party` includes: `id` (string), `name` (string), `party_size` (number), `phone` (string | null), `email` (string | null), `status` (union: `"waiting" | "notified" | "seated" | "canceled" | "no_show"`), `position` (number | null), `estimated_wait` (number | null), `notes` (string | null), `urgent` (boolean), `created_at` (string), `updated_at` (string), `notified_at` (string | null), `seated_at` (string | null), `canceled_at` (string | null)
- [x] `Table` includes: `id` (string), `capacity` (number), `label` (string), `is_occupied` (boolean), `occupied_by_party_id` (string | null), `created_at` (string)
- [x] `ActionLog` includes: `id` (string), `party_id` (string), `action` (string), `previous_state` (string | null), `created_by` (string), `created_at` (string)
- [x] `NotificationLog` includes: `id` (string), `party_id` (string), `channel` (union: `"sms" | "email"`), `status` (string), `sent_at` (string)
- [x] `ManagerSettings` includes: `key` (string), `value` (string)
- [x] `WaitlistEntry` is exported (alias or equivalent referencing `Party`)
- [x] `DailyReport` is exported with fields for: total parties, average wait, no-show rate, seat utilization, or any fields the backend returns
- [x] Request/response types exist for: `CreatePartyRequest`, `UpdatePartyRequest`, `CreateTableRequest`, `UpdateTableRequest`, `PinVerifyRequest`, `PinChangeRequest`, `DailyReportResponse`
- [x] `npm run typecheck` passes with no errors
- [x] No runtime code, no logic, only type definitions and exports

Out of scope:
- WebSocket message types (if needed, belongs in the WebSocket integration task)
- API client functions or service layer (Task 3)
- Mock data or mock services (Task 4)
- Any runtime validation logic or Zod schemas

Constraints:
- File: `frontend/src/types/index.ts` only
- No additional packages to install
- No runtime code — only `type` and `interface` declarations
- Types must align with `_docs/plan.md` Phase 1 schema exactly
- Use ISO 8601 strings for all datetime fields (not `Date` objects)

---

## 3. Create the services layer interface ✅

Goal: `frontend/src/services/api.ts` exports typed async functions for every REST endpoint so the rest of the frontend can call the API without worrying about fetch details.

Acceptance criteria:
- [x] `frontend/src/services/api.ts` exists and exports the following functions: `getWaitlist`, `addParty`, `updateParty`, `deleteParty`, `undoAction`, `getTables`, `createTable`, `updateTable`, `getDailyReport`, `verifyPin`, `changePin`
- [x] `addParty` accepts `CreatePartyRequest` and returns `Promise<WaitlistEntry>`
- [x] `getWaitlist` returns `Promise<WaitlistEntry[]>`
- [x] `updateParty` accepts `(id: string, data: UpdatePartyRequest)` and returns `Promise<WaitlistEntry>`
- [x] `deleteParty` accepts `(id: string)` and returns `Promise<void>`
- [x] `undoAction` accepts `(id: string)` and returns `Promise<WaitlistEntry>`
- [x] `getTables` returns `Promise<Table[]>`
- [x] `createTable` accepts `CreateTableRequest` and returns `Promise<Table>`
- [x] `updateTable` accepts `(id: string, data: UpdateTableRequest)` and returns `Promise<Table>`
- [x] `getDailyReport` returns `Promise<DailyReportResponse>`
- [x] `verifyPin` accepts `PinVerifyRequest` and returns `Promise<{ valid: boolean }>`
- [x] `changePin` accepts `PinChangeRequest` and returns `Promise<void>`
- [x] Base URL is read from an environment variable (e.g. `VITE_API_BASE_URL`) with a fallback constant
- [x] Every function uses `fetch()` (no axios or other HTTP client)
- [x] Functions throw or reject on non-OK HTTP responses (at minimum check `response.ok`)
- [x] `npm run typecheck` passes with zero errors

Out of scope:
- Mock implementation or any fake data — deferred to #4
- Loading state, error boundaries, or React hooks consuming these functions — deferred to #6
- Actual API server implementation — that is the backend's job
- Unit tests for the service functions — deferred to the corresponding test task

Constraints:
- Create exactly one file: `frontend/src/services/api.ts`
- All request/response types are imported from `frontend/src/types/index.ts` (do not redefine them)
- Use only the native `fetch` API; do not add any HTTP client libraries
- Base URL should come from `import.meta.env.VITE_API_BASE_URL` or a hardcoded fallback constant (e.g. `http://localhost:5173`)
- HTTP methods must match the REST contract: GET for reads, POST for creates, PATCH for updates, DELETE for removals
- The `Content-Type: application/json` header must be set on requests that send a body
- Do not add retry logic, caching, or auth token handling (PIN is a simple body check, not a bearer token)

---

## 4. Implement the mock services layer ✅

Goal: The frontend can run entirely without a backend by using in-memory fake data that behaves identically to the real API, enabling UI development and testing against realistic data flows.

Acceptance criteria:
- [x] `frontend/src/services/mock.ts` exists and exports a `mockApi` object containing all functions from `api.ts`: `getWaitlist`, `addParty`, `updateParty`, `deleteParty`, `undoAction`, `getTables`, `createTable`, `updateTable`, `getDailyReport`, `verifyPin`, `changePin`
- [x] `addParty` generates a unique ID (e.g. `crypto.randomUUID()` or incrementing counter), sets `status` to `"waiting"`, sets `created_at` and `updated_at` to the current ISO timestamp, and returns the new `WaitlistEntry`
- [x] `updateParty` with a `status` change rejects invalid transitions (e.g. seated→waiting, notified→waiting) and only allows: waiting→notified, waiting→canceled, notified→seated, notified→canceled, waiting→no_show, notified→no_show
- [x] `undoAction` reads the `ActionLog` array, finds the most recent log entry for the given party ID, restores the `previous_state` to the party, and returns the restored party
- [x] `deleteParty` removes the party from the in-memory array and returns `void`
- [x] `getTables` returns all tables from the in-memory array (no grouping applied at the service level; grouping is a UI concern)
- [x] `createTable` generates a unique ID and appends the new table to the in-memory array
- [x] `updateTable` patches the matching table and returns the updated table
- [x] `getDailyReport` computes and returns: `total_parties` (count of all parties ever added), `average_wait_minutes` (mean of seated parties' wait time), `no_show_rate` (no_show count / total count), `seat_utilization` (occupied tables / total tables)
- [x] `verifyPin` accepts `{ pin: string }` and returns `{ valid: true }` if pin equals `"1234"`, otherwise `{ valid: false }`
- [x] `changePin` accepts `{ current_pin, new_pin }`, validates `current_pin` against the hardcoded PIN, and updates it if valid; throws if current PIN is wrong
- [x] Every mutating operation (`addParty`, `updateParty`, `deleteParty`, `undoAction`) writes an `ActionLog` entry with `id`, `party_id`, `action`, `previous_state` (snapshot of the party before the change), `created_by` (hardcoded `"system"`), and `created_at`
- [x] `frontend/src/services/index.ts` exists and exports all service functions, choosing `mockApi` when `import.meta.env.VITE_USE_MOCK === "true"` and the real `api.ts` functions otherwise
- [x] `npm run typecheck` passes with zero errors
- [x] `frontend/src/services/mock.test.ts` (or one test file per function) contains at least one passing Vitest test for each exported service function
- [x] All mock data (parties array, tables array, action log array, current PIN) lives in module-level variables and resets on page reload (no persistence)

Out of scope:
- UI code, components, pages, or React hooks consuming these services (#6–#17)
- WebSocket integration (#16)
- Real backend API server (that is the backend's job)
- Zustand store or React Query integration (#5)
- E2E or integration tests (#20)
- Notification delivery (SMS/email) — the mock logs that a notification was sent but does not actually send anything

Constraints:
- Files: `frontend/src/services/mock.ts` and `frontend/src/services/index.ts` only
- Import types from `frontend/src/types/index.ts` — do not redefine them
- The `mockApi` object must satisfy the same type signatures as the functions in `api.ts`
- Use `vitest` for tests; do not use Jest
- No external packages to install beyond what `package.json` already has
- The hardcoded test PIN is `"1234"`
- Do not use `localStorage`, `sessionStorage`, or any persistence mechanism — data is purely in-memory
- Do not add any HTTP calls, `fetch`, or network dependencies in the mock

---

## 5. Set up Zustand store and React Query provider ✅

Goal: The app is wired with Zustand for client-side UI state and TanStack Query for server-state plumbing, so that subsequent tasks can build pages that read/write UI state and fetch data through React Query hooks.

Acceptance criteria:
- [x] `npm install zustand @tanstack/react-query` succeeds and both packages appear in `frontend/package.json` dependencies
- [x] `frontend/src/store/appStore.ts` exists and exports a Zustand store created via `create()`
- [x] The store exposes state fields: `currentView` (string), `isManager` (boolean), `wsConnected` (boolean), `lastAction` (an object or null)
- [x] The store exposes setter actions: `setCurrentView`, `setIsManager`, `setWsConnected`, `setLastAction` (or equivalent that mutate each field)
- [x] Default initial state is defined (e.g. `currentView: "host"`, `isManager: false`, `wsConnected: false`, `lastAction: null`)
- [x] `frontend/src/providers/QueryProvider.tsx` exists, exports a `QueryProvider` component that wraps children in `QueryClientProvider` with a `QueryClient` instance
- [x] `frontend/src/App.tsx` is updated so the rendered JSX is wrapped inside both `<QueryProvider>` and the Zustand store is accessible (Zustand does not require a provider, so this means App or its children can import and use the store)
- [x] `frontend/src/store/appStore.test.ts` (or equivalent) contains Vitest tests that verify: initial state matches defaults, each setter updates the correct field, and selectors return the expected values
- [x] `npm run test` passes with all store tests green
- [x] `npm run typecheck` exits with zero type errors
- [x] `npm run build` still succeeds (no regressions)

Out of scope:
- Page components or views — those begin in Task 6
- WebSocket integration or the `wsConnected` updater driven by real connections — Task 16
- React Query hooks (`useQuery` / `useMutation` calls) — those appear when pages are built (Task 6+)
- Undo logic or undo history beyond storing `lastAction` — Task 10
- Zustand devtools or persistence middleware — keep it plain for now
- Manager mode toggle UI — Task 13

Constraints:
- Files this should stay inside: `frontend/src/store/appStore.ts`, `frontend/src/providers/QueryProvider.tsx`, `frontend/src/App.tsx`, `frontend/src/store/appStore.test.ts`
- Packages to install: `zustand`, `@tanstack/react-query` (no other new dependencies)
- Import types from `frontend/src/types/index.ts` if needed; do not redefine types
- Zustand store is for UI-only state (view mode, flags, connection status, last action) — no server data belongs here
- React Query `QueryClient` should use sensible defaults (no aggressive caching; `staleTime: 0` or `Infinity` is fine — the important thing is that it exists)
- Do not add routing — `currentView` is a string state, not a URL route
- Do not add any page components, forms, or modals — this task only wires the state plumbing
- Use Vitest for tests; do not use Jest
- All scripts (`test`, `typecheck`, `build`) must pass on a clean checkout

---

## 6. Build the Waitlist page with mock data ✅

Goal: A host can view a styled, mobile-first waitlist showing all current parties with their position, name, party size, masked phone, estimated wait, status badge, and urgent flag — all fed by mock data via TanStack Query.

Acceptance criteria:
- [x] `frontend/src/pages/HostView.tsx` exists and renders a list of parties fetched via `useQuery` calling the mock `getWaitlist` service
- [x] Each party row displays: position number, name, party size, phone number masked to last 4 digits (e.g. `***-***-1234`), estimated wait in minutes, and a status badge
- [x] Status badges are color-coded using Tailwind: `waiting` = blue, `notified` = yellow, `seated` = green, `canceled` = gray, `no_show` = red
- [x] Parties with `urgent: true` have a red left border or red background highlight that visually distinguishes them from non-urgent parties
- [x] While the query is loading, a spinner or skeleton placeholder is shown instead of the list
- [x] When the waitlist is empty (zero parties), the text "No parties waiting" is displayed
- [x] `position` field: when `null`, display a dash (`—`); when present, display the number
- [x] `estimated_wait` field: when `null`, display "—"; when present, display as `Xm` (e.g. `25m`)
- [x] `phone` field: when `null`, display "—"; when present, mask all but last 4 digits
- [x] A test file `frontend/src/pages/HostView.test.tsx` exists and passes, asserting: component renders party name, party size, status text, and "No parties waiting" for empty state
- [x] `npm run typecheck` passes with zero errors
- [x] `npm run test` passes with all HostView tests green
- [x] `npm run build` succeeds with no errors

Out of scope:
- Add Party form — Task 7
- Party action buttons (Notify, Seat, Cancel, Mark Urgent) — Task 8
- Table selection modal — Task 9
- Undo bar / toast notifications — Task 10
- Pause/Resume toggle — Task 11
- Routing (GuestStatus page, URL params) — Task 12
- WebSocket real-time sync — Task 16
- Error boundaries and retry logic — Task 17

Constraints:
- Files: `frontend/src/pages/HostView.tsx`, `frontend/src/pages/HostView.test.tsx` only (plus Tailwind config if needed)
- Styling: Tailwind CSS exclusively — install and configure it if not already present
- Data fetching: TanStack Query (`useQuery`) calling `mockApi.getWaitlist` from `frontend/src/services/mock.ts` (or the barrel `frontend/src/services/index.ts`)
- Phone masking logic: implement inline or as a small helper in the same file — do not create a separate utils file
- No interactivity beyond display — no buttons, no click handlers, no action calls
- Mobile-first responsive design: single-column stacked layout that works on 320px+ viewport widths
- Do not modify existing files outside the scope (no changes to `App.tsx`, `api.ts`, `mock.ts`, types, or store)

---

## 7. Build the Add Party form ✅

Goal: A host can add a new party to the waitlist by filling out a form with name and party size (required) plus optional contact details. On submit the form calls the mock service, the waitlist refreshes, and the form resets.

Acceptance criteria:
- [x] `AddPartyForm.tsx` renders in `frontend/src/components/` with fields: name (text), party size (number), phone (text), email (text), notes (textarea)
- [x] Name and party size fields are marked required; all other fields are optional
- [x] Submit button is disabled when name is empty or party size is empty
- [x] Submit button is disabled while the submission request is in flight
- [x] Party size input rejects values below 1 or above 12 (browser `min`/`max` attributes or equivalent validation)
- [x] Party size input rejects non-integer values (e.g. 2.5)
- [x] Submitting with a blank or whitespace-only name shows a validation error below the name field
- [x] Submitting with party size outside 1–12 shows a validation error below the party size field
- [x] Submitting with an invalid email format (if a value is entered) shows a validation error below the email field
- [x] On successful submit, `addParty` from `services/index.ts` is called with the form values
- [x] On successful submit, the TanStack Query `waitlist` cache is invalidated so HostView refreshes
- [x] On successful submit, all form fields are cleared back to their empty/default values
- [x] On submit error (service throws), an error message is displayed and the form is not cleared
- [x] Validation errors appear directly below the field they belong to, styled with red text
- [x] Tests exist in `AddPartyForm.test.tsx` and cover: empty submission is blocked, valid submission calls service and clears form, validation errors appear for invalid party size

Out of scope:
- Table selection or linking a party to a table — Task 9
- Editing or deleting parties — Task 8
- Urgent flag toggle — Task 10
- Styling polish beyond inline error messages (match existing Tailwind patterns from HostView)

Constraints:
- Component file: `frontend/src/components/AddPartyForm.tsx`
- Test file: `frontend/src/components/AddPartyForm.test.tsx`
- Use native React form state (`useState` or `useRef`); do not add React Hook Form or any new dependencies
- Use the existing `addParty` export from `services/index.ts` (not the mock or api directly)
- Use TanStack Query's `useMutation` with `onSuccess` calling `queryClient.invalidateQueries({ queryKey: ['waitlist'] })` — follow the existing pattern in `HostView.tsx`
- Use Tailwind CSS classes consistent with the existing HostView styles
- Follow the existing `CreatePartyRequest` type from `types/index.ts` for the service call payload
- Tests use vitest + `@testing-library/react` + `@testing-library/user-event` (already in `package.json`)

---

## 8. Build Party action buttons ✅

Goal: Every party row in the HostView shows Notify, Seat, Cancel, and Mark Urgent buttons that perform valid status transitions, disable themselves for impossible actions, refresh the list, and record undo history.

Acceptance criteria:
- [x] `components/PartyActions.tsx` renders four buttons (Notify, Seat, Cancel, Mark Urgent) for a given party
- [x] Clicking **Notify** calls `updateParty(id, { status: "notified" })` and the party's status badge changes to "Notified"
- [x] Clicking **Seat** calls `updateParty(id, { status: "seated" })` and the party's status badge changes to "Seated"
- [x] Clicking **Cancel** calls `updateParty(id, { status: "canceled" })` and the party's status badge changes to "Canceled"
- [x] Clicking **Mark Urgent** calls `updateParty(id, { urgent: !party.urgent })` and the urgent visual indicator toggles
- [x] Notify button is disabled when party status is `seated`, `canceled`, or `no_show`
- [x] Seat button is disabled when party status is `waiting`, `canceled`, or `no_show`
- [x] Cancel button is disabled when party status is `seated` or `no_show`
- [x] Mark Urgent button is never disabled (can always toggle)
- [x] All four buttons are disabled when the mutation is in-flight (prevents double-clicks)
- [x] After any successful action, the `['waitlist']` query cache is invalidated so the list refreshes
- [x] After any successful action, `useAppStore().setLastAction(...)` is called with the action type and party id
- [x] HostView renders `PartyActions` inside each party row
- [x] Tests cover: each button click triggers the correct `updateParty` call, each disabled state per status, cache invalidation, and undo history push

Out of scope:
- Table selection modal for Seat — that is Task 9; Seat simply calls `updateParty` with status `"seated"` for now
- Actual SMS/email notification delivery — Notify just updates status
- Bulk actions on multiple parties
- Undo UI (button exists in store, rendering is a separate task)

Constraints:
- Create `frontend/src/components/PartyActions.tsx` and `frontend/src/components/PartyActions.test.tsx`
- Edit `frontend/src/pages/HostView.tsx` to import and render `PartyActions` inside each party card
- Use `updateParty` from `frontend/src/services/index.ts` (not the mock directly)
- Use `useMutation` + `queryClient.invalidateQueries({ queryKey: ['waitlist'] })` pattern (same as AddPartyForm)
- Use `useAppStore` from `frontend/src/store/appStore.ts` for `setLastAction`
- Valid status transitions (enforced by mock service): `waiting→[notified,canceled,no_show]`, `notified→[seated,canceled,no_show]`, `seated→[]`, `canceled→[]`, `no_show→[]`
- Follow existing test patterns in `AddPartyForm.test.tsx`: vitest, @testing-library/react, `vi.mock('../services/index.ts')`, `renderWithQuery` helper
- Do not add dependencies to `package.json`
- Buttons should be visually distinct: use Tailwind classes consistent with the existing design (e.g., small bordered buttons)

---

## 9. Build the Table Selection modal ✅

Goal: When a host clicks Seat on a notified party, a modal opens showing available tables grouped by capacity. The host selects a table, which gets marked occupied, linked to the party, and the party transitions to Seated status.

Acceptance criteria:
- [x] Clicking the Seat button on a notified party opens the TableSelectionModal overlay
- [x] The modal displays available tables grouped under capacity headers (e.g., "2-Top", "4-Top")
- [x] Occupied tables (`is_occupied: true`) are visually dimmed and cannot be clicked
- [x] Selecting an available table calls `updateTable` to mark it occupied and link the party, then calls `updateParty` to set status to `seated`
- [x] After successful seating, the waitlist and table queries invalidate so the UI reflects the new state
- [x] Clicking Cancel or the overlay backdrop closes the modal with no state changes
- [x] Pressing Escape closes the modal with no state changes
- [x] A loading spinner shows while tables are being fetched
- [x] An error message is displayed if table fetching or seating fails
- [x] When no tables exist or all tables are occupied, the modal shows a "No tables available" message
- [x] Tests verify: modal opens on Seat click, capacity grouping, occupied table dimming and click prevention, successful selection updates table and party, cancel closes without changes

Out of scope:
- Table creation, editing, or deletion (manager features)
- Real-time table status updates from other sources
- Filtering tables by party size or suggesting best-fit tables
- Drag-and-drop or floor plan visualization
- Automatic party-to-table matching based on capacity

Constraints:
- Component file: `frontend/src/components/TableSelectionModal.tsx`
- Test file: `frontend/src/components/TableSelectionModal.test.tsx`
- Use React Query (`useQuery`, `useMutation`, `useQueryClient`) for data fetching and cache invalidation
- Use the service functions from `frontend/src/services/index.ts` (`getTables`, `updateTable`, `updateParty`)
- Use the `Table` and `Party` types from `frontend/src/types/index.ts`
- Use Tailwind classes consistent with existing components (see `PartyActions.tsx` for button and layout patterns)
- Follow testing patterns from `PartyActions.test.tsx`: mock services via `vi.mock`, use `renderWithQuery` helper, test with `@testing-library/react` and Vitest
- The Seat button in `PartyActions.tsx` currently seats the party directly — this task replaces that behavior with opening the modal; `PartyActions` will need to accept an `onSeat` callback prop or the modal state will live in the parent

---

## 10. Build the Undo bar ✅

Goal: A toast/snackbar appears at the bottom of the screen after each party action (notify, seat, cancel, urgent), showing what happened and providing an Undo button that reverses the change.

Acceptance criteria:
- [x] `components/UndoBar.tsx` renders a toast container fixed to the bottom of the screen
- [x] After a Notify action, a toast appears with text like "Party notified" and an Undo button
- [x] After a Seat action, a toast appears with text like "Party seated" and an Undo button
- [x] After a Cancel action, a toast appears with text like "Party canceled" and an Undo button
- [x] After a Mark Urgent action, a toast appears with text like "Party marked urgent" and an Undo button
- [x] Clicking Undo calls `undoAction` from the services layer with the correct party ID and removes the toast
- [x] Each toast auto-dismisses after 8 seconds if Undo is not clicked
- [x] Multiple toasts stack vertically (newest at bottom or top, consistently)
- [x] Toast is positioned above any modals (z-index management)
- [x] Tests verify: toast appears after each action type, Undo calls undoAction, auto-dismiss after 8 seconds, multiple toasts stack

Out of scope:
- Error/retry UI for failed undo — Task 17
- Non-undoable success toasts (e.g., "Party added") — those can reuse this pattern later
- Undo history list or manager — just the last action for now

Constraints:
- Component file: `frontend/src/components/UndoBar.tsx`
- Test file: `frontend/src/components/UndoBar.test.tsx`
- Toast state lives in Zustand store (extend `appStore` with a `toasts` array and actions: `addToast`, `removeToast`)
- Each toast has: `id`, `message`, `partyId`, `actionType`
- Use `undoAction` from `frontend/src/services/index.ts`
- After undo, invalidate `['waitlist']` query cache
- Use Tailwind CSS for styling
- No external toast library (no react-hot-toast, no sonner, etc.)
- Auto-dismiss uses `setTimeout` with cleanup on unmount

---

## 11. Build the Pause/Resume toggle ✅

Goal: A host can pause the waitlist from the HostView header to stop accepting new parties. When paused, the Add Party form is hidden and a "Waitlist Paused" banner is displayed. Resuming restores normal behavior.

Acceptance criteria:
- [x] A toggle switch (checkbox or styled toggle) is visible in the HostView header area, labeled "Paused" or "Resume"
- [x] Default state is unpaused (resumed) on initial load
- [x] When paused, the Add Party form is hidden (not rendered in the DOM)
- [x] When paused, a banner with the text "Waitlist Paused" is visible above or in place of the form
- [x] When resumed, the Add Party form is visible again
- [x] When resumed, the "Waitlist Paused" banner is hidden
- [x] Clicking the toggle calls `setWaitlistPaused` from the services layer
- [x] The pause state is loaded from the services layer on mount
- [x] The pause state persists across component re-renders without flickering
- [x] The existing waitlist continues to display parties regardless of pause state
- [x] Tests verify: toggling to paused hides the form and shows the banner
- [x] Tests verify: toggling to resumed shows the form and hides the banner
- [x] Tests verify: the mock service `setWaitlistPaused` is called when the toggle changes

Out of scope:
- Blocking notify/seat/cancel actions on existing parties when paused
- Per-party pause or hold functionality
- Persisting pause state to localStorage or backend database
- Manager-only restriction on the toggle
- Visual changes to party action buttons when paused
- Real API integration for pause settings

Constraints:
- Files: `frontend/src/pages/HostView.tsx`, `frontend/src/components/PauseToggle.tsx` (new), `frontend/src/components/PauseToggle.test.tsx` (new), `frontend/src/services/mock.ts`, `frontend/src/services/api.ts`, `frontend/src/services/index.ts`, `frontend/src/store/appStore.ts`
- Libraries: Zustand, TanStack Query, Tailwind CSS, Vitest (all already installed)
- The pause state is a **global setting**, not per-party
- Mock service must expose `getWaitlistPaused(): Promise<boolean>` and `setWaitlistPaused(paused: boolean): Promise<void>` with in-memory state
- `api.ts` real API stubs must have matching signatures (`GET /api/settings/waitlist-paused` and `PATCH /api/settings/waitlist-paused`)
- Use React Query for loading initial pause state
- Do not install new packages
- All scripts (`test`, `typecheck`, `build`) must pass

---

## 12. Build the Guest Status page ✅

Goal: A guest can view their position, confirm they are waiting, or cancel from a mobile-optimized page accessed via a shareable link (`/status/{token}`) with no authentication required.

Acceptance criteria:
- [x] `react-router-dom` is installed and configured in `frontend/`
- [x] A `GuestStatus` route exists at `/status/:token`
- [x] The page fetches party data by token using a new service function `getPartyByToken(token: string): Promise<WaitlistEntry | null>`
- [x] When a valid party is found, the page displays: position in line, estimated wait time, party size, and current status
- [x] When the token is invalid or party not found, the page displays "Party not found"
- [x] **Confirm** button is visible when party status is `waiting` or `notified`; clicking it calls `confirmWaiting(token)` and shows a success message
- [x] **Cancel** button is visible when party status is `waiting` or `notified`; clicking it calls `cancelParty(token)` and shows a confirmation message
- [x] Confirm and Cancel buttons are hidden when status is `seated`, `canceled`, or `no_show`
- [x] A loading spinner is shown while the party data is being fetched
- [x] Touch targets are at least 48px (mobile-first design)
- [x] `frontend/src/pages/GuestStatus.test.tsx` exists and covers: valid party renders, invalid token shows error, confirm button calls service and shows success, cancel button calls service and shows confirmation

Out of scope:
- Host integration (adding the guest link to notifications) — follow-up task
- PIN authentication on the link — no auth needed per requirements
- No-show auto-transition logic — handled by backend/background job
- Undo support on guest actions — not applicable
- UI placement of the guest link in the host view — follow-up task

Constraints:
- Install `react-router-dom` in `frontend/package.json`
- Add `token` field to `Party` type in `frontend/src/types/index.ts`
- Add `getPartyByToken`, `confirmWaiting`, and `cancelParty` functions to `api.ts`, `mock.ts`, and `index.ts`
- The mock `getPartyByToken` searches the in-memory parties array by `token` field
- Use Tailwind CSS classes consistent with existing components
- Follow existing test patterns: vitest, @testing-library/react, `vi.mock`, `renderWithQuery` helper
- Do not install any other new packages beyond `react-router-dom`

---

## 13. Build the Manager PIN modal ✅ ✅

Goal: A manager can enter a 4-digit PIN via a modal to unlock manager-only features. The modal is triggered from the HostView header, validates against the mock `verifyPin` service (PIN `"1234"`), sets `isManager=true` in Zustand on success, shows an error with shake animation on failure, and locks the input for 30 seconds after 5 consecutive wrong attempts.

Acceptance criteria:
- [x] `frontend/src/components/ManagerPinModal.tsx` exists and exports a default component
- [x] `frontend/src/components/ManagerPinModal.test.tsx` exists and all tests pass
- [x] When `isOpen` is `false`, the modal renders nothing
- [x] When `isOpen` is `true`, the modal displays a dialog with a 4-digit PIN input field and a submit button
- [x] Entering the correct PIN (`"1234"`) and submitting calls `verifyPin`, sets `isManager=true` in the Zustand store, and calls `onClose`
- [x] Entering an incorrect PIN and submitting displays the text `"Invalid PIN"` below the input
- [x] After each incorrect PIN submission, the input field triggers a shake animation (CSS class applied for ~500ms)
- [x] After 5 consecutive incorrect PIN submissions, the input and submit button are disabled
- [x] While locked out, a countdown timer is visible showing the remaining seconds (starting at 30, decrementing to 0)
- [x] When the countdown reaches 0, the input and submit button are re-enabled and the lockout state resets
- [x] Closing the modal via `onClose` (Cancel button, backdrop click, or Escape key) resets the attempt counter and lockout state
- [x] Opening the modal while already locked out shows the remaining countdown and disabled inputs
- [x] The modal is wired into `frontend/src/pages/HostView.tsx` with a "Manager" toggle button in the header
- [x] Clicking the Manager button in the header opens the `ManagerPinModal`
- [x] `npm run typecheck` passes with zero errors
- [x] `npm run test` passes including the new `ManagerPinModal.test.tsx` tests

Out of scope:
- Building the Manager Settings page — moved to #14
- Changing or resetting the PIN — moved to #14
- Restricting any other UI elements to manager-only mode — handled in #14
- Persisting lockout state across page reloads — lockout is in-memory only
- Real WebSocket or API-based PIN verification — uses mock `verifyPin` only

Constraints:
- Files: `frontend/src/components/ManagerPinModal.tsx`, `frontend/src/components/ManagerPinModal.test.tsx`; edit `frontend/src/pages/HostView.tsx` to add the trigger button and modal wiring
- Libraries: Zustand (`useAppStore`), TanStack Query (`useMutation`), Tailwind CSS, Vitest + `@testing-library/react` + `@testing-library/user-event` (all already installed)
- PIN verification uses `verifyPin` from `frontend/src/services/index.ts`
- On success: call `useAppStore().setIsManager(true)` then `onClose()`
- Lockout counters are local component state — do not add fields to the Zustand store
- Shake animation must be Tailwind-compatible CSS animation
- Follow existing modal patterns from `TableSelectionModal.tsx`
- Do not install any new dependencies
- Do not modify `App.tsx` routing

---

## 14. Build the Manager Settings page ✅

Goal: A manager can view and manage restaurant tables, change their access PIN, and adjust the average table turnover time on a protected `/settings` page; non-managers are redirected to the host view.

Acceptance criteria:
- [x] The route `/settings` is registered in `App.tsx` and renders `ManagerSettings`
- [x] When `isManager` is `false` (Zustand store default), navigating to `/settings` redirects to `/` (HostView)
- [x] When `isManager` is `true`, navigating to `/settings` shows the settings page instead of redirecting
- [x] The page displays a "Table Management" section with a heading
- [x] The table list renders every table from `getTables()` showing its `label` and `capacity`
- [x] When no tables exist, the list shows "No tables configured"
- [x] An "Add Table" form with `label` (text) and `capacity` (number) fields is visible
- [x] Submitting the form with a non-empty label and capacity between 1–20 calls `createTable` and appends the new table to the list
- [x] Submitting the form with an empty label shows a validation error below the label field
- [x] Submitting the form with capacity outside 1–20 shows a validation error below the capacity field
- [x] Each table row has a "Delete" button
- [x] Clicking Delete shows a confirmation dialog (`window.confirm`) asking "Are you sure you want to delete this table?"
- [x] Confirming the dialog calls `deleteTable(id)` and removes the table from the list
- [x] Cancelling the dialog leaves the table in the list
- [x] Deleting a table that is currently occupied (`is_occupied: true`) still succeeds
- [x] The page displays a "Change PIN" section with a heading
- [x] The PIN form has three inputs: "Current PIN", "New PIN", and "Confirm New PIN"
- [x] Submitting with the wrong current PIN shows an error message and does not change the PIN
- [x] Submitting with new PIN and confirm PIN that do not match shows a mismatch error and does not change the PIN
- [x] Submitting with matching new PIN and confirm PIN, and correct current PIN, calls `changePin` and shows a success message
- [x] PIN inputs accept only numeric characters (4–8 digits)
- [x] The page displays a "Wait Time Config" section with a heading
- [x] The config section shows the current `avg_turnover_time` value (default: 45 minutes)
- [x] Changing the value via input and saving calls the service and persists the new value in the mock store
- [x] Saving a value outside 5–120 minutes shows a validation error
- [x] All three sections are visible on the same page
- [x] `frontend/src/pages/ManagerSettings.test.tsx` exists and all tests pass

Out of scope:
- Table edit / rename functionality — moved to #21
- Table assignment or seating logic on the settings page — handled in Task 9
- Real PIN persistence beyond the mock store
- CSV/PDF export or analytics on the settings page — moved to #15
- Manager navigation bar or tab switching — out of scope for this task
- Route guards as a reusable component — inline check in `ManagerSettings` is sufficient for now

Constraints:
- Files: `frontend/src/pages/ManagerSettings.tsx` and `frontend/src/pages/ManagerSettings.test.tsx` for the page; plus `frontend/src/services/api.ts`, `frontend/src/services/mock.ts`, and `frontend/src/services/index.ts` for service additions
- Must add `deleteTable(id: string): Promise<void>` to `api.ts`, `mock.ts`, and `index.ts`
- Must add `getAvgTurnoverTime(): Promise<number>` and `setAvgTurnoverTime(minutes: number): Promise<void>` to `api.ts`, `mock.ts`, and `index.ts`
- Mock default `avg_turnover_time` is 45 minutes
- Must add the `/settings` route in `frontend/src/App.tsx`
- Use Zustand `useAppStore().isManager` for the access check
- Use TanStack Query for all data fetching and mutations
- Use Tailwind CSS for styling, consistent with existing components
- Use Vitest + `@testing-library/react` for tests; mock services with `vi.mock('../services/index.ts')`
- Do not install any new packages

---

## 15. Build the Reports page ✅

Goal: A manager can navigate to `/reports` and see daily waitlist statistics (total parties, avg wait time, no-show rate, seat utilization) in stat cards and a bar chart rendered with Recharts, plus working CSV and PDF export buttons.

Acceptance criteria:
- [x] Navigating to `/reports` as a non-manager redirects to `/` and renders nothing on the reports route
- [x] Navigating to `/reports` as a manager displays four stat cards: Total Parties, Average Wait Time, No-Show Rate, Seat Utilization
- [x] The stat card values are pulled from `getDailyReport` and render correctly when the response returns zero for any metric
- [x] A Recharts `<BarChart>` renders below the stat cards using mock/static bar data
- [x] Clicking the "Export CSV" button triggers a browser download of a `.csv` file whose first line is a header row and second line contains the current report values
- [x] Clicking the "Export PDF" button calls `window.open` with a new tab containing a styled HTML report
- [x] The route `/reports` is registered in `App.tsx` alongside existing routes
- [x] Unit tests verify: manager redirect behavior, stat card text renders the four metrics, chart element is present in the DOM, CSV button click triggers a download, and PDF button click calls `window.open`

Out of scope:
- Real PDF generation (explicitly mocked per constraints)
- Date-range picker or multi-day comparison
- Server-side CSV/PDF streaming
- Charts that plot historical data over time
- Backend API changes to `getDailyReport`

Constraints:
- File: `frontend/src/pages/Reports.tsx` and `frontend/src/pages/Reports.test.tsx`
- Route added in `frontend/src/App.tsx` at `/reports`
- Chart library: `recharts` (must be installed via `npm install recharts` in `frontend/`)
- Stats fetched with `getDailyReport` from `frontend/src/services/index.ts`
- Manager guard uses `useAppStore` (`isManager`) and `useNavigate` from `react-router-dom`
- CSV export: create a `Blob` with `type: 'text/csv'`, generate an invisible `<a>` element, call `click()`, then clean up
- PDF export: construct an HTML string and open it via `window.open(..., '_blank')` — no external PDF library
- Tests use Vitest + Testing Library, following the mock pattern in existing tests
- Styling uses Tailwind classes consistent with the rest of the app
- No `console.log` debugging statements in the final component

---

## 16. Integrate WebSocket for real-time sync ✅

Goal: After mounting HostView, the app opens a WebSocket connection to the configured endpoint and keeps it alive with exponential backoff; when a `"waitlist_update"` message arrives, React Query's `['waitlist']` cache is invalidated so all open tabs see the latest data instantly, and a small status dot in the header shows connected/disconnected.

Acceptance criteria:
- [x] `useWebSocket.ts` exists at `frontend/src/hooks/useWebSocket.ts` and reads the URL from `import.meta.env.VITE_WS_URL`, falling back to `ws://localhost:51737`
- [x] In mock mode (`VITE_USE_MOCK === "true"`), the hook does not create a WebSocket connection and immediately sets `wsConnected` to `false`
- [x] When mounted in a non-mock environment, the hook opens a WebSocket to the configured URL and calls `setWsConnected(true)` on open
- [x] When the WebSocket closes unexpectedly, the hook calls `setWsConnected(false)` and schedules a reconnection attempt
- [x] Reconnection uses exponential backoff starting at 1 second with a configurable multiplier (e.g., ×2) and a maximum cap (e.g., 30 seconds)
- [x] On a `"waitlist_update"` message (any valid JSON payload), the hook calls `queryClient.invalidateQueries({ queryKey: ['waitlist'] })` to refresh the list
- [x] On a `"waitlist_update"` message, the hook also calls `setWsConnected(true)` to ensure the flag is current
- [x] A connection status indicator (a small colored dot or label) renders inside the `HostView.tsx` header next to the existing controls, showing "Connected" / "Disconnected" based on `wsConnected` from the store
- [x] The indicator is visible only when not in mock mode (or shows a mock label such as "Mock" to avoid confusion)
- [x] Tests in `frontend/src/hooks/useWebSocket.test.ts` verify: (1) no WebSocket is opened in mock mode, (2) `invalidateQueries` is called on a `"waitlist_update"` message, (3) `wsConnected` flips to `true` on open and `false` on close, (4) backoff delays increase across reconnection attempts
- [x] `npm run test` passes with the new hook tests included
- [x] `npm run typecheck` passes

Out of scope:
- Parsing or acting on specific message payloads beyond invalidating the cache
- Persisting WebSocket state across page reloads
- Handling authentication tokens or secure WebSocket upgrades
- Backend WebSocket server implementation — this task only covers the frontend consumer
- Real-time toast notifications triggered by WS messages

Constraints:
- Files: create `frontend/src/hooks/useWebSocket.ts` and `frontend/src/hooks/useWebSocket.test.ts`; minimal edit to `frontend/src/pages/HostView.tsx` to render the status indicator
- No new npm dependencies — use the native `WebSocket` API and existing `@tanstack/react-query` + `zustand`
- Follow the existing mock-mode pattern from `services/index.ts`
- Use `queryClient.invalidateQueries` from `@tanstack/react-query` (access the client via `useQueryClient` hook)
- Store interaction must use the existing `setWsConnected` action from `frontend/src/store/appStore.ts` — do not add new store fields
- Connection status indicator should use Tailwind CSS classes consistent with the existing header style
- Tests must use Vitest + `@testing-library/react` patterns consistent with existing tests
- The hook must clean up the WebSocket connection and clear all timers on unmount to prevent memory leaks
- Backoff logic must be deterministic and testable (use `vi.useFakeTimers()` where needed)

---

## 17. Add error handling and loading states ✅

Goal: Every view handles loading, empty, error, and success states correctly with skeleton loaders, error boundaries, retry buttons, and user-friendly network error messages.

Acceptance criteria:
- [x] A shared `ErrorBoundary` component exists at `frontend/src/components/ErrorBoundary.tsx`
- [x] A shared `SkeletonLoader` component exists at `frontend/src/components/SkeletonLoader.tsx`
- [x] HostView shows a skeleton/spinner while loading, an error panel with retry button on failure, and a helpful empty state
- [x] GuestStatus shows a skeleton/spinner while loading, an error panel with retry button on failure, and handles "Party not found" gracefully
- [x] ManagerSettings shows a skeleton/spinner while loading, an error panel with retry button on failure
- [x] Reports shows a skeleton/spinner while loading, an error panel with retry button on failure
- [x] AddPartyForm shows an error message on submission failure without clearing the form
- [x] PartyActions shows user-friendly error messages on action failures
- [x] Network errors show user-friendly messages (no raw HTTP status codes exposed to the user)
- [x] Success toasts are shown for completed actions (reuse existing UndoBar/addToast pattern)
- [x] Tests verify loading, error, and empty states for each page

Out of scope:
- WebSocket reconnect errors — covered in Task 16
- App-wide error boundary (scoped to per-page only)
- Tablet layout changes — covered in Task 18

Constraints:
- Do not change existing functionality — only add error/loading states
- Reuse the UndoBar pattern for success toasts
- Use Tailwind CSS for skeleton shimmer animation
- Follow existing test patterns: vitest, @testing-library/react, `vi.mock`
- No new npm dependencies
- All scripts (`test`, `typecheck`, `build`) must pass

---

## 18. Responsive tablet layout ✅

Goal: The app looks correct and interactive on 1024px+ tablets in both orientations, with touch-friendly targets, centered modals, a sticky header, and no horizontal scrolling — while preserving the existing desktop layout.

Acceptance criteria:
- [x] All interactive elements (buttons, form inputs, toggles) have a minimum height of 48px (`min-h-12` or equivalent Tailwind class)
- [x] A `ResponsiveTablet.test.tsx` exists that simulates 768px and 1024px viewports and asserts all interactive elements meet the 48px touch target minimum
- [x] The main header is sticky or fixed at the top of the viewport (`sticky top-0 z-50` or equivalent)
- [x] Modals (TableSelectionModal, ManagerPinModal) are centered and fully visible within a 768px-wide container — no content is cut off or requires scrolling within the modal
- [x] No page produces horizontal overflow at 768px or 1024px widths
- [x] The `viewport` meta tag in `index.html` includes `width=device-width, initial-scale=1`
- [x] `npm run typecheck` passes with zero errors
- [x] `npm run build` succeeds without errors

Out of scope:
- Mobile-only layout changes (320px–767px) — already handled in earlier tasks
- Design system overhauls or new UI component libraries
- Adding a new navigation component or menu
- Screenshot-based visual regression tests
- Tablet-specific features beyond layout

Constraints:
- Edit only layout/styling files: `frontend/src/pages/*.tsx`, `frontend/src/components/*.tsx`, `frontend/index.html`
- Do not modify services, store, hooks, or types
- Use Tailwind responsive utilities (`sm:`, `md:`, `lg:`) — do not add custom CSS media queries
- Desktop layout must not regress — verify `npm run test` still passes
- Tests should use jsdom with adjusted container width to simulate tablet viewports

---

## 19. Add Vitest unit tests for all hooks and stores ✅

Goal: All existing custom hooks and the Zustand store have unit tests using Vitest and @testing-library/react, with the services layer mocked so no real fetch calls are made.

Acceptance criteria:
- [x] `frontend/src/hooks/useWebSocket.test.tsx` contains tests covering: mock-mode skips connection and sets `wsConnected=false`; `invalidateQueries(['waitlist'])` is called when a `waitlist_update` message is received; `wsConnected` becomes `true` on open and `false` on close; exponential backoff delays increase across reconnection attempts; unmount cleans up the WebSocket and clears the reconnect timer
- [x] `frontend/src/store/appStore.test.ts` contains tests covering: initial state defaults for all fields (`currentView`, `isManager`, `wsConnected`, `lastAction`, `toasts`); each setter updates its corresponding field; `addToast` appends a toast with a generated `id`; `removeToast` removes the matching toast by `id`; combined sequential updates preserve all fields
- [x] All test files reside in the same directory as their source (`hooks/` and `store/`)
- [x] Services are mocked via `vi.mock('../services/index.ts')` or equivalent — no real `fetch` is invoked in any test
- [x] `npm run test` passes with zero failures
- [x] `npm run test -- --coverage` reports ≥ 80% branch/statements coverage for the `hooks/` and `store/` directories
- [x] `npm run typecheck` exits with code 0

Out of scope:
- Testing hooks that do not yet exist (`useWaitlist`, `useManagerPin`) — these are not implemented in the codebase
- Component-level tests (covered in other tasks)
- Integration or E2E tests (Task 20)
- Adding `useWaitlist` or `useManagerPin` hooks as part of this task

Constraints:
- Use `vitest` as the test runner; do not use Jest
- Use `@testing-library/react` with `renderHook` for hook tests
- Mock the services layer at `frontend/src/services/index.ts`; never call the real `fetch`
- Configure Vitest coverage in `vite.config.ts` (or a separate `vitest.config.ts`) to cover the `hooks/` and `store/` directories
- Do not add new npm dependencies
- Follow existing test patterns: `vi.stubEnv`, `vi.mock`, `beforeEach` store reset, `renderWithQuery`-style wrappers where React Query context is needed

---

## 20. End-to-end integration test (mock only) ✅

Goal: A single in-memory integration test verifies the complete host workflow — adding a party, notifying them, seating them at a table, and confirming they leave the waitlist — rendered inside the full HostView component tree with all providers.

Acceptance criteria:
- [x] `frontend/src/tests/e2e/host-journey.test.tsx` exists and passes with `npm run test`
- [x] The test renders `HostView` wrapped in `QueryClientProvider`, `BrowserRouter` (or equivalent test router), and the required store/provider context
- [x] The test submits the `AddPartyForm` with a valid name and party size and waits for the party to appear in the rendered list
- [x] The test asserts the party's name and status badge (`Waiting`) are visible after submission
- [x] The test clicks the **Notify** button and asserts the party's status badge changes to `Notified`
- [x] The test clicks the **Seat** button and asserts the `TableSelectionModal` opens
- [x] The test pre-creates at least one available table in the mock service before the seating step
- [x] The test clicks an available table in the modal and asserts the modal closes
- [x] The test asserts the party is no longer present in the waitlist (removed from the DOM)
- [x] The test asserts the party's status transitioned through `waiting → notified → seated` (verifiable via service mock call logs or DOM assertions at each step)
- [x] All mocks are reset between steps so the test is deterministic and isolated
- [x] `npm run typecheck` passes with zero errors from the new test file

Out of scope:
- Real network calls or a running backend server
- MSW usage — the project already uses `vi.mock` for service mocking
- Table creation UI within the test — tables are pre-seeded in the mock store
- Testing error paths (network failure, invalid transitions, empty tables) — covered by existing unit tests
- WebSocket real-time sync verification — handled in Task 16
- Undo flow or toast assertions — not required by the core journey
- Multi-party or concurrent user scenarios — single-party linear flow only
- Visual regression or screenshot testing

Constraints:
- File location: `frontend/src/tests/e2e/host-journey.test.tsx` (create the `tests/e2e/` directory under `frontend/src/`)
- Test runner: Vitest with `@testing-library/react` and `@testing-library/user-event` (already installed)
- Mocking: `vi.mock('../services/index.ts')` following the exact pattern used in `PartyActions.test.tsx` and `TableSelectionModal.test.tsx`
- Router: wrap `HostView` in `BrowserRouter` from `react-router-dom` (already installed) to provide routing context
- Providers: include `QueryClientProvider` with `retry: false` and any store/context wrappers `HostView` consumes
- Service mocks must cover: `getWaitlist`, `addParty`, `updateParty`, `getTables`, `updateTable`
- The test must be fully self-contained: seed data (tables), perform the journey, and assert outcomes — no shared mutable state from other tests
- No new npm dependencies may be installed
- Follow existing test conventions: `renderWithQuery` helper, `beforeEach` with `vi.clearAllMocks()`, `waitFor` for async DOM updates, descriptive `it()` strings

---

# Backend Backlog

## 1. Scaffold FastAPI project with a passing test

Goal: A `backend/` directory exists with a uv-managed Python project, FastAPI app structure, and one passing test.

Description:
Initialize the backend project using `uv` with FastAPI as the only dependency.
Create the package structure (`app/__init__.py`, `app/main.py`, `tests/`) and a
minimal FastAPI app that returns a 200 on `GET /health`. Write a single passing
pytest test for it. The backend listens on port 5173 by default.

Acceptance criteria:
- [ ] `backend/` directory exists with `pyproject.toml` managed by `uv`
- [ ] `uv run pytest` passes with at least one test
- [ ] `uv run fastapi dev backend/app/main.py` starts the server on port 5173
- [ ] `GET /health` returns `{"status": "ok"}` with HTTP 200
- [ ] No other code or dependencies added yet

Constraints:
- Use Python 3.12+ and `uv` for dependency management
- Use `pytest` as the test runner
- Do not add any application logic yet — this is pure scaffolding
- Port must be 5173 (the frontend's `VITE_API_BASE_URL` points here)

---

## 2. Define data models and Pydantic schemas

Goal: All domain entities (Party, Table, ActionLog, Settings) are represented as dataclasses with matching Pydantic schemas for request/response validation.

Description:
Create `backend/app/models/` with dataclasses for the core entities and `backend/app/schemas/` with Pydantic v2 models for API serialization. Parties have id (UUID), name, party_size, phone, email, status (enum), position, estimated_wait, notes, urgent, token (NanoID), timestamps, and nullable completion times. Tables have id, capacity, label, is_occupied, occupied_by_party_id, and created_at. ActionLog records id, party_id, action, previous_state (JSON), created_by, created_at. Settings stores key-value pairs. Request schemas cover CreatePartyRequest, UpdatePartyRequest, CreateTableRequest, UpdateTableRequest, PinVerifyRequest, PinChangeRequest.

Acceptance criteria:
- [ ] `backend/app/models/__init__.py` exports Party, Table, ActionLog, AppSettings dataclasses
- [ ] `backend/app/schemas/__init__.py` exports all Pydantic request/response schemas
- [ ] `PartyStatus` enum includes: waiting, notified, seated, canceled, no_show
- [ ] All timestamp fields are `datetime` with `default_factory=datetime.now(timezone.utc)`
- [ ] `token` field is `str | None` (nullable NanoID for guest links)
- [ ] `previous_state` in ActionLog is `str | None` (JSON-serialized snapshot)
- [ ] Every schema has proper field validators (party_size 1–12, capacity 1–20, pin digits only)
- [ ] `uv run pytest` still passes (no regression)
- [ ] `uv run pyright backend/` or `uv run mypy backend/` type-checks clean

Constraints:
- Use `dataclasses` from the standard library, not SQLAlchemy (in-memory store)
- Use Pydantic v2 (`model_validator`, `field_validator`) for schema validation
- Do not import or reference any database library
- Keep schemas minimal — no business logic in schemas

---

## 3. Build the in-memory store

Goal: A thread-safe in-memory data store that holds all parties, tables, action logs, settings, and auth tokens, with CRUD operations for each entity.

Description:
Create `backend/app/store/memory.py` containing a `MemoryStore` class. It holds: `parties` dict (id → Party), `tables` dict (id → Table), `action_logs` list, `settings` dict (key → value), `pins` dict (pin_hash → valid), `auth_tokens` dict (token_str → set of permissions/scopes), and `waitlist_paused` bool. Provide methods: `add_party()`, `get_party()`, `list_parties()`, `update_party()`, `delete_party()`, `get_party_by_token()`, `add_action_log()`, `get_action_logs_for_party()`, `add_table()`, `get_tables()`, `update_table()`, `delete_table()`, `get_setting()`, `set_setting()`, `add_token()`, `remove_token()`, `clear()`. Each party gets a UUID and a NanoID token on creation. Tables are created unoccupied. The store is a singleton accessible via a module-level instance.

Acceptance criteria:
- [ ] `MemoryStore` class exists in `backend/app/store/memory.py`
- [ ] `add_party()` generates a UUID id and a NanoID token, sets status to `waiting`, timestamps to now
- [ ] `list_parties()` returns parties sorted by position (ascending), with position auto-assigned on creation
- [ ] `get_party_by_token(token)` returns the party or None
- [ ] `update_party(id, updates)` applies partial updates and updates `updated_at`
- [ ] `delete_party(id)` removes the party; returns None if not found
- [ ] `add_action_log()` records an entry with party_id, action name, previous_state (JSON snapshot), created_by, timestamp
- [ ] `get_action_logs_for_party(id)` returns logs for that party ordered by created_at desc
- [ ] `add_table()` generates UUID, defaults is_occupied=False
- [ ] `get_tables()` returns all tables
- [ ] `update_table(id, updates)` applies partial updates
- [ ] `delete_table(id)` removes the table
- [ ] `set_setting(key, value)` and `get_setting(key)` work for arbitrary key-value pairs
- [ ] `add_token(token, scopes)` and `remove_token(token)` manage auth tokens
- [ ] `clear()` resets all data (used in tests)
- [ ] Store is importable as `from app.store.memory import store` (module-level singleton)
- [ ] `uv run pytest` passes
- [ ] `uv run pyright backend/` type-checks clean

Constraints:
- Use `uuid.uuid4()` for IDs and `nanoid` for guest tokens (install `nanoid` via uv)
- Use `threading.Lock` for thread safety (FastAPI async may use multiple tasks)
- Snapshot previous_state as JSON string for undo support
- No persistence to disk — data resets on server restart
- Do not create any router endpoints in this task

---

## 5. Implement authentication: PIN hashing, bearer tokens, and dependencies

Goal: The backend can verify a 4–8 digit PIN, issue a short-lived bearer token, and protect endpoints with a FastAPI dependency that validates the token.

Description:
Create `backend/app/auth/` with two modules. `manager.py` provides `hash_pin(pin: str) -> str` using bcrypt, `verify_pin(stored_hash: str, pin: str) -> bool`, `generate_token() -> str` (UUID-based), and `revoke_token(token: str)`. `dependencies.py` provides `get_current_user_token(authorization: str = Header(...)) -> str` FastAPI dependency that checks the token against the store's `auth_tokens`, and `require_manager()` that combines token validation with a scope check. The default PIN for development is "1234" (hashed once and stored in the store). Token lifetime is 24 hours. All auth functions are pure (no side effects on the store except token add/remove).

Acceptance criteria:
- [ ] `hash_pin("1234")` produces a bcrypt hash that `verify_pin(hash, "1234")` returns True for
- [ ] `verify_pin(hash, "wrong")` returns False
- [ ] `generate_token()` returns a non-empty string
- [ ] `get_current_user_token` dependency raises `HTTPException(401)` for missing or invalid tokens
- [ ] `require_manager` dependency raises `HTTPException(403)` for valid token without manager scope
- [ ] Token is added to store on verify success and removed on revoke
- [ ] `uv run pytest` passes
- [ ] `uv run pyright backend/` type-checks clean

Constraints:
- Install `passlib[bcrypt]` and `python-multipart` via uv
- Do not add any router endpoints in this task
- The token is a simple string stored in-memory; no JWT needed
- PIN hashes are stored in the settings store under key `"manager_pin_hash"`

---

## 4. Seed the store with realistic test data

Goal: The in-memory store is populated with sample parties, tables, and settings so the frontend displays meaningful data on first load.

Description:
Create `backend/seed.py` that populates the `MemoryStore` with: 5–8 parties at various statuses (waiting, notified, seated), 6 tables across capacities (2-top × 2, 4-top × 2, 6-top × 1, 8-top × 1), a default manager PIN hash (for "1234"), avg_turnover_time=30, waitlist_paused=False, and a few action logs to demonstrate the undo feature. The seed must be idempotent (safe to run multiple times). Import the store singleton, clear it, then insert data. Provide a `seed()` function and a `if __name__ == "__main__":` entry point.

Acceptance criteria:
- [ ] `backend/seed.py` imports the store and calls `store.clear()` then inserts data
- [ ] At least 3 parties in `waiting` status with names, party sizes, phone numbers
- [ ] At least 1 party in `notified` status
- [ ] At least 1 party in `seated` status
- [ ] At least 6 tables covering capacities 2, 4, 6, and 8
- [ ] Default PIN "1234" is hashed and stored via `store.set_setting("manager_pin_hash", ...)`
- [ ] `avg_turnover_time` setting defaults to 30
- [ ] `waitlist_paused` defaults to False
- [ ] Running `uv run seed.py` completes without errors
- [ ] After seeding, `GET /api/waitlist` (once the router exists) would return the seeded data
- [ ] Running seed twice does not duplicate data

Constraints:
- Use `bcrypt` to hash the PIN "1234" (install via uv)
- Use `datetime.now(timezone.utc)` for timestamps
- Keep the seed data small and deterministic (same names, sizes, capacities every run)
- Do not create any router endpoints in this task
---

## 6. Build the waitlist router (CRUD + undo + guest endpoints)

Goal: All waitlist endpoints from the OpenAPI spec are implemented: list, create, update, delete, undo, and the three guest-facing token endpoints.

Description:
Create `backend/app/routers/waitlist.py`. Endpoints: `GET /api/waitlist` returns all parties sorted by position with calculated estimated_wait; `POST /api/waitlist` creates a party via the store; `PATCH /api/waitlist/{id}` updates a party with status transition validation (waiting->notified/canceled/no_show, notified->seated/canceled/no_show); `DELETE /api/waitlist/{id}` removes a party and logs the action; `POST /api/waitlist/{id}/undo` restores the party from the last action log entry; `GET /api/waitlist/token/{token}` returns a party by guest token or 404; `POST /api/waitlist/token/{token}/confirm` resets the party's notified_at or updates wait estimate; `POST /api/waitlist/token/{token}/cancel` cancels the party by token. Each mutating action writes an ActionLog entry. Estimated wait is calculated as `parties_ahead * avg_turnover_time`.

Acceptance criteria:
- [ ] `GET /api/waitlist` returns parties sorted ascending by position
- [ ] `POST /api/waitlist` creates a party with UUID, NanoID token, status=waiting, timestamps
- [ ] `PATCH /api/waitlist/{id}` with status "notified" on a waiting party succeeds and returns the updated party
- [ ] `PATCH /api/waitlist/{id}` with invalid transition (e.g. seated->waiting) returns HTTP 409
- [ ] `DELETE /api/waitlist/{id}` returns 204 and removes the party from the store
- [ ] `POST /api/waitlist/{id}/undo` restores the party to its previous state from the action log
- [ ] `POST /api/waitlist/{id}/undo` on a party with no action log returns HTTP 409
- [ ] `GET /api/waitlist/token/{token}` returns the party when token exists, 404 otherwise
- [ ] `POST /api/waitlist/token/{token}/confirm` returns the updated party
- [ ] `POST /api/waitlist/token/{token}/cancel` sets status to canceled and returns the party
- [ ] Every mutating endpoint writes an ActionLog entry via the store
- [ ] Estimated wait is calculated and included in the response
- [ ] `uv run pytest` passes
- [ ] `uv run pyright backend/` type-checks clean

Constraints:
- Register the router in `app/main.py` under prefix `/api/waitlist`
- Status transitions must be enforced: only allow waiting->{notified,canceled,no_show}, notified->{seated,canceled,no_show}
- Undo restores the exact previous state snapshot from ActionLog
- Estimated wait formula: len(parties_ahead) * avg_turnover_time where parties_ahead are waiting/notified parties before this one
- Do not add WebSocket code in this task

---

## 7. Build the tables router (CRUD)

Goal: Table listing, creation, update, and deletion endpoints are implemented. Creation and deletion require manager authentication.

Description:
Create `backend/app/routers/tables.py`. Endpoints: `GET /api/tables` returns all tables (no auth required); `POST /api/tables` creates a table via the store (requires manager token); `PATCH /api/tables/{id}` updates a table's capacity, label, is_occupied, or occupied_by_party_id (no auth required for occupy/clear); `DELETE /api/tables/{id}` removes a table (requires manager token). When a table is marked occupied, it must be linked to a party_id. When cleared, occupied_by_party_id is set to null.

Acceptance criteria:
- [ ] `GET /api/tables` returns all tables without requiring authentication
- [ ] `POST /api/tables` creates a table with UUID, defaults is_occupied=False, requires manager token
- [ ] `POST /api/tables` without a valid token returns HTTP 401
- [ ] `PATCH /api/tables/{id}` updates is_occupied and occupied_by_party_id
- [ ] `DELETE /api/tables/{id}` removes the table, requires manager token
- [ ] `DELETE /api/tables/{id}` without a valid token returns HTTP 401
- [ ] `DELETE /api/tables/{id}` for a non-existent table returns HTTP 404
- [ ] Occupying a table links it to a party_id; clearing unlinks it
- [ ] `uv run pytest` passes
- [ ] `uv run pyright backend/` type-checks clean

Constraints:
- Register the router under prefix `/api/tables`
- Reuse the `require_manager` auth dependency from Task 5 for create/delete
- Do not add any notification logic in this task

---

## 8. Build the settings router (PIN verify/change, config)

Goal: PIN verification, PIN change, average turnover time, and waitlist pause state endpoints are implemented. PIN change requires the current PIN.

Description:
Create `backend/app/routers/settings.py`. Endpoints: `POST /api/settings/pin` verifies a PIN against the stored hash and returns `{valid: true/false}`; on success it also issues a bearer token in the response body; `PATCH /api/settings/pin` changes the PIN after validating the current PIN; `GET /api/settings/avg-turnover-time` returns the current turnover time in minutes (default 30); `PATCH /api/settings/avg-turnover-time` updates it (requires manager token, must be 1-120); `GET /api/settings/waitlist-paused` returns the pause boolean; `PATCH /api/settings/waitlist-paused` toggles it (requires manager token). Settings are persisted in the MemoryStore.

Acceptance criteria:
- [ ] `POST /api/settings/pin` with correct PIN returns `{"valid": true, "token": "..."}`
- [ ] `POST /api/settings/pin` with wrong PIN returns `{"valid": false}` and HTTP 200
- [ ] `PATCH /api/settings/pin` with correct current PIN and new PIN updates the hash and returns 204
- [ ] `PATCH /api/settings/pin` with wrong current PIN returns HTTP 401
- [ ] `GET /api/settings/avg-turnover-time` returns a number (default 30)
- [ ] `PATCH /api/settings/avg-turnover-time` with value 45 and valid token updates and returns 204
- [ ] `PATCH /api/settings/avg-turnover-time` with value 0 returns HTTP 422
- [ ] `PATCH /api/settings/avg-turnover-time` without token returns HTTP 401
- [ ] `GET /api/settings/waitlist-paused` returns a boolean
- [ ] `PATCH /api/settings/waitlist-paused` with token toggles and returns 204
- [ ] `uv run pytest` passes
- [ ] `uv run pyright backend/` type-checks clean

Constraints:
- Register the router under prefix `/api/settings`
- The token from `POST /api/settings/pin` must be a valid bearer token accepted by the auth dependency
- PIN change re-hashes the new PIN with bcrypt
- Do not add any notification or reporting logic in this task

---

## 9. Build the reports router

Goal: The daily report endpoint calculates and returns statistics: total parties, average wait time, no-show rate, and seat utilization.

Description:
Create `backend/app/routers/reports.py`. Endpoint: `GET /api/reports/daily` returns a `DailyReportResponse` with date (today), total_parties (count of all parties ever created), average_wait_minutes (mean of seated parties' wait times, or 0 if none), no_show_rate (no_show count / total count, or 0), and seat_utilization (occupied tables / total tables, or 0). The calculation reads directly from the in-memory store. This endpoint requires manager authentication.

Acceptance criteria:
- [ ] `GET /api/reports/daily` returns all five fields: date, total_parties, average_wait_minutes, no_show_rate, seat_utilization
- [ ] With seeded data, total_parties equals the number of parties in the store
- [ ] no_show_rate is a float between 0 and 1
- [ ] seat_utilization is a float between 0 and 1
- [ ] Without a valid manager token, the endpoint returns HTTP 401
- [ ] When the store is empty, all numeric fields return 0
- [ ] `uv run pytest` passes
- [ ] `uv run pyright backend/` type-checks clean

Constraints:
- Register the router under prefix `/api/reports`
- Reuse the `require_manager` auth dependency
- Date should be ISO 8601 date string (YYYY-MM-DD) for today
- average_wait_minutes should be rounded to 1 decimal place

---

## 10. Wire up the FastAPI app: routers, lifespan, CORS, WebSocket

Goal: The FastAPI application ties together all routers, configures CORS for the frontend dev server, starts the WebSocket connection manager on lifespan, and seeds data on startup.

Description:
Update `backend/app/main.py` to import and include all four routers under `/api`. Configure CORS to allow the frontend origin (`http://localhost:4827`). Add a lifespan context manager that seeds the store on startup and starts the WebSocket manager. The WebSocket endpoint lives at `/ws/waitlist` and broadcasts a `{"type": "waitlist_update"}` JSON message to all connected clients whenever any party or table changes. The app should start on port 5173.

Acceptance criteria:
- [ ] `GET /api/waitlist` works through the full app (not just the router in isolation)
- [ ] `GET /api/tables` works
- [ ] `GET /api/settings/pin` works
- [ ] `GET /api/reports/daily` requires auth and returns 401 without token
- [ ] CORS headers are present on responses (Allow-Origin: http://localhost:4827)
- [ ] On startup, the store is seeded with test data
- [ ] `ws://localhost:5173/ws/waitlist` accepts a WebSocket connection
- [ ] Broadcasting a waitlist_update message connects to the store's change events
- [ ] `uv run pytest` passes
- [ ] `uv run pyright backend/` type-checks clean

Constraints:
- Use FastAPI's `lifespan` parameter (not the deprecated `on_event`)
- The WebSocket manager should track connected clients in a set and broadcast on any mutation
- Use `websockets` library (install via uv) for the WebSocket server
- Do not add any business logic -- this task is purely wiring

---

## 11. Write unit tests for the waitlist router

Goal: Every waitlist endpoint is covered by tests: CRUD, status transitions, undo, guest token endpoints, and error cases.

Description:
Create `backend/tests/test_waitlist.py`. Use FastAPI's `TestClient` with the app from `app.main`. Tests should cover: list parties, create a party, update party status through valid transitions, reject invalid transitions with 409, delete a party, undo an action, get party by token, guest confirm, guest cancel, 404 on missing party, 422 on invalid request body. Reset the store in a fixture or setup_function before each test.

Acceptance criteria:
- [ ] Test: `GET /api/waitlist` returns a list
- [ ] Test: `POST /api/waitlist` creates a party and returns it with status "waiting"
- [ ] Test: `PATCH /api/waitlist/{id}` with status "notified" on a waiting party succeeds
- [ ] Test: `PATCH /api/waitlist/{id}` with status "waiting" on a notified party returns 409
- [ ] Test: `DELETE /api/waitlist/{id}` returns 204
- [ ] Test: `POST /api/waitlist/{id}/undo` restores previous state
- [ ] Test: `GET /api/waitlist/token/{token}` returns the party
- [ ] Test: `POST /api/waitlist/token/{token}/confirm` returns updated party
- [ ] Test: `POST /api/waitlist/token/{token}/cancel` sets status to canceled
- [ ] Test: 404 when party ID does not exist
- [ ] Test: 422 when request body is invalid (e.g. party_size=0)
- [ ] All 11 tests pass with `uv run pytest`
- [ ] Store is reset between tests

Constraints:
- Use `pytest` fixtures for app and store cleanup
- Use `httpx` (already available via FastAPI TestClient) for requests
- Do not test WebSocket in this file

---

## 12. Write unit tests for tables and settings routers

Goal: Table CRUD and settings (PIN, config) endpoints are fully tested, including auth gating.

Description:
Create `backend/tests/test_tables.py` and `backend/tests/test_settings.py`. Table tests cover: list tables (no auth), create table (requires auth -> 401 without token), update table (occupy/clear), delete table (requires auth). Settings tests cover: verify correct PIN returns token, verify wrong PIN returns invalid, change PIN with correct current PIN, change PIN with wrong current PIN returns 401, get/set avg_turnover_time, get/set waitlist_paused. Use `TestClient` with the real app. Generate a valid token via the PIN verify endpoint and reuse it for protected requests.

Acceptance criteria:
- [ ] `test_tables.py`: GET returns tables without auth
- [ ] `test_tables.py`: POST without token returns 401
- [ ] `test_tables.py`: POST with valid token creates a table
- [ ] `test_tables.py`: PATCH updates is_occupied and occupied_by_party_id
- [ ] `test_tables.py`: DELETE without token returns 401
- [ ] `test_tables.py`: DELETE with token removes the table
- [ ] `test_settings.py`: POST /api/settings/pin with "1234" returns valid=true and a token
- [ ] `test_settings.py`: POST /api/settings/pin with wrong PIN returns valid=false
- [ ] `test_settings.py`: PATCH /api/settings/pin with correct current PIN succeeds
- [ ] `test_settings.py`: PATCH /api/settings/pin with wrong current PIN returns 401
- [ ] `test_settings.py`: GET /api/settings/avg-turnover-time returns a number
- [ ] `test_settings.py`: PATCH /api/settings/avg-turnover-time with valid token updates
- [ ] `test_settings.py`: PATCH /api/settings/avg-turnover-time out of range returns 422
- [ ] `test_settings.py`: GET /api/settings/waitlist-paused returns a boolean
- [ ] `test_settings.py`: PATCH /api/settings/waitlist-paused with token toggles
- [ ] All tests pass with `uv run pytest`
- [ ] Store is reset between tests

Constraints:
- Split into two test files: `test_tables.py` and `test_settings.py`
- Reuse the token obtained from the PIN verify endpoint for protected requests
- Do not test WebSocket in these files

---

## 13. Write unit tests for reports and auth

Goal: Report calculations and auth token lifecycle are tested end-to-end through the HTTP layer.

Description:
Create `backend/tests/test_reports.py` and `backend/tests/test_auth.py`. Reports tests verify: daily stats are calculated correctly from seeded data (total_parties, average_wait_minutes, no_show_rate, seat_utilization), empty store returns all zeros, auth is required. Auth tests verify: token generation via PIN verify, token rejection after revocation, expired token handling (tokens older than 24h are rejected), direct store token manipulation is rejected.

Acceptance criteria:
- [ ] `test_reports.py`: GET /api/reports/daily returns correct total_parties from seeded data
- [ ] `test_reports.py`: no_show_rate is calculated correctly
- [ ] `test_reports.py`: seat_utilization is calculated correctly
- [ ] `test_reports.py`: unauthenticated request returns 401
- [ ] `test_auth.py`: valid PIN returns a token
- [ ] `test_auth.py`: revoked token is rejected (401)
- [ ] `test_auth.py`: token older than 24h is rejected
- [ ] All tests pass with `uv run pytest`
- [ ] Store is reset between tests

Constraints:
- Use `TestClient` with the real app
- For expiry testing, manipulate the stored token's created_at timestamp directly
- Do not test WebSocket in these files

---

## 14. Write integration test: full host journey through the API

Goal: A single end-to-end test exercises the complete host workflow through the real HTTP API: add party -> notify -> seat with table -> undo.

Description:
Create `backend/tests/test_integration.py`. The test uses `TestClient` against the real app with the seeded store. It performs: (1) GET waitlist to see seeded list, (2) POST to add a new party, (3) GET to confirm the party appears, (4) PATCH to notify the party, (5) POST tables to create a table, (6) PATCH table to occupy it, (7) PATCH party to seat it with the table ID, (8) GET reports to verify stats updated, (9) POST undo on the seat action, (10) GET to verify the party is no longer seated. Assert each step's response status and body.

Acceptance criteria:
- [ ] Test adds a party and asserts it appears in the waitlist
- [ ] Test notifies the party and asserts status changed to "notified"
- [ ] Test creates a table and seats the party on it
- [ ] Test asserts the party status is now "seated" and the table is occupied
- [ ] Test calls undo on the seat action and asserts the party is back to "notified"
- [ ] Test calls GET /api/reports/daily and asserts total_parties increased
- [ ] Test uses the manager PIN to obtain a token and reuses it for all protected calls
- [ ] All assertions pass
- [ ] `uv run pytest` passes

Constraints:
- Use the real app, not mocked services
- Reset the store before the test via a fixture
- Use `pytest` parametrize or sequential steps (not separate test functions)
- Do not test WebSocket in this file

---

## 15. Write WebSocket connection and broadcast tests

Goal: The WebSocket endpoint is tested: connections are accepted, messages are broadcast on store mutations, and clients disconnect cleanly.

Description:
Create `backend/tests/test_ws.py`. Use the `websockets` library's test client or `httpx` with WebSocket support to test the `/ws/waitlist` endpoint. Tests should cover: (1) connecting to the WebSocket succeeds, (2) after a waitlist mutation (via HTTP), a `waitlist_update` message is broadcast to all connected clients, (3) closing the WebSocket cleans up the client list. Use `asyncio` fixtures for async test setup.

Acceptance criteria:
- [ ] Test: client can connect to `ws://localhost:5173/ws/waitlist`
- [ ] Test: after connecting, a party creation via HTTP triggers a `waitlist_update` message received by the WS client
- [ ] Test: multiple connected clients all receive the broadcast
- [ ] Test: after client disconnects, it is removed from the client set
- [ ] `uv run pytest` passes
- [ ] Store is reset between tests

Constraints:
- Use `pytest-asyncio` for async test fixtures (install via uv)
- The WebSocket URL is configured in the app; tests should connect to the test server
- Use `anyio` or `websockets` test utilities for async WebSocket testing

---

## 16. Add start script and ensure frontend-backend integration works

Goal: A `start.ps1` script at the repository root launches both the backend (port 5173) and frontend (port 4827) together, and the frontend renders real data from the backend instead of mock services.

Description:
Create `start.ps1` at the repository root that starts the FastAPI backend in the background on port 5173, waits for it to be ready (poll `/health`), then starts the Vite frontend on port 4827. Both processes are tracked by PID so they can be stopped together. Update the frontend `.env` to remove `VITE_USE_MOCK=true` so it hits the real backend. Verify that `npm run dev` in the frontend connects to `http://localhost:5173` and that the waitlist displays seeded data.

Acceptance criteria:
- [ ] `start.ps1` exists at the repository root
- [ ] Running `start.ps1` starts both backend and frontend
- [ ] Backend is reachable at `http://localhost:5173/health` before frontend starts
- [ ] Frontend is reachable at `http://localhost:4827`
- [ ] Frontend displays seeded party data from the backend (not mock data)
- [ ] The HostView shows at least one party in the waitlist
- [ ] Adding a party via the frontend form creates it in the backend store
- [ ] `uv run pytest` in backend still passes
- [ ] `npm run test` in frontend still passes

Constraints:
- The start script should work on Windows (PowerShell)
- Kill any existing processes on ports 5173 and 4827 before starting
- Track child PIDs for clean shutdown
- Do not use default ports (3000, 8000) -- use the assigned 5173/4827
