import { escapeHtml, renderButton, renderEmptyState, renderField } from '../components/ui.js';
import { sortRecentActivities, parseCalendarDate } from '../data/overview.js';
import { ACTIVITY_LIMITS, availableGoals, localDateValue } from '../data/activity.js';

function renderHistoryItem(activity, areas, goals) {
  let areaName = 'Growth area unavailable';
  for (const area of areas) {
    if (area.id === activity.areaId) {
      areaName = area.name;
      break;
    }
  }

  let goalHtml = '';
  if (activity.goalId != null) {
    for (const goal of goals) {
      if (goal.id === activity.goalId && goal.areaId === activity.areaId) {
        goalHtml = `<p class="recent-meta">Goal: ${escapeHtml(goal.title)}</p>`;
        break;
      }
    }
  }

  let durationHtml = '';
  if (Number.isSafeInteger(activity.durationMinutes) && activity.durationMinutes >= 0) {
    durationHtml = `<p class="recent-meta">${activity.durationMinutes} min</p>`;
  }
  let noteHtml = '';
  if (activity.note) {
    noteHtml = `<p class="activity-note">${escapeHtml(activity.note)}</p>`;
  }

  const date = parseCalendarDate(activity.occurredOn);
  let dateHtml = '<span>Date unavailable</span>';
  if (date) {
    const dateLabel = date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    dateHtml = `<time datetime="${escapeHtml(activity.occurredOn)}">${escapeHtml(dateLabel)}</time>`;
  }

  return `<li class="recent-item"><div><h3>${escapeHtml(activity.title)}</h3>
    <p class="recent-meta">${escapeHtml(areaName)}</p>
    ${goalHtml}${durationHtml}${noteHtml}</div>${dateHtml}</li>`;
}

export function renderActivityHistory(data = {}) {
  const areas = data.areas || [];
  const goals = data.goals || [];
  const activities = data.activities || [];
  if (activities.length === 0) {
    return renderEmptyState({
      id: 'activity-empty-title', title: 'Every bit of effort has a place.',
      message: 'No activities yet. Log something you’ve done to start your temporary history.',
      detail: 'Entries are held in memory and disappear on refresh.',
      action: { label: 'Back to overview', href: '#/overview' },
    });
  }

  const sortedActivities = sortRecentActivities(activities);
  let itemsHtml = '';
  for (const activity of sortedActivities) {
    itemsHtml += renderHistoryItem(activity, areas, goals);
  }
  return `<ul class="recent-list ui-card">${itemsHtml}</ul>`;
}

export function renderActivity(data = {}, options = {}) {
  let workspaceMessage = 'Temporary workspace. Log completed work using the starter growth areas.';
  let badge = 'Temporary entries';
  if (options.sample) {
    workspaceMessage = 'Sample workspace. Illustrative records and any entries you add here stay separate from your personal workspace.';
    badge = 'Sample data';
  }

  return `<div class="page-heading"><p class="eyebrow">THE WORK YOU PUT IN</p><h1>Activity<span>.</span></h1><p>A record of the things you’ve done, big and small.</p></div>
    <div class="foundation-note"><span class="status-dot" aria-hidden="true"></span><p>${workspaceMessage} Entries are held in memory only and disappear on refresh.</p><span class="small-tag">${badge}</span></div>
    <div class="section-heading activity-heading"><div><h2 id="activity-history-title">Activity history</h2><p>Completed work, newest first.</p></div>${renderButton({ label: 'Log Activity', id: 'log-activity' })}</div>
    <p id="activity-status" class="ui-hint" role="status"></p>
    <section id="activity-history" aria-labelledby="activity-history-title">${renderActivityHistory(data)}</section>`;
}

export function renderGoalOptions(goals = [], areaId = '') {
  const options = [{ value: '', label: 'No connected goal' }];
  const matchingGoals = availableGoals(goals, areaId);
  for (const goal of matchingGoals) {
    options.push({ value: goal.id, label: goal.title });
  }
  return options;
}

export function renderActivityForm(data = {}, now = new Date()) {
  const areas = data.areas || [];
  const goals = data.goals || [];
  const areaOptions = [{ value: '', label: 'Choose a growth area' }];
  for (const area of areas) {
    if (area.archivedAt == null) {
      areaOptions.push({ value: area.id, label: area.name });
    }
  }
  let areaHint = 'No growth areas are available.';
  if (areaOptions.length > 1) {
    areaHint = 'Choose the part of your journey this belongs to.';
  }

  return `<form id="quick-log-form" class="ui-stack" novalidate>
    ${renderField({ id: 'log-title', name: 'title', label: 'Activity title', required: true, maxLength: ACTIVITY_LIMITS.title, hint: 'Up to ' + ACTIVITY_LIMITS.title + ' characters.' })}
    ${renderField({ id: 'log-area', name: 'areaId', type: 'select', label: 'Growth area', required: true, hint: areaHint, options: areaOptions })}
    ${renderField({ id: 'log-date', name: 'occurredOn', type: 'date', label: 'Activity date', required: true, value: localDateValue(now) })}
    ${renderField({ id: 'log-goal', name: 'goalId', type: 'select', label: 'Connected goal (optional)', options: renderGoalOptions(goals), hint: 'Only goals in the selected area appear.' })}
    ${renderField({ id: 'log-duration', name: 'durationMinutes', type: 'number', label: 'Duration in minutes (optional)', min: 0, step: 1 })}
    ${renderField({ id: 'log-note', name: 'note', type: 'textarea', label: 'Notes (optional)', maxLength: ACTIVITY_LIMITS.note, hint: 'Up to ' + ACTIVITY_LIMITS.note + ' characters.' })}
    ${renderButton({ label: 'Add temporary activity', type: 'submit' })}
  </form>`;
}
