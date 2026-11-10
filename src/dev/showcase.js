import './showcase.css';
import { renderButton, renderCard, renderField, renderEmptyState, setFieldError } from '../components/ui.js';
import { createDialog } from '../components/dialog.js';

export function mountShowcase() {
  const showcase = document.createElement('section');
  showcase.className = 'ui-showcase';
  showcase.setAttribute('aria-label', 'Development-only component showcase');
  showcase.innerHTML = `
    <details open>
      <summary>Development only · ECO-004 component showcase</summary>
      <p class="ui-hint">UI examples only. Nothing here creates activities, goals, or saved data. Remove ?ui from the URL to hide this panel.</p>
      <div class="ui-stack">
        ${renderCard({ title: 'Buttons', contentHtml: `<div class="ui-actions">${['primary', 'secondary', 'destructive'].map((variant) => renderButton({ label: `${variant} demo`, variant, id: `demo-${variant}` }) + renderButton({ label: `${variant} disabled`, variant, disabled: true })).join('')}</div>` })}
        ${renderCard({ title: 'Labeled fields', contentHtml: `
          <form id="demo-fields" class="ui-stack" novalidate>
            ${renderField({ id: 'demo-text', label: 'Example text', required: true, hint: 'Submit the empty example to see its error state.' })}
            ${renderField({ id: 'demo-notes', type: 'textarea', label: 'Example textarea', value: 'Temporary example text' })}
            ${renderField({ id: 'demo-select', type: 'select', label: 'Example select', options: [{ value: '', label: 'Choose an example' }, { value: 'one', label: 'Example one' }, { value: 'two', label: 'Example two' }] })}
            ${renderField({ id: 'demo-date', type: 'date', label: 'Example date' })}
            ${renderField({ id: 'demo-number', type: 'number', label: 'Example number', min: 0, max: 100, step: 1, hint: 'Example range: 0–100.' })}
            ${renderField({ id: 'demo-disabled', label: 'Disabled example', value: 'Unavailable', disabled: true })}
            ${renderButton({ label: 'Check example fields', type: 'submit' })}
          </form>` })}
        ${renderCard({ contentHtml: '<p>This card has no heading. It uses the same surface, border, radius, and spacing foundation.</p>' })}
        ${renderEmptyState({ title: 'Example empty state', message: 'This is a reusable empty-state demonstration.', detail: 'No user records are shown here.', badge: 'UI example', iconName: 'leaf', action: { label: 'Go to overview', href: '#/overview' } })}
        ${renderCard({ title: 'Native dialog', contentHtml: `<p class="ui-hint">Open the dialog, use Tab and Shift+Tab, then Escape or Close. Focus should return to the opener.</p>${renderButton({ label: 'Open example dialog', id: 'demo-dialog-open' })}` })}
        <p id="demo-status" class="ui-hint" role="status">Ready for component checks. Nothing is saved.</p>
      </div>
    </details>`;

  document.querySelector('.content-footer').before(showcase);
  const status = showcase.querySelector('#demo-status');
  for (const variant of ['primary', 'secondary', 'destructive']) {
    showcase.querySelector(`#demo-${variant}`).addEventListener('click', () => {
      status.textContent = `${variant} demonstration pressed. No data was changed.`;
    });
  }

  const text = showcase.querySelector('#demo-text');
  const number = showcase.querySelector('#demo-number');
  const validateText = () => setFieldError(text, text.value.trim() ? '' : 'Enter some example text.');
  const validateNumber = () => setFieldError(number, number.validity.valid ? '' : 'Use a whole number from 0 to 100.');
  text.addEventListener('input', () => {
    if (text.getAttribute('aria-invalid') === 'true') validateText();
  });
  number.addEventListener('input', validateNumber);
  showcase.querySelector('#demo-fields').addEventListener('submit', (event) => {
    event.preventDefault();
    validateText();
    validateNumber();
    const invalid = showcase.querySelector('[aria-invalid="true"]');
    if (invalid) invalid.focus();
    status.textContent = invalid ? 'Example validation errors are displayed.' : 'Example fields checked. Nothing was saved.';
  });

  const content = document.createElement('div');
  content.className = 'ui-stack';
  content.innerHTML = renderField({ id: 'demo-dialog-text', label: 'Example dialog input', hint: 'Temporary text only; this is not an activity form.' });
  content.querySelector('input').autofocus = true;
  const dialog = createDialog({
    title: 'Development-only dialog',
    description: 'Native modal example. Escape and Close dismiss it without saving anything.',
    content,
  });
  document.body.append(dialog.element);
  const opener = showcase.querySelector('#demo-dialog-open');
  opener.addEventListener('click', () => dialog.open(opener));
}
