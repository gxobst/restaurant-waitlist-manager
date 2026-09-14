## Goal

The app renders correctly on tablet viewports (768px portrait and 1024px landscape): touch targets meet the 48px minimum, the header stays sticky, modals are fully visible and centered, and no page scrolls horizontally — without changing the existing mobile/desktop layout.

## Acceptance criteria

- [ ] `frontend/index.html` contains a viewport meta tag (`name="viewport"`, `content="width=device-width, initial-scale=1.0"`)
- [ ] All `<button>` and interactive elements in `PartyActions.tsx` have at least `py-3` (48px height) so touch targets meet the 48px minimum
- [ ] All input fields in `AddPartyForm.tsx` have at least `py-3` (48px height)
- [ ] All input fields and submit buttons in `ManagerSettings.tsx` (AddTableForm, ChangePinForm, TurnoverTimeConfig) have at least `py-3` (48px height)
- [ ] Buttons in `GuestStatus.tsx` (Confirm / Cancel) have at least `py-3` (48px height)
- [ ] The header in `App.tsx` uses `sticky top-0` (or `fixed top-0`) so it remains visible while scrolling
- [ ] The main content wrapper in `App.tsx` accounts for the sticky header so content is not hidden behind it (e.g., `pt-16` or equivalent)
- [ ] On screens ≥1024px (`md:` or `lg:` breakpoint), the main content area expands beyond `max-w-lg` so the layout uses available tablet width (e.g., `max-w-3xl` or responsive `max-w-lg lg:max-w-3xl`)
- [ ] On screens ≥768px, party rows in `HostView.tsx` remain readable without horizontal overflow (no text truncation that hides critical info; consider `flex-wrap` or column re-layout if needed)
- [ ] `TableSelectionModal.tsx` modal container uses `max-w-lg` (or similar) that fits within a 768px viewport without requiring horizontal scroll, and remains `items-center justify-center` centered
- [ ] `ManagerPinModal.tsx` modal is centered and fully visible at 768px width (does not overflow or get clipped)
- [ ] No page (`HostView`, `GuestStatus`, `ManagerSettings`, `Reports`) produces a horizontal scrollbar when rendered at 768px or 1024px viewport width
- [ ] A new Vitest test file `frontend/src/pages/ResponsiveTablet.test.tsx` (or equivalent) renders each page and verifies:
  - [ ] At a simulated 1024px viewport width, the header element is present and the main content does not overflow horizontally
  - [ ] At a simulated 768px viewport width, the modal backdrop and container are visible and centered (renders `role="dialog"`)
  - [ ] At both widths, all `button` elements have a computed height of at least 48px (verified via `getBoundingClientRect().height >= 48` or CSS class assertion `min-h-12` / `py-3`)
- [ ] `npm run typecheck` passes with zero errors
- [ ] `npm run test` passes with all existing tests still green and the new tablet tests green
- [ ] `npm run build` succeeds with no regressions

## Out of scope

- Mobile-specific layout changes (the app is already mobile-first; this task only adds tablet support)
- Desktop-specific layout changes beyond removing the narrow `max-w-lg` constraint at tablet breakpoints
- Adding a new navigation component or sidebar ( Task #future )
- Changing the color palette, typography scale, or visual design system
- Adding panning/zooming gesture support
- Backend or API changes

## Constraints

- Files that may be edited: `frontend/index.html`, `frontend/src/App.tsx`, `frontend/src/pages/HostView.tsx`, `frontend/src/pages/GuestStatus.tsx`, `frontend/src/pages/ManagerSettings.tsx`, `frontend/src/pages/Reports.tsx`, `frontend/src/components/PartyActions.tsx`, `frontend/src/components/AddPartyForm.tsx`, `frontend/src/components/TableSelectionModal.tsx`, `frontend/src/components/ManagerPinModal.tsx`, and a new test file `frontend/src/pages/ResponsiveTablet.test.tsx` (or placed alongside the relevant page/component tests)
- Styling must use Tailwind CSS responsive utilities (`md:`, `lg:`, `min-h-*`, `sticky`, etc.) — no custom CSS files or inline style objects for layout changes
- Touch target size: enforce via Tailwind `min-h-12` (48px) or `py-3` on all interactive elements; do not use JavaScript to measure or enforce sizes
- The `max-w-lg` constraint on the main content in `App.tsx` must be made responsive (e.g., `max-w-lg lg:max-w-3xl`) so mobile layout is unchanged but tablet gets more width — never remove the mobile constraint entirely
- The sticky header must not break existing page layout; use `sticky top-0 z-50` with appropriate `pt-*` on the main wrapper
- Modals must keep their existing `fixed inset-0` overlay and centering; only ensure they do not overflow at 768px
- Do not modify `src/services/`, `src/store/`, `src/hooks/`, or any non-UI files
- Tests must use the existing patterns: Vitest, `@testing-library/react`, `vi.mock`, and `renderWithQuery` helper where applicable
- Viewport simulation in tests must use `Object.defineProperty(window.Element.prototype, 'clientWidth', ...)` or set `document.documentElement.style.width` / resize the jsdom container to 768px and 1024px — do not use a real browser
- The existing `npm run test`, `npm run typecheck`, and `npm run build` commands must all pass after the change
