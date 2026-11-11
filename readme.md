# Track-It

A local-first personal progress tracker for recording completed work, organizing it into growth areas, and connecting it to meaningful goals.

**Current stage: M1 — Interface and Component System, ECO-006.** The app includes a data-driven Overview, reusable UI components, and temporary activity logging. Entries exist only in memory and disappear on refresh. Goal management and local persistence remain future work.

## Getting started

Use Node.js 22.12+ (or Node.js 20.19+ within the 20.x line) and npm. The foundation was built with Node.js 25.9.0 and npm 11.12.1.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. The default port is 5173; Vite selects another port if it is occupied. Stop the server with Ctrl+C.

```sh
npm run build    # Generate production files in dist/
npm run preview  # Serve the production build locally
npm test         # Run data, validation, controller, component, and routing checks
```

## Stack

- Semantic HTML5, CSS3, and vanilla JavaScript ES modules.
- Vite as the only direct development dependency, providing a development server and production bundling.
- System fonts and inline SVG icons; no external fonts or UI libraries.
- IndexedDB is the planned storage technology; it is not yet implemented.

## Implemented in M0

- Dark theme with shared color, spacing, radius, and typography defaults.
- Desktop sidebar, compact mobile header, and mobile bottom navigation.
- Overview with placeholder summary cards, clearly labeled example growth areas, and a recent-activity empty state.
- Activity and Goals views explaining future functionality.
- Active navigation styling and `aria-current`, keyboard focus styling, and a skip-to-content link.
- Hash routes with a default/unknown-route fallback, document titles, and focus management after navigation.

## Added in ECO-004

- Primary, secondary, and destructive buttons with disabled, hover, active, and focus states.
- Labeled text, textarea, select, date, and number fields, with hints and accessible errors.
- Shared card styling and a card renderer with an optional heading.
- Reusable empty states now used by Activity and Goals.
- A native modal dialog factory with an accessible name, Close button, and focus restoration. The browser provides Escape dismissal and modal focus containment.
- A development-only component showcase, excluded from production builds.

Run `npm run dev`, then open the printed local origin with `/?ui#/overview` (for example, `http://localhost:5173/?ui#/overview`). Scroll below the page content to the **Development only · ECO-004 component showcase** panel. It contains only UI examples; its form checks example values without saving anything. Remove `?ui` and reload to hide it. No fourth navigation route was added.

See [component APIs and examples](docs/ui-components.md) for usage and safe HTML composition rules.

## Architecture

```text
index.html                 HTML entry point
public/favicon.svg         App icon
src/
  main.js                  Mount shell, load CSS, start routing
  router.js                Route resolution and view switching
  components/
    shell.js               Persistent layout and navigation
    icons.js               Shared decorative SVG icons
    ui.js                  Escaped HTML renderers and field error presentation
    dialog.js              Native dialog DOM factory and lifecycle
    quick-log.js           Activity form events, dialog lifecycle, and history updates
  data/
    overview.js            Pure summary, local calendar, and sorting helpers
    mock.js                Explicit sample dataset factory; no storage
    areas.js               Starter growth-area definitions
    activity.js            Pure input validation and local date helpers
    workspace.js           Isolated personal/sample memory collections
  dev/
    showcase.js            Development-only component examples and handlers
    showcase.css           Development-only showcase layout
  views/
    overview.js            Data-driven dashboard and empty states
    activity.js            Activity page, history, and quick-log form markup
    goals.js               Goals empty state
  styles/
    tokens.css             Shared design tokens and base styles
    components.css         Reusable card, button, field, and dialog styles
    app.css                Layout, components, and responsive rules
tests/
  activity.test.js         Validation, creation, isolation, dates, and rendering
  quick-log.test.js        Submission and dialog controller boundary checks
  overview.test.js         Summary, sorting, empty data, and safe rendering
  ui.test.js               Escaping and component markup contracts
  router.test.js           Existing view and navigation metadata regression check
```

