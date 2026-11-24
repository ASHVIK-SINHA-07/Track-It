# Track-It

Track-It is a local-first personal progress tracker. Record completed work, group it into growth areas, and connect it to goals. The personal workspace is saved in IndexedDB on the browser and stays available after a refresh or restart.

## Getting started

Use Node.js 22.12 or newer and npm.

```sh
npm install
npm run dev
npm test
npm run build
npm run preview
```

Open the local URL printed by Vite. The production build goes to `dist/`. Serve that directory over HTTP(S) from a static host. The build uses relative asset URLs, and hash routes work from both the site root and a subdirectory without server-side route rewrites.

## What you can do

- **Overview** shows this week's activities and recorded time, a daily chart, active goals, area counts, and recent work. The week starts on Monday in your local time zone.
- **Activity** lets you log, edit, or delete completed work. Search titles and notes, or filter by growth area, connected goal, and date range.
- **Goals** lets you create goals, update their details, review linked activities, start, complete, reopen, archive, and restore them. Only in-progress goals count as active.
- **Settings** lets you create, edit, and archive growth areas and export or restore a JSON backup.
- **Sample mode** is available through **Explore sample data** on Overview or `?sample#/overview`. Its records and changes stay in memory and reset on reload.

## Back up or restore

1. Open **Settings → Backup and restore → Export Backup**. Keep the downloaded JSON file somewhere private.
2. To restore, choose the JSON file and select **Review Backup**. Track-It checks the format and links and shows the record counts.
3. Choose **Replace Personal Data** to confirm. Restore replaces the entire personal workspace in one IndexedDB transaction. If validation or writing fails, the existing records are kept.

IndexedDB data belongs to the origin and browser profile. Changing the protocol, hostname, or port can open a different workspace. Clearing site data will clear the local workspace. Use a backup to move data between origins or browser profiles.

## Architecture and data

- `src/main.js` loads personal data before starting the hash router. Sample mode starts without opening IndexedDB.
- `src/data/workspace.js` owns the current records and applies validation before persisting changes. It updates its in-memory snapshot after the transaction succeeds.
- `src/storage/indexed-db.js` manages IndexedDB schema version 1, initialization, transactions, and atomic restore. A revision check protects personal writes from stale tabs.
- `src/views/` renders the selected workspace, and `src/components/` connects forms and dialogs to it.
- `tests/` contains Node tests for data, storage, controllers, rendering, and routing. `fake-indexeddb` is a development-only test dependency.

| Store | Record fields |
| --- | --- |
| `areas` | `id`, `name`, `icon`, `color`, optional `description`, `createdAt`, `updatedAt`, nullable `archivedAt` |
| `goals` | `id`, `areaId`, `title`, `description`, `status`, nullable `targetDate`, `createdAt`, `updatedAt` |
| `activities` | `id`, `areaId`, nullable `goalId`, `title`, `note`, `occurredOn`, nullable `durationMinutes`, `createdAt`, `updatedAt` |
| `settings` | `key`, `value` |

IDs stay stable through edits. Calendar dates use local `YYYY-MM-DD` strings, while creation, update, and archive timestamps use ISO strings. Goal statuses are `not_started`, `in_progress`, `completed`, and `archived`. A backup includes `formatVersion`, `exportedAt`, and all four record collections. The internal initialization marker and workspace revision are excluded.

See [activity behavior and validation](docs/activity-logging.md) and [shared UI components](docs/ui-components.md).

## Screenshots

For GitHub screenshots, run the app and open **Explore sample data** so the images contain illustrative records. Capture Overview and Activity at approximately 1280 px and 320 px. Save screenshots under `docs/screenshots/` and link them here with descriptive alt text. Development-only component examples are available at `?ui#/overview` when using the Vite dev server.

## Limitations and future improvements

- Personal data lives in one browser profile. Backups are manual, and there is no account or cloud sync.
- Tabs load a snapshot. If another tab saves first, refresh the older tab before writing again.
- Track-It has no service worker for offline reloads. Future work could add offline caching, backup reminders, and accessibility checks with additional browsers and assistive technology.
