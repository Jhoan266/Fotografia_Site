# Module 10: premium private client portal

Stack base: admin/module-09-studio-dashboard (PR #8). Merge after the preceding modules in order.

## Experience
- Shared private client header/account menu, responsive navigation, light locale switcher and keyboard skip link.
- Warm paper/olive client dashboard with a photographic featured session, real photo/favorite/selection totals, session cover cards and selected-photo progress. A single session fills its section rather than leaving an empty grid column.
- A clear four-step gallery guide and a complete empty-delivery state.
- Dark editorial gallery hero, protected cover image, responsive photo cards, selection summary and download toolbar. Existing viewer, mutation recovery and keyboard behavior preserved.
- Print/album pack cards retain the existing unpaid order action and now display pending/success/error feedback and explicitly state that no payment occurs. Duplicate in-flight submissions are blocked.
- Portal queries verify the CLIENT identity and select only owned DELIVERED sessions and current-user interactions. No schema migration or new application dependency.
- Shared outline icon component with backward-compatible admin export; existing dark locale selector remains the default.
- ES/EN/FR copy and locale-aware dates/currency.

## Validation
Local typecheck/lint and production Docker build passed. Integration smoke verifies delivered-only client sessions in all three locales, auth/roles, photo management and client interactions/downloads.

Headless Chrome checks at 1440px and 390px passed: actual client login, private dashboard, featured-gallery navigation, favorite/selection persistence with original state restored, simulated failed-request rollback, editable arrow keys, modal focus containment, ZIP download and French locale. Desktop and mobile screenshots were inspected; no horizontal page overflow.

A separate temporary client fixture verifies the empty portal and an album request: pending/result feedback, disabled success button, exactly one unpaid request and explicit no-charge copy. Temporary user/project/order/pack fixtures were removed. Demonstration accounts and their gallery remain intact.

GitHub CI remains subject to the existing account billing lock; local checks do not clear that remote state.