Views return HTML strings. The shell is mounted once; navigation rebuilds the main content and updates the header label, title, and active links. UI renderers escape text and attribute values. `renderCard` accepts trusted developer-composed `contentHtml`; raw user input must never be passed into that slot. Dialog headings and descriptions use `textContent`, and dialog bodies accept DOM content. No reactive framework or runtime dependency was added.

Domain logic can later live in `src/services/`, IndexedDB adapters in `src/storage/`, and reusable helpers in `src/utils/`. Those folders are deliberately deferred until there is actual code for them.

### How navigation works

Links point to `#/overview`, `#/activity`, and `#/goals`. Changing the fragment triggers the browser's `hashchange` event. The router renders the corresponding view, updates the title and active link, and moves focus to the main content.

Fragment changes create normal browser history entries, allowing Back and Forward without full-page reloads. Refreshing keeps the fragment and loads the corresponding view after startup. Missing or unknown routes are replaced with `#/overview` without adding an extra history entry. Hash routing needs no server-side route rewrites because fragments are never sent to the server.

## Planned milestones

- **M0:** Project initialization, design foundations, application shell, and navigation (ECO-001–003).
- **M1 / ECO-004:** Reusable UI foundations implemented; browser acceptance checks pending.
- **M1 / ECO-005:** Data-driven Overview implemented with an empty personal workspace and explicit sample preview; browser acceptance checks pending.
- **M1 / ECO-006:** Temporary activity logging and shared Overview data implemented; native browser checks pending.
- **Future work:** Growth-area and goal management, editing/deleting records, IndexedDB persistence, advanced summaries, and JSON backup/restore, as described in `PRD.md`.

## Limitations

- The personal workspace starts with five starter growth areas and no activities or goals. `?sample#/overview` displays isolated illustrative records; nothing is saved.
- The Activity form creates temporary in-memory records only. There is no persistent CRUD, editing/deleting, analytics, authentication, backend, or synchronization. The development showcase still contains demonstration fields only.
- Local-first data storage is a product goal, not an implemented M0 capability. Offline caching and service workers are also not included.
- This remains a foundation preview, not the complete version 0.1 MVP defined by the PRD.

## Verification

During implementation, dependency installation succeeded with zero reported vulnerabilities, and `npm run build` completed successfully. `npm run dev -- --host 127.0.0.1` started successfully and its page returned HTTP 200 outside the execution sandbox, which blocks listening on local ports. A Node smoke check using DOM stubs passed for default and invalid routes, all three views, active links, titles, focus, and the skip link. This does not verify real browser behavior.

ECO-004 adds `npm test` with checks for HTML escaping, button semantics, field labels and errors, optional card headings and actions, and existing route rendering. The router test uses DOM stubs: it does not exercise a browser. The production build succeeds, and its output was checked to exclude showcase code and styles.

The development server also started successfully for ECO-004. Vite served the transformed showcase module with HTTP 200, and its JavaScript syntax check passed. This verifies development compilation, not browser rendering or interaction.

Browser automation remains unavailable (the browser access host reports unavailable), so visual and interactive browser acceptance checks remain **unverified**. There is no automated browser test suite.

Before accepting M0, manually verify:

1. Open each view using navigation; confirm only the main content changes and the active navigation matches.
2. Navigate Overview → Activity → Goals; use Back and Forward to revisit views.
3. Refresh each supported route; confirm the correct view remains visible.
4. Load an empty fragment or `#/unknown`; confirm fallback to Overview.
5. At desktop, tablet, and mobile widths, inspect readability, layout, and the consistent dark theme. At **320px**, confirm there is no horizontal scrolling and bottom navigation does not obscure content.
6. Use Tab, Shift+Tab, and Enter to navigate all links. Confirm visible focus, the skip link, and focus moving to main content after view changes.
7. Check browser console errors and screen-reader announcements of page headings/navigation.

For ECO-004, also open `/?ui#/overview` in development mode and verify:

