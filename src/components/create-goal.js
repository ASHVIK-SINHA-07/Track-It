import { createDialog } from './dialog.js';
import { setFieldError } from './ui.js';
import { renderGoalForm, renderGoalList } from '../views/goals.js';

export function mountGoals(main, options) {
  const workspace = options.workspace;
  const mode = options.mode;
  const content = document.createElement('div');
  content.innerHTML = renderGoalForm(workspace.getData(mode));
  const form = content.querySelector('form');

  function getField(name) {
    return form.elements.namedItem(name);
  }

  getField('title').autofocus = true;
  const dialog = createDialog({
    title: 'Create Goal',
    description: 'Temporary goals only. Nothing is saved after a refresh. Closing keeps your draft while you stay on this page.',
    content: content,
  });
  document.body.append(dialog.element);
  const opener = main.querySelector('#create-goal');

  function openDialog() {
    dialog.open(opener);
  }

  function submitGoal(event) {
    event.preventDefault();
    const input = {
      title: getField('title').value,
      areaId: getField('areaId').value,
      description: getField('description').value,
      targetDate: getField('targetDate').value,
    };

    let result;
    // An incomplete optional date must not be mistaken for a blank date.
    if (getField('targetDate').validity.badInput) {
      result = { errors: { targetDate: 'Enter a valid calendar date, or clear the field.' } };
    } else {
      result = workspace.addGoal(input, mode);
    }

    const fieldNames = ['title', 'areaId', 'description', 'targetDate'];
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
      return; // Keep all entered values until the user fixes the errors.
    }

    main.querySelector('#goals-list').innerHTML = renderGoalList(workspace.getData(mode));
    main.querySelector('#goals-status').textContent = 'Goal added to your temporary workspace. It will disappear on refresh.';
    form.reset();
    dialog.close();
  }

  function cleanUpGoals() {
    opener.removeEventListener('click', openDialog);
    if (dialog.element.open) {
      dialog.close();
    }
    dialog.element.remove();
  }

  opener.addEventListener('click', openDialog);
  form.addEventListener('submit', submitGoal);
  return cleanUpGoals;
}
