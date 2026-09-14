## Goal

Every page (HostView, GuestStatus, ManagerSettings, Reports) displays consistent loading, empty, error, and success states, with a shared error boundary and retry mechanism, and all states are covered by tests.

## Acceptance criteria

- [ ] A shared `ErrorBoundary` component exists at `frontend/src/components/ErrorBoundary.tsx` and catches render errors for child components
- [ ] `frontend/src/components/SkeletonLoader.tsx` exists and exports a reusable skeleton placeholder component using Tailwind shimmer/blink classes
- [ ] HostView wraps its content in `ErrorBoundary` and shows the skeleton while `getWaitlist` or `getWaitlistPaused` queries are loading
- [ ] HostView shows an error panel with a retry button when the waitlist query fails; clicking retry re-runs the query
- [ ] HostView empty state displays "No parties waiting" with an illustration or icon when the list is empty (not paused)
- [ ] GuestStatus wraps its content in `ErrorBoundary` and shows the skeleton while `getPartyByToken` is loading
- [ ] GuestStatus shows an error panel with a retry button when the token query fails (distinct from the "Party not found" not-found state)
- [ ] ManagerSettings wraps its content in `ErrorBoundary` and shows the skeleton while `getTables` or `getAvgTurnoverTime` queries are loading
- [ ] ManagerSettings shows an error panel with a retry button when either query fails
- [ ] Reports wraps its content in `ErrorBoundary` and shows the skeleton while `getDailyReport` is loading
- [ ] Reports shows an error panel with a retry button when the report query fails
- [ ] Reports empty state is not applicable (report always returns data), but loading and error states must work
- [ ] Adding a party via AddPartyForm shows a success toast via the existing `UndoBar` pattern after successful submission
- [ ] Network errors display a user-friendly message (e.g. "Unable to connect — please check your connection and try again") rather than a raw error code
- [ ] `frontend/src/pages/HostView.test.tsx` contains tests for: loading skeleton visibility, error state with retry button, and empty state
- [ ] `frontend/src/pages/GuestStatus.test.tsx` contains tests for: loading skeleton visibility, error state with retry button, and invalid-token not-found state
- [ ] `frontend/src/pages/ManagerSettings.test.tsx` contains tests for: loading skeleton visibility, error state with retry button
- [ ] `frontend/src/pages/Reports.test.tsx` contains tests for: loading skeleton visibility, error state with retry button
- [ ] `npm run typecheck` passes with zero errors
- [ ] `npm run test` passes with all existing and new tests green

## Out of scope

- Real WebSocket reconnection error handling — moved to #16
- Toast styling changes or new toast libraries — reuse existing `UndoBar` pattern
- Error boundary for the entire app (only per-page boundaries)
- Backend API changes or new service functions
- Accessibility audit beyond the existing patterns
- Tablet-specific layout changes — moved to #18

## Constraints

- Files this should stay inside:
  - New: `frontend/src/components/ErrorBoundary.tsx`, `frontend/src/components/SkeletonLoader.tsx`
  - Edit: `frontend/src/pages/HostView.tsx`, `frontend/src/pages/GuestStatus.tsx`, `frontend/src/pages/ManagerSettings.tsx`, `frontend/src/pages/Reports.tsx`
  - Test edits: `frontend/src/pages/HostView.test.tsx`, `frontend/src/pages/GuestStatus.test.tsx`, `frontend/src/pages/ManagerSettings.test.tsx`, `frontend/src/pages/Reports.test.tsx`
- No new npm packages — use only React, TanStack Query, Tailwind CSS, and existing utilities
- Do not change any existing behavior, props, or component interfaces already in place
- Reuse the `addToast` / `UndoBar` pattern from `frontend/src/store/appStore.ts` and `frontend/src/components/UndoBar.tsx` for success toasts
- Error boundary must use class-component `componentDidCatch` (React 18 compatible) or the `onError` React 18+ API; do not use third-party error boundary libraries
- Loading skeletons must use Tailwind CSS classes consistent with the existing design (gray placeholders with subtle animation)
- Retry button must call `queryClient.invalidateQueries` for the relevant query key to re-fetch data
- User-friendly error messages must not expose raw HTTP status codes or stack traces to the user
- Tests must follow existing patterns: `vi.mock`, `renderWithQuery` helper, Vitest, `@testing-library/react`