1. Every component renders correctly at desktop and 320px widths, without horizontal overflow.
2. Buttons respond to pointer and keyboard activation; disabled controls cannot activate; focus outlines remain visible.
3. Every field has a usable label; submitting the empty example shows an error, and entering text clears it. Check number constraints as well.
4. Open the example dialog: its input receives focus, Tab and Shift+Tab stay inside, Escape and Close both dismiss it, and focus returns to the opener.
5. Check the console for errors while rendering, navigating, validating, and opening/closing the dialog.
6. Build and preview the production app; `?ui` must not display a showcase.

## ECO-005 dashboard data flow and verification

ECO-005 initially provided an empty personal workspace; ECO-006 now supplies five starter areas while leaving activities and goals empty. Choose **Explore sample data** (or visit `/?sample#/overview`) to view five illustrative growth areas, three goals, and four completed activities. **Exit sample view** reloads the personal workspace. Switching sample mode via these links reloads the page and clears temporary entries. The `sample` query parameter survives hash navigation; Overview and Activity share the selected mode’s records. `?ui&sample#/overview` also keeps the existing development component showcase available.

The router owns an in-memory workspace, seeded with starter areas for personal mode and `createMockOverview()` for sample mode, then supplies `{ areas, goals, activities }` to `renderOverview`. The renderer imports calculation helpers, not the mock module. A future data adapter can supply the same arrays without rewriting the view. No records are written to storage. Optional area descriptions are presentation metadata added alongside the agreed fields.

`countWeeklyActivities` compares valid `occurredOn` calendar dates against local Monday midnight (inclusive) and the next Monday (exclusive). Calendar arithmetic handles month/year and daylight-saving transitions; dates are never parsed as UTC. The default clock is the current local date, while tests inject a fixed date. The count covers the full Monday–Sunday week. Active goals have `status === 'in_progress'`; current growth areas have no `archivedAt` value. All empty arrays yield zero. Area cards count all associated activity records. Recent activities are copied and sorted by date descending, then ID ascending, preserving input order if both tie; invalid dates sort last and display “Date unavailable.” At most five records render. Goal text appears only for a resolved link; absent durations require no placeholder. Text is escaped, and colors/icons are selected from allowlists.

Verification: all 14 Node tests (including ECO-004 and router regression tests) and the production build pass. Overview tests also pass under UTC, Asia/Kolkata, and America/New_York, including DST boundary cases. The browser access host is unavailable in this session, so responsive visual checks, keyboard interaction, and real browser navigation remain unverified. The area grid uses three desktop columns, two tablet columns, and one narrow-mobile column; existing shell and bottom navigation rules remain in place.

For browser review, check both empty and sample views at 1440px, 1024px, 768px, 420px, and 320px. Check that long area names/activity titles wrap without overflow, the sample notice remains visible, summaries are readable, recent activity dates and goal labels remain readable, and bottom navigation clears the final content. Recheck ECO-004 with `?ui&sample` using the checklist above.

## ECO-006 temporary activity logging

Open `#/activity` and choose **Log Activity**. The native dialog collects a title, growth area, local calendar date, optional linked goal, optional duration, and notes. A valid submission updates history immediately. Navigate to Overview to see updated weekly and area counts. Entries disappear on refresh; sample-mode entries never enter the personal collection. Closing and reopening the dialog retains its draft while Activity stays mounted; navigating away discards that draft.

See [activity architecture, data contract, validation, and browser checklist](docs/activity-logging.md).

Verification: all 28 tests pass, including the ECO-004/ECO-005 regressions, approved goal statuses, activity validation, safe rendering, state isolation, controller submission, draft retention, and cross-route updates. The suite also passes in UTC, Asia/Kolkata, and America/New_York. Production build and whitespace checks pass. Controller tests use a small DOM boundary and do not establish native browser behavior. The browser access host remains unavailable, so the checklist in the linked document still requires browser review.
