import { escapeHtml, renderButton, renderEmptyState, renderField } from '../components/ui.js';
import { sortRecentActivities, parseCalendarDate } from '../data/overview.js';
import { ACTIVITY_LIMITS, availableGoals, localDateValue } from '../data/activity.js';

export function renderActivityHistory({ areas = [], goals = [], activities = [] } = {}) {
  if (!activities.length) return renderEmptyState({
    id: 'activity-empty-title', title: 'Every bit of effort has a place.',
    message: 'No activities yet. Log something you’ve done to start your temporary history.',
    detail: 'Entries are held in memory and disappear on refresh.',
    action: { label: 'Back to overview', href: '#/overview' },
  });
  return `<ul class="recent-list ui-card">${sortRecentActivities(activities).map(activity => {
    const area = areas.find(({ id }) => id === activity.areaId);
    const goal = activity.goalId == null ? null : goals.find(({ id, areaId }) => id === activity.goalId && areaId === activity.areaId);
    const date = parseCalendarDate(activity.occurredOn);
    return `<li class="recent-item"><div><h3>${escapeHtml(activity.title)}</h3>
      <p class="recent-meta">${escapeHtml(area?.name ?? 'Growth area unavailable')}</p>
      ${goal ? `<p class="recent-meta">Goal: ${escapeHtml(goal.title)}</p>` : ''}
      ${Number.isSafeInteger(activity.durationMinutes) && activity.durationMinutes >= 0 ? `<p class="recent-meta">${activity.durationMinutes} min</p>` : ''}
      ${activity.note ? `<p class="activity-note">${escapeHtml(activity.note)}</p>` : ''}</div>
      ${date ? `<time datetime="${escapeHtml(activity.occurredOn)}">${escapeHtml(date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }))}</time>` : '<span>Date unavailable</span>'}</li>`;
  }).join('')}</ul>`;
}

export function renderActivity(data = {}, { sample = false } = {}) {
  return `<div class="page-heading"><p class="eyebrow">THE WORK YOU PUT IN</p><h1>Activity<span>.</span></h1><p>A record of the things you’ve done, big and small.</p></div>
    <div class="foundation-note"><span class="status-dot" aria-hidden="true"></span><p>${sample ? 'Sample workspace. Illustrative records and any entries you add here stay separate from your personal workspace.' : 'Temporary workspace. Log completed work using the starter growth areas.'} Entries are held in memory only and disappear on refresh.</p><span class="small-tag">${sample ? 'Sample data' : 'Temporary entries'}</span></div>
    <div class="section-heading activity-heading"><div><h2 id="activity-history-title">Activity history</h2><p>Completed work, newest first.</p></div>${renderButton({ label: 'Log Activity', id: 'log-activity' })}</div>
    <p id="activity-status" class="ui-hint" role="status"></p>
    <section id="activity-history" aria-labelledby="activity-history-title">${renderActivityHistory(data)}</section>`;
}

export function renderGoalOptions(goals = [], areaId = '') {
  return [{ value: '', label: 'No connected goal' }, ...availableGoals(goals, areaId).map(goal => ({ value: goal.id, label: goal.title }))];
}

export function renderActivityForm({ areas = [], goals = [] } = {}, now = new Date()) {
  return `<form id="quick-log-form" class="ui-stack" novalidate>
    ${renderField({ id: 'log-title', name: 'title', label: 'Activity title', required: true, maxLength: ACTIVITY_LIMITS.title, hint: `Up to ${ACTIVITY_LIMITS.title} characters.` })}
    ${renderField({ id: 'log-area', name: 'areaId', type: 'select', label: 'Growth area', required: true, hint: areas.some(area => area.archivedAt == null) ? 'Choose the part of your journey this belongs to.' : 'No growth areas are available.', options: [{ value: '', label: 'Choose a growth area' }, ...areas.filter(area => area.archivedAt == null).map(area => ({ value: area.id, label: area.name }))] })}
    ${renderField({ id: 'log-date', name: 'occurredOn', type: 'date', label: 'Activity date', required: true, value: localDateValue(now) })}
    ${renderField({ id: 'log-goal', name: 'goalId', type: 'select', label: 'Connected goal (optional)', options: renderGoalOptions(goals), hint: 'Only goals in the selected area appear.' })}
    ${renderField({ id: 'log-duration', name: 'durationMinutes', type: 'number', label: 'Duration in minutes (optional)', min: 0, step: 1 })}
    ${renderField({ id: 'log-note', name: 'note', type: 'textarea', label: 'Notes (optional)', maxLength: ACTIVITY_LIMITS.note, hint: `Up to ${ACTIVITY_LIMITS.note} characters.` })}
    ${renderButton({ label: 'Add temporary activity', type: 'submit' })}
  </form>`;
}
