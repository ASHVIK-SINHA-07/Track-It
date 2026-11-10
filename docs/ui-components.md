# ECO-004 UI foundations

These small functions fit Track-It's existing HTML-string views. Import from `src/components/ui.js`; insert the returned strings into developer-owned templates. They render UI only: validation rules, submission, and data storage belong to their callers.

## Buttons

```js
import { renderButton } from './components/ui.js';

renderButton({ label: 'Continue' });
renderButton({ label: 'Cancel', variant: 'secondary' });
renderButton({ label: 'Remove', variant: 'destructive', disabled: true });
renderButton({ label: 'Submit', type: 'submit', id: 'example-submit' });
```

Default type is `button`, avoiding accidental form submission. Variants are `primary`, `secondary`, and `destructive`. Attach handlers with `addEventListener` after inserting the markup; inline event-handler strings are not supported.

## Fields

```js
import { renderField, setFieldError } from './components/ui.js';

renderField({ id: 'example-title', label: 'Example title', required: true });
renderField({ label: 'Example notes', type: 'textarea', value: 'Some text' });
renderField({
  label: 'Example choice', type: 'select', value: 'one',
  options: [{ value: 'one', label: 'One' }, { value: 'two', label: 'Two' }],
});
renderField({ label: 'Example date', type: 'date', min: '2026-01-01' });
renderField({ label: 'Example count', type: 'number', min: 0, max: 100, step: 1 });
renderField({ label: 'Unavailable example', disabled: true });
renderField({ label: 'Error example', error: 'Enter a value.', hint: 'Example guidance.' });

// After inserting the field into the document:
const control = document.getElementById('example-title');
setFieldError(control, 'Enter some example text.');
setFieldError(control); // Clear the error.
```

Every field has an explicit label associated with its control. Omitted IDs are generated; explicitly supplied IDs must be unique in the document. `name` defaults to `id`. Hints and errors are connected through `aria-describedby`; errors also update `aria-invalid` and a polite live region. The renderer does not perform validation. Native HTML constraints remain available, and the caller can use `control.validity` or domain rules.

## Cards

```js
import { renderCard, renderField, escapeHtml } from './components/ui.js';

renderCard({ title: 'Example settings', contentHtml: renderField({ label: 'Example name' }) });
renderCard({ contentHtml: '<p>Developer-authored example content.</p>' });
renderCard({ title: 'Example note', contentHtml: `<p>${escapeHtml(untrustedText)}</p>` });
```

The title is escaped automatically. **`contentHtml` is an explicit trusted-markup slot** for composing components; it is not escaped. Never pass raw user content to it. Use `escapeHtml` for text inside templates, or build DOM nodes with `textContent` for dynamic content. Escaping HTML is not a general URL sanitizer.

Existing Overview cards use the `.ui-card` class directly, preserving their semantic `<article>` tags and page-specific spacing while sharing surface, border, and radius styles.

## Empty states

```js
import { renderEmptyState } from './components/ui.js';

renderEmptyState({
  title: 'Example empty state',
  message: 'There is nothing to display in this example.',
  detail: 'Optional supporting text.',
  iconName: 'goals',
  badge: 'UI example',
  action: { label: 'Overview', href: '#/overview' },
});
```

`detail`, `badge`, and `action` are optional. Supported icons are `activity`, `goals`, `leaf`, `overview`, and `check`. Actions are internal hash links (`#/...`); arbitrary URL schemes are rejected. All supplied text is escaped. Activity and Goals reuse this renderer and the original full-empty styles.

## Dialogs

```js
import { createDialog } from './components/dialog.js';

const content = document.createElement('p');
content.textContent = 'Example dialog content.';
const dialog = createDialog({
  title: 'Example dialog',
  description: 'Optional supporting description.',
  content,
});
document.body.append(dialog.element);
opener.addEventListener('click', () => dialog.open(opener));
// Another event handler may call dialog.close().
```

Append the dialog to the document before opening it. `content` is a DOM node, such as a form or container; headings and descriptions are set using safe text APIs. `open()` defaults its opener to `document.activeElement`. The Close button calls native `close()`. The close listener restores focus to the opener when it is still connected.

The native `showModal()` API supplies modality, background inertness, focus containment, and Escape dismissal. A content control with the `autofocus` attribute receives initial focus; otherwise native focus selection normally starts at the Close button. No custom focus trap or document-wide keyboard listener is added. Actual keyboard behavior must still be checked in supported browsers.

## Development showcase

Run `npm run dev` and open `/?ui#/overview` at the local origin. The panel below the page is clearly labeled development-only. Its example controls update demonstration messages or validate temporary example values; they do not store records.

The `import.meta.env.DEV` guard and dynamic import in `main.js` exclude the showcase module and its stylesheet from Vite's production build. The normal router and navigation are unchanged.
