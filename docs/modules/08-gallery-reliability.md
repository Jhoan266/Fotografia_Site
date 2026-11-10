# Module 08: client gallery reliability

Stack base: admin/module-06-07-dashboard-design-system (PR #6). Merge only after Module 06/07.

## Changes
- Failed favorite/selection requests restore only the affected field of the affected photo, preserving unrelated changes.
- Per-photo/field locks prevent overlapping toggle requests; network and HTTP failures display translated feedback.
- Comments have a real request pending state and duplicate-submit protection; drafts survive failed saves. A late response cannot clear a newly opened photo draft.
- Arrow navigation ignores form controls and editable text. Escape closes the viewer; Tab/Shift+Tab remain inside it.
- Closing restores focus to the original gallery trigger. Saving a photo does not reset focus or body scroll locking.
- Mobile viewer rows reserve space for image and comment controls.
- ES/EN/FR error messages.

## Validation
Local typecheck and lint pass with zero errors/warnings. Production Docker build and integration checks cover login/access controls, client favorite/selection persistence, comment validation, original bytes, ZIP selection/favorite/all fallbacks, and draft/origin restrictions. The script uses temporary fixtures and cleans up; demonstration accounts are preserved.

Interactive keyboard, request-failure and mobile visual checks still need browser review because the computer-control runtime cannot start in this Windows environment. Manual scenarios:
1. Navigate favorites/album filters and open a photo. Tab/Shift+Tab stay within the dialog; Escape returns to the original thumbnail.
2. Type a comment using left/right arrows; the photo does not change.
3. Simulate a failed favorite/selection request: only that photo field rolls back and an error appears; changes on other photos remain.
4. Double-click a toggle or send comment: one in-flight request is accepted per control.
5. Send a comment, switch photos before it completes, and type a new draft; the response does not clear the new draft.
6. At mobile width the image and scrolling details share the available viewport.

GitHub CI remains blocked by the account billing lock; no paid services were configured.
