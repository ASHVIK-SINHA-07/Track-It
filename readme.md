# Track-It

A local-first personal progress tracker for recording completed work, organizing it into growth areas, and connecting it to meaningful goals.

**Current stage: M0 — Foundation.** This version provides the application shell and placeholder views. Activity logging, goal management, and local persistence are planned for later milestones.

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
```

## Stack

- Semantic HTML5, CSS3, and vanilla JavaScript ES modules.
- Vite as the only direct development dependency, providing a development server and production bundling.
- System fonts and inline SVG icons; no external fonts or UI libraries.
- IndexedDB is the planned storage technology; it is not used in M0.

## Implemented in M0

- Dark theme with shared color, spacing, radius, and typography defaults.
- Desktop sidebar, compact mobile header, and mobile bottom navigation.
- Overview with placeholder summary cards, clearly labeled example growth areas, and a recent-activity empty state.
- Activity and Goals views explaining future functionality.
- Active navigation styling and `aria-current`, keyboard focus styling, and a skip-to-content link.
- Hash routes with a default/unknown-route fallback, document titles, and focus management after navigation.

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
  views/
    overview.js            Overview placeholders and example areas
    activity.js            Activity empty state
    goals.js               Goals empty state
  styles/
    tokens.css             Shared design tokens and base styles
    app.css                Layout, components, and responsive rules
```

Views return static HTML strings. The shell is mounted once; navigation replaces only the main content. Templates contain only developer-authored content. When editable records arrive, render user-entered values with safe DOM APIs or escaping rather than interpolating them as HTML.

Domain logic can later live in `src/services/`, IndexedDB adapters in `src/storage/`, and reusable helpers in `src/utils/`. Those folders are deliberately deferred until there is actual code for them.

### How navigation works

Links point to `#/overview`, `#/activity`, and `#/goals`. Changing the fragment triggers the browser's `hashchange` event. The router renders the corresponding view, updates the title and active link, and moves focus to the main content.

Fragment changes create normal browser history entries, allowing Back and Forward without full-page reloads. Refreshing keeps the fragment and loads the corresponding view after startup. Missing or unknown routes are replaced with `#/overview` without adding an extra history entry. Hash routing needs no server-side route rewrites because fragments are never sent to the server.

## Planned milestones

- **M0:** Project initialization, design foundations, application shell, and navigation (ECO-001–003).
- **M1–M4:** Await their implementation briefs and approval. Future product work includes growth-area and goal management, activity logging/history, IndexedDB persistence, progress summaries, and JSON backup/restore, as described in `PRD.md`. The current brief does not assign these features to specific milestones.

## Limitations

- Summary values are placeholders, not calculated data. Growth areas are labeled examples, not saved records.
- No forms, CRUD operations, persistence, analytics, authentication, backend, or synchronization.
- Local-first data storage is a product goal, not an implemented M0 capability. Offline caching and service workers are also not included.
- M0 is a foundation preview, not the complete version 0.1 MVP defined by the PRD.

## Verification

During implementation, dependency installation succeeded with zero reported vulnerabilities, and `npm run build` completed successfully. `npm run dev -- --host 127.0.0.1` started successfully and its page returned HTTP 200 outside the execution sandbox, which blocks listening on local ports. A Node smoke check using DOM stubs passed for default and invalid routes, all three views, active links, titles, focus, and the skip link. This does not verify real browser behavior.

Browser automation was unavailable (the browser access host was unavailable and the native browser connection failed), so visual and interactive browser acceptance checks remain **unverified**. There is no automated browser test suite in M0.

Before accepting M0, manually verify:

1. Open each view using navigation; confirm only the main content changes and the active navigation matches.
2. Navigate Overview → Activity → Goals; use Back and Forward to revisit views.
3. Refresh each supported route; confirm the correct view remains visible.
4. Load an empty fragment or `#/unknown`; confirm fallback to Overview.
5. At desktop, tablet, and mobile widths, inspect readability, layout, and the consistent dark theme. At **320px**, confirm there is no horizontal scrolling and bottom navigation does not obscure content.
6. Use Tab, Shift+Tab, and Enter to navigate all links. Confirm visible focus, the skip link, and focus moving to main content after view changes.
7. Check browser console errors and screen-reader announcements of page headings/navigation.
