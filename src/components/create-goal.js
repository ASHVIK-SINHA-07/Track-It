import { createDialog } from './dialog.js';
import { setFieldError, storageErrorMessage } from './ui.js';
import { renderGoalForm, renderGoalList } from '../views/goals.js';

export function createGoalEditor(options) {
  const workspace = options.workspace;
  const mode = options.mode;
  const goal = options.goal;
  const content = document.createElement('div');
  content.innerHTML = renderGoalForm(workspace.getData(mode), goal);
  const form = content.querySelector('form');
  const submitButton = form.querySelector('button[type="submit"]');
  const notice = form.querySelector('[role="alert"]');
  let saving = false;
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
      : 'Choose a growth area for this goal.',
    content: content,
  });
  document.body.append(dialog.element);

  function open(trigger) {
    if (saving) return;
    notice.textContent = '';
    if (goal) {
      form.reset();
      for (const name of fieldNames) setFieldError(getField(name));
    }
    dialog.open(trigger);
  }

  async function submitGoal(event) {
    event.preventDefault();
    if (saving) return;
    notice.textContent = '';
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
    } else {
      saving = true;
      submitButton.disabled = true;
      dialog.setBusy(true);
      try {
        if (goal) result = await workspace.updateGoal(goal.id, input, mode);
        else result = await workspace.addGoal(input, mode);
      } catch (error) {
        notice.textContent = storageErrorMessage(error, 'Could not save the goal. Try again.');
        return;
      } finally {
        saving = false;
        submitButton.disabled = false;
        dialog.setBusy(false);
      }
    }

    if (!dialog.element.isConnected) return;
    if (result.errors.goal) {
      notice.textContent = result.errors.goal;
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
    main.querySelector('#goals-status').textContent = mode === 'sample' ? 'Goal added to the sample workspace.' : 'Goal saved.';
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
