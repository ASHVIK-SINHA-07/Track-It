import { icon } from '../components/icons.js';
import { escapeHtml, renderEmptyState } from '../components/ui.js';
import { parseCalendarDate, sortRecentActivities, summarizeOverview } from '../data/overview.js';

const allowedColors = ['sage', 'blue', 'purple', 'sand', 'rose'];
const allowedIcons = ['overview', 'activity', 'goals', 'leaf', 'check'];

function renderArea(area, activities) {
  let count = 0;
  for (const activity of activities) {
    if (activity.areaId === area.id) {
      count += 1;
    }
  }

  // Only known CSS colors and icon names may be inserted into the markup.
  let color = 'sage';
  if (allowedColors.includes(area.color)) color = area.color;
  let iconName = 'leaf';
  if (allowedIcons.includes(area.icon)) iconName = area.icon;
  let descriptionHtml = '';
  if (area.description) descriptionHtml = `<p>${escapeHtml(area.description)}</p>`;
  let activityLabel = 'activities';
  if (count === 1) activityLabel = 'activity';

  return `<article class="ui-card growth-card ${color}">
    <span class="area-number">${icon(iconName)}</span>
    <h3>${escapeHtml(area.name)}</h3>${descriptionHtml}
    <span class="area-footnote">${count} ${activityLabel} recorded</span>
  </article>`;
}

function renderRecentActivity(activity, areas, goals) {
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
      if (goal.id === activity.goalId) {
        goalHtml = `<p class="recent-meta">Goal: ${escapeHtml(goal.title)}</p>`;
        break;
      }
    }
  }

  const date = parseCalendarDate(activity.occurredOn);
  let dateHtml = '<span>Date unavailable</span>';
  if (date) {
    const dateLabel = date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    dateHtml = `<time datetime="${escapeHtml(activity.occurredOn)}">${escapeHtml(dateLabel)}</time>`;
  }
  return `<li class="recent-item"><div><h3>${escapeHtml(activity.title)}</h3>
    <p class="recent-meta">${escapeHtml(areaName)}</p>${goalHtml}</div>${dateHtml}</li>`;
}

function renderSummaryCard(iconName, title, value, description) {
  return `<article class="ui-card summary-card"><div class="summary-label"><span>${title}</span>${icon(iconName)}</div><p class="summary-value">${value}</p><p class="muted">${description}</p></article>`;
}

// The router supplies data. This view does not choose or modify the records.
export function renderOverview(data = {}, options = {}) {
  const areas = data.areas || [];
  const goals = data.goals || [];
  const activities = data.activities || [];
  const now = options.now || new Date();
  const summary = summarizeOverview(data, now);
  const recentActivities = sortRecentActivities(activities).slice(0, 5);

  let workspaceMessage = 'Your activities are temporary and disappear on refresh. Starter growth areas are ready for logging.';
  let workspaceBadge = 'Personal workspace';
  let sampleLink = '?sample#/overview';
  let sampleLinkLabel = 'Explore sample data';
  let summaryLabel = 'Progress summary';
  let areasBadgeHtml = '';
  let recentDescription = 'Your completed work will find a home here.';
  if (options.sample) {
    workspaceMessage = 'Sample data only. These illustrative activities and goals are not your accomplishments. Nothing is saved.';
    workspaceBadge = 'Sample data';
    sampleLink = '?#/overview';
    sampleLinkLabel = 'Exit sample view';
    summaryLabel = 'Sample progress summary';
    areasBadgeHtml = '<span class="small-tag">Sample areas</span>';
    recentDescription = 'Illustrative completed work, newest first.';
  }

  let goalsDescription = 'No goals yet';
  if (goals.length > 0) goalsDescription = 'A little direction for your effort';
  let summaryHtml = renderSummaryCard('activity', 'Activities this week', summary.weeklyActivities, 'Monday–Sunday · local calendar');
  summaryHtml += renderSummaryCard('goals', 'Active goals', summary.activeGoals, goalsDescription);
  summaryHtml += renderSummaryCard('leaf', 'Growth areas', summary.growthAreas, 'Current, unarchived areas');

  let areaCardsHtml = '';
  for (const area of areas) {
    if (area.archivedAt == null) {
      areaCardsHtml += renderArea(area, activities);
    }
  }
  let growthHtml = renderEmptyState({
    id: 'empty-areas', title: 'Room for a fresh start',
    message: 'No growth areas yet. Your areas will appear here when they are available.', iconName: 'leaf',
  });
  if (areaCardsHtml !== '') {
    growthHtml = `<div class="growth-grid">${areaCardsHtml}</div>`;
  }

  let recentHtml = renderEmptyState({
    id: 'empty-activities', title: 'A fresh start',
    message: 'No activities recorded yet. Open Activity to log completed work in this temporary workspace.', iconName: 'activity',
  });
  if (recentActivities.length > 0) {
    let itemsHtml = '';
    for (const activity of recentActivities) {
      itemsHtml += renderRecentActivity(activity, areas, goals);
    }
    recentHtml = `<ul class="recent-list ui-card">${itemsHtml}</ul>`;
  }

  return `
    <div class="page-heading"><p class="eyebrow">THE BIG PICTURE</p><h1>Your progress, at a glance<span>.</span></h1><p>A space for what you’ve done, and where it’s taking you.</p></div>
    <div class="foundation-note"><span class="status-dot" aria-hidden="true"></span><p>${workspaceMessage}</p><span class="small-tag">${workspaceBadge}</span><a class="text-link" href="${sampleLink}">${sampleLinkLabel}</a></div>
    <section class="summary-grid" aria-label="${summaryLabel}">${summaryHtml}</section>
    <section class="growth-section" aria-labelledby="growth-title">
      <div class="section-heading"><div><h2 id="growth-title">Room to grow</h2><p>The different parts of your journey, in one place.</p></div>${areasBadgeHtml}</div>
      ${growthHtml}
    </section>
    <section class="recent-section" aria-labelledby="recent-title">
      <div class="section-heading"><div><h2 id="recent-title">Recent activity</h2><p>${recentDescription}</p></div><a class="text-link" href="#/activity">View activity ${icon('arrow')}</a></div>
      ${recentHtml}
    </section>`;
}
