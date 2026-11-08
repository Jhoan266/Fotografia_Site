# Module 11: panel readability and spacing

Stack base: client/module-10-client-portal (PR #9). Merge after the previous modules in order.

## Changes
- Shared spacing rhythm across the photographer and client workspaces: larger gutters, card padding, section gaps and secondary text.
- More generous line height, clearer labels, comfortable filter/button targets and consistent metric spacing.
- Project rows allow two title lines and have more room around thumbnails, dates and status badges. Long client names/emails wrap safely in lists.
- At medium widths metrics switch to two columns and secondary panels stack before their content becomes cramped.
- Client/session detail numbers use a three-column grid with wrapping labels, and guide, album, progress and gallery controls have clearer spacing.
- Client creation uses a single column until there is enough room for the two-column layout; form fields use consistent vertical gaps.
- Short desktop sidebars scroll rather than clipping navigation/profile content.

The accepted dark palette, brand, content, permissions and behavior are preserved. No database migration or application dependency added.

## Validation
- Local typecheck/lint and production Docker build pass.
- Headless Chrome checks both roles at 360, 390, 768, 1024, 1280 and 1440 pixels: no horizontal page overflow, no metric label/icon collisions, and long-title stress checks remain within the layout.
- Desktop/mobile screenshots reviewed. English/French layouts checked at mobile and medium widths.
- Existing browser flows are rechecked for login, navigation and client/project forms, gallery selection and downloads. Test fixtures are removed; demo accounts and gallery preserved.

GitHub CI remains subject to the existing account billing lock. Local checks do not clear that remote state.
