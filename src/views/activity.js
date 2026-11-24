import { escapeHtml, renderButton, renderEmptyState, renderField } from '../components/ui.js';
import { sortRecentActivities, parseCalendarDate, hasRecordedDuration } from '../data/overview.js';
import { ACTIVITY_LIMITS, availableGoals, filterActivities, localDateValue } from '../data/activity.js';

function renderHistoryItem(activity, areas, goals, editable) {
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

  const contextHtml = `<p class="recent-meta">${escapeHtml(areaName)}</p>${goalHtml}`;
  let actions = '';
  if (editable) {
    const id = escapeHtml(activity.id);
    const title = escapeHtml(activity.title);
    actions = `<div class="ui-actions activity-actions">
      <button class="ui-button ui-button--secondary" type="button" data-edit-activity="${id}" aria-label="Edit activity: ${title}">Edit</button>
      <button class="ui-button ui-button--secondary" type="button" data-delete-activity="${id}" aria-label="Delete activity: ${title}">Delete</button>
    </div>`;
  }
  return renderActivityEntry(activity, contextHtml, actions);
}

export function renderActivityEntry(activity, contextHtml = '', actions = '') {
  let durationHtml = '';
  if (hasRecordedDuration(activity)) {
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
    ${contextHtml}${durationHtml}${noteHtml}${actions}</div>${dateHtml}</li>`;
}

export function renderActivityHistory(data = {}, options = {}) {
  const areas = data.areas || [];
  const goals = data.goals || [];
  const activities = filterActivities(data.activities || [], options.filters);
  if (activities.length === 0) {
    if (options.filters && Object.values(options.filters).some(Boolean)) {
      return renderEmptyState({
        id: 'activity-filter-empty', title: 'No matching activities',
        message: 'Change or reset the filters to see more of your history.',
      });
    }
    return renderEmptyState({
      id: 'activity-empty-title', title: 'Every bit of effort has a place.',
      message: 'No activities yet. Log something you’ve done to start your history.',
      action: { label: 'Back to overview', href: '#/overview' },
    });
  }

  const sortedActivities = sortRecentActivities(activities);
  let itemsHtml = '';
  for (const activity of sortedActivities) {
    itemsHtml += renderHistoryItem(activity, areas, goals, options.editable);
  }
  return `<ul class="recent-list ui-card">${itemsHtml}</ul>`;
}

function renderActivityFilters(data) {
  const areas = [{ value: '', label: 'All growth areas' }];
  for (const area of data.areas || []) {
    const suffix = area.archivedAt == null ? '' : ' (archived)';
    areas.push({ value: area.id, label: area.name + suffix });
  }
  const goals = [{ value: '', label: 'All goals' }];
  for (const goal of data.goals || []) {
    goals.push({ value: goal.id, label: goal.title });
  }
  return `<form id="activity-filters" class="ui-card ui-stack" aria-label="Filter activity history">
    ${renderField({ id: 'filter-query', name: 'query', label: 'Search titles or notes' })}
    <div class="filter-grid">
      ${renderField({ id: 'filter-area', name: 'areaId', label: 'Filter by growth area', type: 'select', options: areas })}
      ${renderField({ id: 'filter-goal', name: 'goalId', label: 'Filter by connected goal', type: 'select', options: goals })}
      ${renderField({ id: 'filter-from', name: 'from', label: 'From date', type: 'date' })}
      ${renderField({ id: 'filter-to', name: 'to', label: 'To date', type: 'date' })}
    </div>
    <div class="ui-actions">${renderButton({ label: 'Reset filters', id: 'reset-activity-filters', variant: 'secondary' })}</div>
    <p id="activity-filter-error" class="ui-error" role="alert"></p>
  </form>`;
}

export function renderActivity(data = {}, options = {}) {
  let workspaceMessage = 'Activities are saved in this browser.';
  let badge = 'Personal workspace';
  if (options.sample) {
    workspaceMessage = 'Sample workspace. Illustrative records and any entries you add here stay separate from your personal workspace and reset on reload.';
    badge = 'Sample data';
  }

  return `<div class="page-heading"><p class="eyebrow">THE WORK YOU PUT IN</p><h1>Activity<span>.</span></h1><p>A record of the things you’ve done, big and small.</p></div>
    <div class="foundation-note"><span class="status-dot" aria-hidden="true"></span><p>${workspaceMessage}</p><span class="small-tag">${badge}</span></div>
    <div class="section-heading activity-heading"><div><h2 id="activity-history-title">Activity history</h2><p>Completed work, newest first.</p></div>${renderButton({ label: 'Log Activity', id: 'log-activity' })}</div>
    ${renderActivityFilters(data)}
    <p id="activity-status" class="ui-hint" role="status"></p>
    <section id="activity-history" tabindex="-1" aria-labelledby="activity-history-title">${renderActivityHistory(data, { editable: true })}</section>`;
}

export function renderGoalOptions(goals = [], areaId = '', original = null, archivedArea = false) {
  const options = [{ value: '', label: 'No connected goal' }];
  const matchingGoals = archivedArea ? [] : availableGoals(goals, areaId);
  for (const goal of matchingGoals) {
    options.push({ value: goal.id, label: goal.title });
  }
  if (original?.goalId && original.areaId === areaId && !matchingGoals.some(goal => goal.id === original.goalId)) {
    const historical = goals.find(goal => goal.id === original.goalId && goal.areaId === areaId);
    if (historical) options.push({ value: historical.id, label: historical.title + ' (existing link)' });
  }
  return options;
}

export function renderActivityForm(data = {}, now = new Date(), activity = null) {
  const areas = data.areas || [];
  const goals = data.goals || [];
  const areaOptions = [{ value: '', label: 'Choose a growth area' }];
  for (const area of areas) {
    if (area.archivedAt == null) {
      areaOptions.push({ value: area.id, label: area.name });
    } else if (area.id === activity?.areaId) {
      areaOptions.push({ value: area.id, label: area.name + ' (archived)' });
    }
  }
  let areaHint = 'No growth areas are available.';
  if (areaOptions.length > 1) {
    areaHint = 'Choose the part of your journey this belongs to.';
  }

  const areaId = activity?.areaId || '';
  const archived = areas.some(area => area.id === areaId && area.archivedAt != null);
  const prefix = activity ? 'edit-activity' : 'log';
  return `<form id="${activity ? 'edit-activity-form' : 'quick-log-form'}" class="ui-stack" novalidate>
    ${renderField({ id: prefix + '-title', name: 'title', label: 'Activity title', required: true, value: activity?.title, maxLength: ACTIVITY_LIMITS.title, hint: 'Up to ' + ACTIVITY_LIMITS.title + ' characters.' })}
    ${renderField({ id: prefix + '-area', name: 'areaId', type: 'select', label: 'Growth area', required: true, value: areaId, hint: areaHint, options: areaOptions })}
    ${renderField({ id: prefix + '-date', name: 'occurredOn', type: 'date', label: 'Activity date', required: true, value: activity?.occurredOn || localDateValue(now) })}
    ${renderField({ id: prefix + '-goal', name: 'goalId', type: 'select', label: 'Connected goal (optional)', value: activity?.goalId || '', options: renderGoalOptions(goals, areaId, activity, archived), hint: 'Only goals in the selected area appear.' })}
    ${renderField({ id: prefix + '-duration', name: 'durationMinutes', type: 'number', label: 'Duration in minutes (optional)', value: activity?.durationMinutes ?? '', min: 0, step: 1 })}
    ${renderField({ id: prefix + '-note', name: 'note', type: 'textarea', label: 'Notes (optional)', value: activity?.note, maxLength: ACTIVITY_LIMITS.note, hint: 'Up to ' + ACTIVITY_LIMITS.note + ' characters.' })}
    <p class="ui-error" role="alert"></p>
    ${renderButton({ label: 'Save Activity', type: 'submit' })}
  </form>`;
}
