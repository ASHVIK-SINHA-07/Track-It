import { createDialog } from './dialog.js';
import { escapeHtml, setFieldError } from './ui.js';
import { renderActivityForm, renderActivityHistory, renderGoalOptions } from '../views/activity.js';
import { localDateValue } from '../data/activity.js';

export function mountActivity(main, { workspace, mode }) {
  const data = workspace.getData(mode);
  const content = document.createElement('div');
  content.innerHTML = renderActivityForm(data);
  const form = content.querySelector('form');
  const field = name => form.elements.namedItem(name);
  field('title').autofocus = true;
  const dialog = createDialog({
    title: 'Log Activity',
    description: 'Temporary entries only. Nothing is saved after a refresh. Closing keeps your draft while you stay on this page.',
    content,
  });
  document.body.append(dialog.element);
  const opener = main.querySelector('#log-activity');
  const open = () => dialog.open(opener);
  opener.addEventListener('click', open);

  function updateGoals() {
    const selected = field('goalId').value;
    const options = renderGoalOptions(data.goals, field('areaId').value);
    field('goalId').innerHTML = options.map(({ value, label }) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join('');
    field('goalId').value = options.some(({ value }) => value === selected) ? selected : '';
    setFieldError(field('goalId'));
  }
  field('areaId').addEventListener('change', updateGoals);
  form.addEventListener('submit', event => {
    event.preventDefault();
    const names = ['title', 'areaId', 'occurredOn', 'goalId', 'durationMinutes', 'note'];
    const input = Object.fromEntries(names.map(name => [name, field(name).value]));
    // Number inputs can expose an empty value for incomplete numeric text.
    // Check badInput before adding so that such text is never silently discarded.
    const result = field('durationMinutes').validity.badInput
      ? { errors: { durationMinutes: 'Enter a nonnegative whole number of minutes, or clear the field.' } }
      : workspace.addActivity(input, mode);
    for (const name of names) setFieldError(field(name), result.errors[name] ?? '');
    const invalid = names.find(name => result.errors[name]);
    if (invalid) {
      field(invalid).focus();
      return;
    }
    main.querySelector('#activity-history').innerHTML = renderActivityHistory(workspace.getData(mode));
    main.querySelector('#activity-status').textContent = 'Activity added to temporary history. It will disappear on refresh.';
    form.reset();
    field('occurredOn').value = localDateValue();
    updateGoals();
    dialog.close();
  });

  // The router unmounts the controller before replacing this view's HTML.
  return () => {
    opener.removeEventListener('click', open);
    if (dialog.element.open) dialog.close();
    dialog.element.remove();
  };
}
