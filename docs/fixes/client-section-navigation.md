# Client sidebar section navigation

Stack base: ui/module-11-panel-readability (PR #10).

## Reproduced
On the client dashboard, clicking My sessions once moved to the section. After manually returning to the top, clicking the same sidebar link again left the page at the top because the fragment URL was unchanged. The sidebar still marked My dashboard active. A return from the gallery also failed to honor the section position on mobile.

## Fix
- Handle ordinary same-page clicks explicitly: scroll to the destination even when the fragment has not changed, without duplicating history entries.
- Track hash/history state for the active link and aria-current.
- Use native links across pages so fragment targets are honored when returning from a gallery; modified/new-tab clicks retain normal link behavior.
- Focus the destination without an extra jump, add scroll margin and respect reduced-motion preferences.
- My dashboard clears the fragment and returns to the page top.

## Validation
Typecheck/lint and production Docker build passed. Headless Chrome verified 1440px with normal motion and 390px with reduced motion: repeated clicks to sessions and guide after returning to the top, active/focus state, home, back/forward, gallery-to-sessions navigation and direct fragment URLs. No browser page errors. Accounts and gallery data unchanged.

Manual regression: click My sessions, scroll back up, click My sessions again; repeat for the guide, then open a gallery and use the sidebar to return to sessions.
