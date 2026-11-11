import { icon } from '../components/icons.js';
import { escapeHtml, renderEmptyState } from '../components/ui.js';
import { parseCalendarDate, sortRecentActivities, summarizeOverview } from '../data/overview.js';

const colors = new Set(['sage', 'blue', 'purple', 'sand', 'rose']);
const icons = new Set(['overview', 'activity', 'goals', 'leaf', 'check']);

function renderArea(area, activities) {
  const count = activities.filter(({ areaId }) => areaId === area.id).length;
  return `<article class="ui-card growth-card ${colors.has(area.color) ? area.color : 'sage'}">
    <span class="area-number">${icon(icons.has(area.icon) ? area.icon : 'leaf')}</span>
    <h3>${escapeHtml(area.name)}</h3>${area.description ? `<p>${escapeHtml(area.description)}</p>` : ''}
    <span class="area-footnote">${count} ${count === 1 ? 'activity' : 'activities'} recorded</span>
  </article>`;
}

function renderRecentActivity(activity, areas, goals) {
  const area = areas.find(({ id }) => id === activity.areaId);
  const goal = activity.goalId == null ? null : goals.find(({ id }) => id === activity.goalId);
  const date = parseCalendarDate(activity.occurredOn);
  const dateHtml = date
    ? `<time datetime="${escapeHtml(activity.occurredOn)}">${escapeHtml(date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }))}</time>`
    : '<span>Date unavailable</span>';
  return `<li class="recent-item"><div><h3>${escapeHtml(activity.title)}</h3>
    <p class="recent-meta">${escapeHtml(area?.name ?? 'Growth area unavailable')}</p>
    ${goal ? `<p class="recent-meta">Goal: ${escapeHtml(goal.title)}</p>` : ''}</div>${dateHtml}</li>`;
}

// Supplied records are the only source of dashboard values. The router owns data selection.
export function renderOverview({ areas = [], goals = [], activities = [] } = {}, { sample = false, now = new Date() } = {}) {
  const summary = summarizeOverview({ areas, goals, activities }, now);
  const visibleAreas = areas.filter(({ archivedAt }) => archivedAt == null);
  const recent = sortRecentActivities(activities).slice(0, 5);
  return `
    <div class="page-heading"><p class="eyebrow">THE BIG PICTURE</p><h1>Your progress, at a glance<span>.</span></h1><p>A space for what you’ve done, and where it’s taking you.</p></div>
    <div class="foundation-note"><span class="status-dot" aria-hidden="true"></span><p>${sample ? 'Sample data only. These illustrative activities and goals are not your accomplishments. Nothing is saved.' : 'Your workspace starts empty. Activity logging and goal tracking are coming in future milestones.'}</p><span class="small-tag">${sample ? 'Sample data' : 'Personal workspace'}</span><a class="text-link" href="${sample ? '?' : '?sample'}#/overview">${sample ? 'Exit sample view' : 'Explore sample data'}</a></div>
    <section class="summary-grid" aria-label="${sample ? 'Sample progress summary' : 'Progress summary'}">
      ${[
        ['activity', 'Activities this week', summary.weeklyActivities, 'Monday–Sunday · local calendar'],
        ['goals', 'Active goals', summary.activeGoals, goals.length ? 'A little direction for your effort' : 'No goals yet'],
        ['leaf', 'Growth areas', summary.growthAreas, 'Current, unarchived areas'],
      ].map(([symbol, title, value, description]) => `<article class="ui-card summary-card"><div class="summary-label"><span>${title}</span>${icon(symbol)}</div><p class="summary-value">${value}</p><p class="muted">${description}</p></article>`).join('')}
    </section>
    <section class="growth-section" aria-labelledby="growth-title">
      <div class="section-heading"><div><h2 id="growth-title">Room to grow</h2><p>The different parts of your journey, in one place.</p></div>${sample ? '<span class="small-tag">Sample areas</span>' : ''}</div>
      ${visibleAreas.length ? `<div class="growth-grid">${visibleAreas.map(area => renderArea(area, activities)).join('')}</div>` : renderEmptyState({ id: 'empty-areas', title: 'Room for a fresh start', message: 'No growth areas yet. Your areas will appear here when they are available.', iconName: 'leaf' })}
    </section>
    <section class="recent-section" aria-labelledby="recent-title">
      <div class="section-heading"><div><h2 id="recent-title">Recent activity</h2><p>${sample ? 'Illustrative completed work, newest first.' : 'Your completed work will find a home here.'}</p></div><a class="text-link" href="#/activity">View activity ${icon('arrow')}</a></div>
      ${recent.length ? `<ul class="recent-list ui-card">${recent.map(activity => renderRecentActivity(activity, areas, goals)).join('')}</ul>` : renderEmptyState({ id: 'empty-activities', title: 'A fresh start', message: 'No activities recorded yet. When activity logging arrives, this space will tell your story.', iconName: 'activity' })}
    </section>`;
}
