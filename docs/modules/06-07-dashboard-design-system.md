# Module 06/07: admin dashboard and design system

Stack base: `client/module-05-gallery-experience`. Merge only after Module 05.

## Delivered
- Authorized dashboard queries in `modules/dashboard`; a transaction fetches counts, status totals and the six most recently updated projects.
- Dashboard with quick actions, localized metrics, delivery summary and recent sessions.
- Shared ActionLink, Button, Card, PageHeading, EmptyState, StatCard, StatusBadge and FormField primitives.
- Shared surface, radius and focus tokens; keyboard focus and reduced-motion support.
- Project list uses translated status badges and an actionable empty state.
- Client form adopts shared fields and submit button; client list handles its empty state.
- ES/EN/FR copy and locale-aware number/date formatting.
- CI accepts stacked PR targets and installs development dependencies required by lint/typecheck.

## Review
Run `npm ci`, `npm run lint`, `npm run typecheck`, and `npm run build`.
Verify as ADMIN in ES/EN/FR at 375px and desktop widths:
1. Zero clients/projects shows empty states; new-client action targets the form.
2. Draft/delivered/archived labels and counts match persisted records.
3. Recent list contains at most six projects ordered by last update.
4. Long project and client names wrap; keyboard focus is visible.
5. CLIENT and signed-out visitors cannot access the dashboard.
6. Existing client creation, project creation, upload, reorder and delivery still work.

## Follow-up validation
Local validation completed after using an execution context that can start Windows processes:
- npm ci: passed; Prisma client generated.
- npm run typecheck: passed.
- npm run lint: zero errors; one existing exhaustive-deps warning in GalleryClient.
- npm run build: passed, including generation of 26 pages.
- Production HTTP smoke check: dashboard, clients and new-project routes redirect unauthenticated visitors to the correct login in ES/EN/FR (nine routes).
- git diff --check: passed.

Follow-up fixes include typed status counts, photo reorder IDs and an S3 request body with an owned Uint8Array. Shared ActionForm uses useActionState to display translated action results and disable controls during submission. Authorization remains in each server action.

GitHub Actions run 42438693482 failed before executing any job steps, with no runner assigned and no logs available. Authenticated database flows and visual verification remain pending; keep draft until reviewed.
