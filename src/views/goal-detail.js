import { escapeHtml, renderButton, renderEmptyState, renderField } from '../components/ui.js';
import { goalStatusOptions } from '../data/goals.js';
import { hasRecordedDuration, sortRecentActivities } from '../data/overview.js';
import { renderActivityEntry } from './activity.js';
import { getGoalAreaName, getStatusLabel, renderGoalTargetDate } from './goals.js';

export function renderGoalInfo(goal, areas) {
  let descriptionHtml = '';
  if (goal.description) {
    descriptionHtml = `<p class="goal-description">${escapeHtml(goal.description)}</p>`;
  }
  return `<h1>${escapeHtml(goal.title)}</h1>
    <p>Growth area: ${escapeHtml(getGoalAreaName(goal, areas))}</p>
    ${descriptionHtml}
    ${renderGoalTargetDate(goal.targetDate)}`;
}

export function renderGoalStatus(goal) {
  const nextStatuses = goalStatusOptions(goal.status);
  const currentStatus = `<p>Current status: <span class="small-tag">${getStatusLabel(goal.status)}</span></p>`;
  if (goal.status === 'archived') {
    const options = [{ value: '', label: 'Choose a status' }];
    for (const status of nextStatuses) {
      options.push({ value: status, label: getStatusLabel(status) });
    }
    return `${currentStatus}<form id="restore-goal-form" class="ui-stack" novalidate>
      ${renderField({ id: 'restore-goal-status', name: 'status', type: 'select', label: 'Restore as', required: true, options: options })}
      <div class="ui-actions">${renderButton({ label: 'Restore Goal', type: 'submit' })}</div>
    </form>`;
  }

  let buttonsHtml = '';
  for (const status of nextStatuses) {
    if (status === 'archived') {
      buttonsHtml += renderButton({ id: 'archive-goal', label: 'Archive Goal', variant: 'secondary' });
    } else {
      let label = 'Start Goal';
      if (goal.status === 'completed') label = 'Reopen Goal';
      if (status === 'completed') label = 'Complete Goal';
      buttonsHtml += renderButton({ id: 'advance-goal', label: label });
    }
  }
  return `${currentStatus}<div class="ui-actions">${buttonsHtml}</div>`;
}

function renderLinkedActivities(activities, goalId) {
  const linkedActivities = [];
  // Each duration is a safe integer, but their combined total can exceed that range.
  let minutes = 0n;
  for (const activity of activities) {
    if (activity.goalId === goalId) {
      linkedActivities.push(activity);
      if (hasRecordedDuration(activity)) minutes += BigInt(activity.durationMinutes);
    }
  }

  let historyHtml;
  if (linkedActivities.length === 0) {
    historyHtml = renderEmptyState({
      id: 'linked-empty-title', title: 'No linked activities yet',
      message: 'Activities connected to this goal will appear here.',
    });
  } else {
    let itemsHtml = '';
    for (const activity of sortRecentActivities(linkedActivities)) {
      itemsHtml += renderActivityEntry(activity);
    }
    historyHtml = `<ul class="recent-list ui-card">${itemsHtml}</ul>`;
  }

  return `<section class="ui-stack goal-activity-section" aria-labelledby="linked-activities-title">
    <h2 id="linked-activities-title">Linked activities</h2>
    <dl class="ui-actions">
      <div><dt>Activity count</dt><dd>${linkedActivities.length}</dd></div>
      <div><dt>Recorded duration</dt><dd>${minutes} min</dd></div>
    </dl>
    ${historyHtml}
  </section>`;
}

export function renderGoalDetail(data, goal, options = {}) {
  const backLink = '<a class="text-link" href="#/goals">Back to Goals</a>';
  if (!goal) {
    return `<div class="page-heading"><h1>Goal unavailable</h1>
      <p>This goal could not be found in the current workspace.</p></div>${backLink}`;
  }

  return `<div class="ui-stack goal-detail">
    <div>${backLink}</div>
    ${options.sample ? '<p class="small-tag">Sample workspace</p>' : ''}
    <div class="ui-card ui-stack">
      <div id="goal-detail-info" class="ui-stack">${renderGoalInfo(goal, data.areas)}</div>
      <div class="ui-actions">${renderButton({ id: 'edit-goal', label: 'Edit Goal', variant: 'secondary' })}</div>
    </div>
    <section class="ui-card ui-stack" aria-labelledby="goal-status-heading">
      <h2 id="goal-status-heading" tabindex="-1">Goal status</h2>
      <div id="goal-status-actions" class="ui-stack">${renderGoalStatus(goal)}</div>
      <p id="goal-status-notice" class="ui-hint" role="status"></p>
    </section>
    ${renderLinkedActivities(data.activities, goal.id)}
  </div>`;
}
