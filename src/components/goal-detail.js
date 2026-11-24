import { goalStatusOptions } from '../data/goals.js';
import { getStatusLabel } from '../views/goals.js';
import { renderGoalInfo, renderGoalStatus } from '../views/goal-detail.js';
import { createGoalEditor } from './create-goal.js';
import { createDialog } from './dialog.js';
import { renderButton, setFieldError } from './ui.js';

export function mountGoalDetail(main, options) {
  const workspace = options.workspace;
  const mode = options.mode;
  const areas = options.areas;
  let goal = options.goal;
  const info = main.querySelector('#goal-detail-info');
  const editButton = main.querySelector('#edit-goal');
  const statusActions = main.querySelector('#goal-status-actions');
  const statusHeading = main.querySelector('#goal-status-heading');
  const notice = main.querySelector('#goal-status-notice');
  const editor = createGoalEditor({ workspace: workspace, mode: mode, goal: goal, onSaved: showSavedGoal });

  const confirmation = document.createElement('div');
  confirmation.className = 'ui-actions';
  confirmation.innerHTML = renderButton({ label: 'Cancel', id: 'cancel-archive-goal', variant: 'secondary' })
    + renderButton({ label: 'Archive Goal', id: 'confirm-archive-goal', variant: 'destructive' });
  const cancelButton = confirmation.querySelector('#cancel-archive-goal');
  const confirmButton = confirmation.querySelector('#confirm-archive-goal');
  cancelButton.autofocus = true;
  const archiveDialog = createDialog({
    title: 'Archive Goal?',
    description: 'Linked activities will stay in your history. You can restore the goal later.',
    content: confirmation,
  });
  document.body.append(archiveDialog.element);

  function openEditor() {
    editor.open(editButton);
  }

  function showSavedGoal(savedGoal) {
    goal = savedGoal;
    info.innerHTML = renderGoalInfo(goal, areas);
    notice.textContent = 'Goal changes saved.';
  }

  function changeStatus(status, restoreField = null) {
    const result = workspace.changeGoalStatus(goal.id, status, mode);
    if (result.errors.status && restoreField) {
      setFieldError(restoreField, result.errors.status);
      restoreField.focus();
      return;
    }
    if (result.errors.status || result.errors.goal) {
      notice.textContent = result.errors.status || result.errors.goal;
      return;
    }

    goal = result.goal;
    statusActions.innerHTML = renderGoalStatus(goal);
    statusHeading.focus();
    notice.textContent = 'Goal status changed to ' + getStatusLabel(goal.status) + '.';
  }

  function handleStatusClick(event) {
    if (event.target.id === 'advance-goal') {
      changeStatus(goalStatusOptions(goal.status)[0]);
    } else if (event.target.id === 'archive-goal') {
      archiveDialog.open(event.target);
    }
  }

  function restoreGoal(event) {
    event.preventDefault();
    const field = event.target.elements.namedItem('status');
    changeStatus(field.value, field);
  }

  function archiveGoal() {
    archiveDialog.close();
    changeStatus('archived');
  }

  editButton.addEventListener('click', openEditor);
  statusActions.addEventListener('click', handleStatusClick);
  statusActions.addEventListener('submit', restoreGoal);
  cancelButton.addEventListener('click', archiveDialog.close);
  confirmButton.addEventListener('click', archiveGoal);

  function cleanUpGoalDetail() {
    editButton.removeEventListener('click', openEditor);
    statusActions.removeEventListener('click', handleStatusClick);
    statusActions.removeEventListener('submit', restoreGoal);
    editor.remove();
    if (archiveDialog.element.open) archiveDialog.close();
    archiveDialog.element.remove();
  }

  return cleanUpGoalDetail;
}
