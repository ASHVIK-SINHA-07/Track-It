# Track-It — Product Requirements Document

**Version:** 0.1  
**Product type:** Local-first personal progress tracker  
**Platform:** Responsive web application  
**Initial audience:** One user (the creator)  
**Development stack:** HTML, CSS, JavaScript, Vite, IndexedDB  
**Status:** Proposed MVP specification

## 1. Problem Statement

Personal development, academics, software projects, creative work, and content creation often involve different activities, tools, and schedules.

Traditional task managers help organize upcoming work, but do not always make it easy to record what was accomplished and connect those accomplishments to longer-term goals.

Track-It aims to provide a unified, low-friction space for recording activities, connecting them to goals, and reviewing progress.

## 2. Product Objective

Enable the user to:

1. Define a small number of meaningful goals.
2. Organize activities into personal growth areas.
3. Connect activities to relevant goals.
4. Record completed work quickly.
5. Review recent activity and progress over time.
6. Maintain ownership of their data.

**Primary success criterion:** The tracker remains useful enough to be used consistently without requiring extensive maintenance.

## 3. Target User

Initially, a university student balancing:

- Academic studies and DSA
- Software and portfolio projects
- Creative development
- Content creation
- Personal growth

Future audiences may include students, independent developers, creators, and multidisciplinary learners. These are hypotheses, not validated customer segments.

## 4. MVP Features

### P0 — Essential

**F01. Dashboard**
- Display active goals and their connected activity counts.
- Show recent activity entries.
- Provide a prominent quick-log action.
- Display a simple current-week summary.

**F02. Growth Areas**
- Provide initial areas: DSA & Academics, Portfolio Projects, Creative Skills, Content Creation, and Personal Development.
- Allow the user to add, rename, and archive areas.
- Group activity records by area.

**F03. Goals**
- Create, edit, and archive goals.
- Give each goal a title, description, target date (optional), and status.
- Associate each goal with a primary growth area.

**F04. Activity Logging**
- Record an activity title, date, growth area, and optional description.
- Optionally connect the activity to one goal.
- Optionally record duration in minutes.
- Edit and delete existing entries.

**F05. Activity History**
- Show previous entries in reverse chronological order.
- Filter entries by growth area and goal.
- Display the associated goal, when provided.

**F06. Local Persistence**
- Save records in IndexedDB.
- Recover records after browser reload.
- Provide JSON export and import for manual backups.
- Validate imported data before replacing records.

### P1 — Desirable, after core functionality is stable

- Weekly reflection notes.
- Simple weekly and monthly charts.
- Search and date-range filtering.
- Optional keyboard shortcuts.
- More customizable layout and appearance.

### P2 — Explicitly outside the MVP

- User accounts and authentication.
- Multi-device synchronization.
- AI-generated insights.
- Calendar integrations.
- Notifications and streak-based gamification.
- Team collaboration.
- Subscription payments.
- Public profiles and social sharing.

## 5. User Experience Requirements

- Users should be able to log a basic activity in approximately 10–20 seconds.
- Required form fields should be minimal.
- The application must work at mobile and desktop widths.
- The interface must communicate empty states clearly.
- Editing and deleting records must be straightforward.
- The product should avoid guilt-inducing language for inactive periods.
- Keyboard and screen-reader accessibility should be considered from the beginning.

## 6. Data Requirements

The main entities are:

- GrowthArea
- Goal
- Activity
- AppSettings

Each activity belongs to one growth area and may optionally reference one goal.

Goals also belong to a primary growth area.

The MVP does not require separate project, task, habit, or milestone entities.

## 7. Nonfunctional Requirements

- Local-first operation after initial application load.
- Fast and responsive interactions for a personal-scale dataset.
- Modular JavaScript architecture.
- Data validation before storage.
- Usable on modern desktop and mobile browsers.
- Backup export and restore support.
- No third-party analytics or unnecessary collection of personal data.
- Automated tests for core data and progress calculations.

## 8. Success Metrics

For a two-week personal trial:

- At least 10 distinct days of use.
- Median time to record a basic activity under 20 seconds.
- Previous entries remain accessible after restarting the browser.
- All core create, edit, archive, and delete operations work.
- Exported records can be restored successfully.
- The weekly summary helps the user recall what they accomplished.

The usage targets are trial goals, not evidence of product-market fit.

## 9. Major Risks

**Overengineering:** Adding advanced features before validating the primary workflow.

**Excessive manual input:** Making logging so detailed that usage declines.

**Misleading progress measurements:** Confusing recorded effort with genuine goal completion.

**Local data loss:** Browser storage may be cleared, so backups are necessary.

**Scope expansion:** Product ideas should be evaluated separately from MVP commitments.

## 10. Release Definition

Version 0.1 is complete when the user can create goals, record activities, associate activities with goals, review recent progress, and reliably retrieve and back up their data.

The product is ready for further iteration only after completing a short period of real personal usage.