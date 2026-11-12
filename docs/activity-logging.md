# Temporary activity logging (ECO-006)

The router owns one `createWorkspace()` instance for a page session. Personal data starts with five starter growth areas and empty goals/activities. Sample data starts with the same categories plus illustrative goals and activities. The collections are separate. Adding in either mode changes only that mode. Refreshing or using the query-string sample switch recreates both collections and clears temporary entries.

The five starter categories are usable classifications, not accomplishments or persisted user records. ECO-007A adds temporary goal creation on Goals. New goals become available in the optional goal field when you navigate to Activity and select their area.

## Data contract

- GrowthArea: `id`, `name`, `icon`, `color`, `createdAt`, `updatedAt`, `archivedAt`; optional `description` provides card copy.
- Goal: `id`, `areaId`, `title`, `description`, `status`, `targetDate`, `createdAt`, `updatedAt`.
- Approved goal statuses: `not_started`, `in_progress`, `completed`, `archived`. **Active Goals counts only `in_progress`.** The former `active` status is unsupported and covered by a regression test.
- Activity: `id`, `areaId`, nullable `goalId`, `title`, `note`, `occurredOn`, nullable `durationMinutes`, `createdAt`, `updatedAt`.

Dates used as calendar days have `YYYY-MM-DD` format and are parsed in local time. Activity creation uses ISO timestamps for `createdAt` and `updatedAt`; sample dates are illustrative. Session IDs use a monotonic counter, remain stable during navigation, and are unique within the workspace instance. There is no persistence or record editing/deletion.

## Data flow and ownership

1. The router passes a snapshot of the selected workspace to the Overview or Activity renderer.
2. On Activity, `mountActivity` appends a native dialog from the existing factory and wires its form events.
3. The workspace calls the pure `validateActivity` function at the creation boundary, so records cannot bypass validation.
4. Valid submissions append a record and replace only the history markup. The opener stays connected for focus restoration; a live status announces success. The form resets only after success.
5. Navigating back to Overview reads the same current collection. Existing summary functions calculate the counts.
6. Before changing views, the router removes the Activity controller's dialog and opener listener.

Snapshots keep renderers from mutating shared data. No subscriptions or framework are needed: only Activity creates records, and the router renders the current snapshot on navigation.

## Validation and draft behavior

| Field | Rule |
| --- | --- |
| Title | Required after trimming; at most 160 entered characters |
| Growth area | Must match an available, unarchived area |
| Activity date | Required, valid local calendar date; defaults to today |
| Goal | Optional; must belong to selected area |
| Duration | Optional; nonnegative whole number within JavaScript's safe integer range; blank becomes null, zero remains zero |
| Notes | Optional; at most 4,000 characters; whitespace and line breaks preserved |

Goals are filtered by selected area and exclude `archived` goals. The same rule is enforced when validating a new activity. Changing area resets an incompatible selected goal and preserves the other fields. Compatible goals remain selected. Invalid submission shows associated inline errors, focuses the first invalid field, and keeps the form open with entered values intact. Incomplete browser number input is checked using `validity.badInput` before any record is added. Closing and reopening keeps the draft until the Activity view is unmounted; the dialog explains that scope.

History and form option text use the existing escaping helper. Goal/area identifiers are validated against supplied records. Activity ordering reuses the Overview helper: date descending, ID ascending for ties, then original order if both match. Missing dates/areas show explicit fallbacks; optional goals and durations do not show invented values.

## Browser review still required

The browser access host was unavailable during implementation. Node controller tests verify event wiring against a small DOM boundary; they do not verify native dialog behavior or CSS layout.

- At 1440px, 768px, and 320px, inspect personal and sample Activity pages, empty history, long titles, long notes, and the dialog. Confirm no horizontal scrolling or obscured controls.
- Use Tab and Enter to open Log Activity. Confirm title focus, focus containment with Tab/Shift+Tab, Escape and Close dismissal, and focus returning to Log Activity.
- Reopen a closed dialog and confirm draft retention. Submit empty required fields and invalid durations; confirm readable errors and retained values. Check labels and error descriptions with a screen reader.
- In sample mode, select an area and goal; change area and confirm goal filtering/reset without losing other text.
- Submit with blank duration, then zero duration; confirm immediate history updates, zero displayed as `0 min`, and a success announcement. Check newest-first ordering.
- Navigate to Overview and back; confirm counts and history agree. Refresh and confirm temporary entries disappear. Sample entries must never appear in personal mode.
- Recheck all navigation routes, browser Back/Forward, the skip link, and the ECO-004 component showcase (`?ui`). Check the console for errors.
