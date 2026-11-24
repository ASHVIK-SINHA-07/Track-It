import { escapeHtml, renderButton, renderEmptyState, renderField } from '../components/ui.js';
import { GOAL_LIMITS, sortGoals } from '../data/goals.js';
import { parseCalendarDate } from '../data/overview.js';

export function getStatusLabel(status) {
  if (status === 'not_started') return 'Not started';
  if (status === 'in_progress') return 'In progress';
  if (status === 'completed') return 'Completed';
  if (status === 'archived') return 'Archived';
  return 'Status unavailable';
}

export function getGoalAreaName(goal, areas) {
  for (const area of areas) {
    if (area.id === goal.areaId) {
      return area.name;
    }
  }
  return 'Growth area unavailable';
}

export function renderGoalTargetDate(targetDate) {
  if (!targetDate) return '';
  const date = parseCalendarDate(targetDate);
  if (!date) return '<p class="recent-meta">Target date unavailable</p>';
  const label = date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  return `<p class="recent-meta">Target: <time datetime="${escapeHtml(targetDate)}">${escapeHtml(label)}</time></p>`;
}

function renderGoalCard(goal, areas) {
  let descriptionHtml = '';
  if (goal.description) {
    // Keep the card short; the full description remains in the workspace.
    let description = goal.description;
    if (description.length > 200) {
      description = description.slice(0, 200) + '…';
    }
    descriptionHtml = `<p class="recent-meta">${escapeHtml(description)}</p>`;
  }

  let titleHtml = escapeHtml(goal.title);
  if (goal.id) {
    titleHtml = `<a class="goal-title-link" href="#/goals/${escapeHtml(encodeURIComponent(goal.id))}">${titleHtml}</a>`;
  }
  return `<article class="ui-card"><h3>${titleHtml}</h3>
    <p class="recent-meta">${escapeHtml(getGoalAreaName(goal, areas))}</p>
    <p class="recent-meta"><span class="small-tag">Status: ${getStatusLabel(goal.status)}</span></p>
    ${renderGoalTargetDate(goal.targetDate)}${descriptionHtml}</article>`;
}

export function renderGoalList(data = {}) {
  const areas = data.areas || [];
  const goals = data.goals || [];
  if (goals.length === 0) {
    return renderEmptyState({
      id: 'goals-empty-title', iconName: 'goals',
      title: 'No goals yet',
      message: 'Set a goal for a growth area, then link activities to it as you make progress.',
      button: { label: 'Create Goal', id: 'create-goal-empty' },
    });
  }

  let cardsHtml = '';
  let archivedHtml = '';
  for (const goal of sortGoals(goals)) {
    const card = renderGoalCard(goal, areas);
    if (goal.status === 'archived') {
      archivedHtml += card;
    } else {
      cardsHtml += card;
    }
  }
  if (archivedHtml) {
    cardsHtml += `<section class="ui-stack" aria-labelledby="archived-goals-title"><h2 id="archived-goals-title">Archived goals</h2>${archivedHtml}</section>`;
  }
  return `<div class="ui-stack">${cardsHtml}</div>`;
}

export function renderGoals(data = {}, options = {}) {
  let message = 'Create goals in your temporary personal workspace.';
  let badge = 'Temporary goals';
  if (options.sample) {
    message = 'Sample workspace. Illustrative goals and any goals you add here stay separate from your personal workspace.';
    badge = 'Sample data';
  }

  return `<div class="page-heading"><p class="eyebrow">A SENSE OF DIRECTION</p><h1>Goals<span>.</span></h1><p>Give your everyday effort something meaningful to connect to.</p></div>
    <div class="foundation-note"><span class="status-dot" aria-hidden="true"></span><p>${message} Entries are held in memory only and disappear on refresh.</p><span class="small-tag">${badge}</span></div>
    <div class="section-heading activity-heading"><div><h2 id="goals-list-title">Your goals</h2><p>A little direction for your effort.</p></div>${renderButton({ label: 'Create Goal', id: 'create-goal' })}</div>
    <p id="goals-status" class="ui-hint" role="status"></p>
    <section id="goals-list" aria-labelledby="goals-list-title">${renderGoalList(data)}</section>`;
}

export function renderGoalForm(data = {}, goal = null) {
  let areaHtml = '';
  let statusHint = '';
  let submitLabel = 'Save changes';
  if (!goal) {
    areaHtml = renderGoalAreaField(data);
    statusHint = '<p class="ui-hint">New goals start with the status Not started.</p>';
    submitLabel = 'Add temporary goal';
  }

  return `<form id="${goal ? 'edit-goal-form' : 'create-goal-form'}" class="ui-stack" novalidate>
    ${renderField({ id: 'goal-title', name: 'title', label: 'Goal title', required: true, value: goal?.title, maxLength: GOAL_LIMITS.title, hint: 'Up to ' + GOAL_LIMITS.title + ' characters.' })}
    ${areaHtml}
    ${renderField({ id: 'goal-description', name: 'description', type: 'textarea', label: 'Description (optional)', value: goal?.description, maxLength: GOAL_LIMITS.description, hint: 'Up to ' + GOAL_LIMITS.description + ' characters.' })}
    ${renderField({ id: 'goal-date', name: 'targetDate', type: 'date', label: 'Target date (optional)', value: goal?.targetDate ?? '' })}
    ${statusHint}
    ${goal ? '<p class="ui-error" role="alert"></p>' : ''}
    ${renderButton({ label: submitLabel, type: 'submit' })}
  </form>`;
}

function renderGoalAreaField(data) {
  const areas = data.areas || [];
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

  return renderField({ id: 'goal-area', name: 'areaId', type: 'select', label: 'Growth area', required: true, options: areaOptions, hint: areaHint });
}
