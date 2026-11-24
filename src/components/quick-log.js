import { confirmAction, createDialog } from './dialog.js';
import { escapeHtml, setFieldError, storageErrorMessage } from './ui.js';
import { renderActivityForm, renderActivityHistory, renderGoalOptions } from '../views/activity.js';
import { localDateValue } from '../data/activity.js';
import { parseCalendarDate } from '../data/overview.js';

function createActivityEditor(options) {
  const workspace = options.workspace;
  const mode = options.mode;
  const activity = options.activity || null;
  const content = document.createElement('div');
  content.innerHTML = renderActivityForm(workspace.getData(mode), new Date(), activity);
  const form = content.querySelector('form');
  const submitButton = form.querySelector('button[type="submit"]');
  const notice = form.querySelector('[role="alert"]');
  let saving = false;

  function getField(name) {
    return form.elements.namedItem(name);
  }

  getField('title').autofocus = true;
  const dialog = createDialog({
    title: activity ? 'Edit Activity' : 'Log Activity',
    description: 'Record completed work in a growth area.',
    content: content,
  });
  document.body.append(dialog.element);
  function open(trigger) {
    if (!saving) dialog.open(trigger);
  }

  function updateGoals() {
    const goalField = getField('goalId');
    const selectedGoal = goalField.value;
    const areaId = getField('areaId').value;
    const data = workspace.getData(mode);
    const archived = data.areas.some(area => area.id === areaId && area.archivedAt != null);
    const goalOptions = renderGoalOptions(data.goals, areaId, activity, archived);
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

  async function submitActivity(event) {
    event.preventDefault();
    if (saving) return;
    notice.textContent = '';
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
      saving = true;
      submitButton.disabled = true;
      dialog.setBusy(true);
      try {
        if (activity) result = await workspace.updateActivity(activity.id, input, mode);
        else result = await workspace.addActivity(input, mode);
      } catch (error) {
        notice.textContent = storageErrorMessage(error, 'Could not save the activity. Try again.');
        return;
      } finally {
        saving = false;
        submitButton.disabled = false;
        dialog.setBusy(false);
      }
    }

    if (!dialog.element.isConnected) return;
    if (result.errors.activity) {
      notice.textContent = result.errors.activity;
      return;
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

    form.reset();
    getField('occurredOn').value = localDateValue();
    updateGoals();
    dialog.close();
    options.onSaved();
  }

  function remove() {
    if (dialog.element.open) dialog.close();
    dialog.element.remove();
  }

  if (activity) dialog.element.addEventListener('close', remove);
  getField('areaId').addEventListener('change', updateGoals);
  form.addEventListener('submit', submitActivity);
  return { open: open, remove: remove };
}

export function mountActivity(main, options) {
  const workspace = options.workspace;
  const mode = options.mode;
  const opener = main.querySelector('#log-activity');
  const history = main.querySelector('#activity-history');
  const notice = main.querySelector('#activity-status');
  const filtersForm = main.querySelector('#activity-filters');
  const resetFilters = main.querySelector('#reset-activity-filters');
  const filterError = main.querySelector('#activity-filter-error');
  let filters = {};
  let editDialog;
  let confirmation;

  function refreshHistory() {
    history.innerHTML = renderActivityHistory(workspace.getData(mode), { editable: true, filters: filters });
  }

  function applyFilters() {
    const values = Object.fromEntries(new FormData(filtersForm));
    values.query = values.query.trim();
    for (const name of ['from', 'to']) {
      const field = filtersForm.elements.namedItem(name);
      if (field.validity.badInput || (values[name] && !parseCalendarDate(values[name]))) {
        filterError.textContent = 'Enter valid dates to filter history.';
        return;
      }
    }
    if (values.from && values.to && values.from > values.to) {
      filterError.textContent = 'The end date must be on or after the start date.';
      return;
    }
    filterError.textContent = '';
    filters = values;
    refreshHistory();
  }

  function clearFilters() {
    filtersForm.reset();
    applyFilters();
  }

  function submitFilters(event) {
    event.preventDefault();
    applyFilters();
  }

  function showSavedActivity() {
    refreshHistory();
    notice.textContent = mode === 'sample' ? 'Activity added to the sample workspace.' : 'Activity saved.';
  }

  const editor = createActivityEditor({ workspace: workspace, mode: mode, onSaved: showSavedActivity });

  function openDialog() { editor.open(opener); }

  function manageActivity(event) {
    const button = event.target.closest('button');
    if (!button) return;
    const id = button.dataset.editActivity || button.dataset.deleteActivity;
    if (!id) return;
    const activity = workspace.getData(mode).activities.find(record => record.id === id);
    if (!activity) return;

    if (button.dataset.editActivity) {
      editDialog = createActivityEditor({
        workspace: workspace, mode: mode, activity: activity, onSaved: function showEdit() {
          refreshHistory();
          notice.textContent = 'Activity updated.';
          history.focus();
        },
      });
      editDialog.open(button);
    } else {
      confirmation = confirmAction({
        title: 'Delete Activity?',
        description: '“' + activity.title + '” will be permanently removed from your history.',
        confirmLabel: 'Delete Activity',
        trigger: button,
        onConfirm: async function deleteActivity() {
          let result;
          try {
            result = await workspace.deleteActivity(id, mode);
          } catch (error) {
            throw new Error(storageErrorMessage(error, 'Could not delete the activity. Try again.'));
          }
          if (result.errors.activity) throw new Error(result.errors.activity);
        },
        onDone: function showDeletion() {
          if (!history.isConnected) return;
          refreshHistory();
          notice.textContent = 'Activity deleted.';
          history.focus();
        },
      });
    }
  }

  opener.addEventListener('click', openDialog);
  history.addEventListener('click', manageActivity);
  filtersForm?.addEventListener('input', applyFilters);
  filtersForm?.addEventListener('submit', submitFilters);
  resetFilters?.addEventListener('click', clearFilters);
  return function cleanUpActivity() {
    opener.removeEventListener('click', openDialog);
    history.removeEventListener('click', manageActivity);
    editor.remove();
    editDialog?.remove();
    confirmation?.element.remove();
  };
}
