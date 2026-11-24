# Activity logging and history

Use **Log Activity** to record completed work. Choose a growth area and local calendar date, then optionally connect a goal and enter a duration or notes. **Edit** opens the same form with the saved values. **Delete** asks for confirmation before removing an entry.

The workspace validates input and commits personal changes to IndexedDB before updating history. A failed write leaves the saved record and draft available. Editing keeps the ID and creation timestamp and updates `updatedAt`. Sample changes only affect the current sample session.

## Validation

| Field | Rule |
| --- | --- |
| Title | Required after trimming, up to 160 entered characters |
| Growth area | An active area for a new or changed association |
| Activity date | Required, valid local `YYYY-MM-DD` date |
| Connected goal | Optional, belongs to the chosen area, and has `not_started` or `in_progress` status for new links |
| Duration | Optional, nonnegative safe whole number of minutes. Blank becomes `null`, and zero remains zero |
| Notes | Optional, up to 4,000 characters |

An existing activity can keep its historical area or goal association after archiving or completion. Changing the selected area clears an incompatible goal. Invalid submissions keep the entered values and focus the first field with an error.

## History and summaries

Activity history sorts by local calendar date, newest first. Search is case-insensitive and matches titles or notes. Growth area, connected goal, and inclusive date filters combine with search. Use **Reset filters** to return to the full list.

Overview reads the same workspace and counts activities within the local Monday–Sunday week. Goal details show the activities that still reference the goal ID, along with their count and recorded duration. Editing or deleting an activity updates those summaries when the relevant view opens.
