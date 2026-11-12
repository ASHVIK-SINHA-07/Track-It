import { createDialog } from './dialog.js';
import { escapeHtml, setFieldError } from './ui.js';
import { renderActivityForm, renderActivityHistory, renderGoalOptions } from '../views/activity.js';
import { localDateValue } from '../data/activity.js';

export function mountActivity(main, options) {
  const workspace = options.workspace;
  const mode = options.mode;
  const data = workspace.getData(mode);
  const content = document.createElement('div');
  content.innerHTML = renderActivityForm(data);
  const form = content.querySelector('form');

  function getField(name) {
    return form.elements.namedItem(name);
  }

  getField('title').autofocus = true;
  const dialog = createDialog({
    title: 'Log Activity',
    description: 'Temporary entries only. Nothing is saved after a refresh. Closing keeps your draft while you stay on this page.',
    content: content,
  });
  document.body.append(dialog.element);
  const opener = main.querySelector('#log-activity');

  function openDialog() {
    dialog.open(opener);
  }

  function updateGoals() {
    const goalField = getField('goalId');
    const selectedGoal = goalField.value;
    const areaId = getField('areaId').value;
    const goalOptions = renderGoalOptions(data.goals, areaId);
    let optionsHtml = '';
    let selectionIsValid = false;

    for (const option of goalOptions) {
      optionsHtml += `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`;
      if (option.value === selectedGoal) {
        selectionIsValid = true;
      }
    }

    goalField.innerHTML = optionsHtml;
    goalField.value = '';
    if (selectionIsValid) {
      goalField.value = selectedGoal;
    }
    setFieldError(goalField);
  }

  function submitActivity(event) {
    event.preventDefault();
    const input = {
      title: getField('title').value,
      areaId: getField('areaId').value,
      occurredOn: getField('occurredOn').value,
      goalId: getField('goalId').value,
      durationMinutes: getField('durationMinutes').value,
      note: getField('note').value,
    };

    let result;
    // Browsers may expose incomplete number input as an empty value.
    // Report that error before adding a record, rather than losing the input.
    if (getField('durationMinutes').validity.badInput) {
      result = {
        errors: { durationMinutes: 'Enter a nonnegative whole number of minutes, or clear the field.' },
      };
    } else {
      result = workspace.addActivity(input, mode);
    }

    const fieldNames = ['title', 'areaId', 'occurredOn', 'goalId', 'durationMinutes', 'note'];
    let firstInvalidField = null;
    for (const name of fieldNames) {
      const field = getField(name);
      const message = result.errors[name] || '';
      setFieldError(field, message);
      if (message && firstInvalidField === null) {
        firstInvalidField = field;
      }
    }

    if (firstInvalidField) {
      firstInvalidField.focus();
      return; // Keep the entered values so the user can correct them.
    }

    const updatedData = workspace.getData(mode);
    main.querySelector('#activity-history').innerHTML = renderActivityHistory(updatedData);
    main.querySelector('#activity-status').textContent = 'Activity added to temporary history. It will disappear on refresh.';
    form.reset();
    getField('occurredOn').value = localDateValue();
    updateGoals();
    dialog.close();
  }

  function cleanUpActivity() {
    opener.removeEventListener('click', openDialog);
    if (dialog.element.open) {
      dialog.close();
    }
    dialog.element.remove();
  }

  opener.addEventListener('click', openDialog);
  getField('areaId').addEventListener('change', updateGoals);
  form.addEventListener('submit', submitActivity);

  // Give the router a function it can call when leaving this page.
  return cleanUpActivity;
}
