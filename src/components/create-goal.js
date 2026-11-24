import { createDialog } from './dialog.js';
import { setFieldError } from './ui.js';
import { renderGoalForm, renderGoalList } from '../views/goals.js';

export function createGoalEditor(options) {
  const workspace = options.workspace;
  const mode = options.mode;
  const goal = options.goal;
  const content = document.createElement('div');
  content.innerHTML = renderGoalForm(workspace.getData(mode), goal);
  const form = content.querySelector('form');
  const fieldNames = ['title', 'description', 'targetDate'];
  if (!goal) fieldNames.splice(1, 0, 'areaId');

  function getField(name) {
    return form.elements.namedItem(name);
  }

  getField('title').autofocus = true;
  const dialog = createDialog({
    title: goal ? 'Edit Goal' : 'Create Goal',
    description: goal
      ? 'Edit this goal’s title, description, or target date.'
      : 'Temporary goals only. Nothing is saved after a refresh. Closing keeps your draft while you stay on this page.',
    content: content,
  });
  document.body.append(dialog.element);

  function open(trigger) {
    if (goal) {
      form.reset();
      for (const name of fieldNames) setFieldError(getField(name));
    }
    dialog.open(trigger);
  }

  function submitGoal(event) {
    event.preventDefault();
    const input = {
      title: getField('title').value,
      description: getField('description').value,
      targetDate: getField('targetDate').value,
    };
    if (!goal) input.areaId = getField('areaId').value;

    let result;
    // An incomplete optional date must not be mistaken for a blank date.
    if (getField('targetDate').validity.badInput) {
      result = { errors: { targetDate: 'Enter a valid calendar date, or clear the field.' } };
    } else if (goal) {
      result = workspace.updateGoal(goal.id, input, mode);
    } else {
      result = workspace.addGoal(input, mode);
    }

    if (result.errors.goal) {
      form.querySelector('[role="alert"]').textContent = result.errors.goal;
      return;
    }
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

    if (goal) {
      for (const name of fieldNames) {
        getField(name).defaultValue = result.goal[name] ?? '';
      }
    }
    form.reset();
    dialog.close();
    options.onSaved(result.goal);
  }

  function remove() {
    if (dialog.element.open) dialog.close();
    dialog.element.remove();
  }

  form.addEventListener('submit', submitGoal);
  return { open: open, remove: remove };
}

export function mountGoals(main, options) {
  const workspace = options.workspace;
  const mode = options.mode;
  const opener = main.querySelector('#create-goal');
  let emptyOpener = main.querySelector('#create-goal-empty');
  const list = main.querySelector('#goals-list');
  const editor = createGoalEditor({ workspace: workspace, mode: mode, onSaved: refreshGoalList });

  function openDialog(event) {
    editor.open(event.currentTarget);
  }

  function refreshGoalList() {
    list.innerHTML = renderGoalList(workspace.getData(mode));
    if (emptyOpener) {
      emptyOpener.removeEventListener('click', openDialog);
      emptyOpener = null;
      // The empty-state button is gone after the first goal is created.
      opener.focus();
    }
    main.querySelector('#goals-status').textContent = 'Goal added to your temporary workspace. It will disappear on refresh.';
  }

  function cleanUpGoals() {
    opener.removeEventListener('click', openDialog);
    if (emptyOpener) emptyOpener.removeEventListener('click', openDialog);
    editor.remove();
  }

  opener.addEventListener('click', openDialog);
  if (emptyOpener) emptyOpener.addEventListener('click', openDialog);
  return cleanUpGoals;
}
