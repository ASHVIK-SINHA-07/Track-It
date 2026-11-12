import { escapeHtml, renderButton, renderEmptyState, renderField } from '../components/ui.js';
import { GOAL_LIMITS } from '../data/goals.js';
import { parseCalendarDate } from '../data/overview.js';

function getStatusLabel(status) {
  if (status === 'not_started') return 'Not started';
  if (status === 'in_progress') return 'In progress';
  if (status === 'completed') return 'Completed';
  if (status === 'archived') return 'Archived';
  return 'Status unavailable';
}

function renderGoalCard(goal, areas) {
  let areaName = 'Growth area unavailable';
  for (const area of areas) {
    if (area.id === goal.areaId) {
      areaName = area.name;
      break;
    }
  }

  let descriptionHtml = '';
  if (goal.description) {
    // Keep the card short; the full description remains in the workspace.
    let description = goal.description;
    if (description.length > 200) {
      description = description.slice(0, 200) + '…';
    }
    descriptionHtml = `<p class="recent-meta">${escapeHtml(description)}</p>`;
  }

  let targetDateHtml = '';
  if (goal.targetDate) {
    const date = parseCalendarDate(goal.targetDate);
    targetDateHtml = '<p class="recent-meta">Target date unavailable</p>';
    if (date) {
      const label = date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      targetDateHtml = `<p class="recent-meta">Target: <time datetime="${escapeHtml(goal.targetDate)}">${escapeHtml(label)}</time></p>`;
    }
  }

  return `<article class="ui-card"><h3>${escapeHtml(goal.title)}</h3>
    <p class="recent-meta">${escapeHtml(areaName)}</p>
    <p class="recent-meta">Status: ${getStatusLabel(goal.status)}</p>
    ${targetDateHtml}${descriptionHtml}</article>`;
}

export function renderGoalList(data = {}) {
  const areas = data.areas || [];
  const goals = data.goals || [];
  if (goals.length === 0) {
    return renderEmptyState({
      id: 'goals-empty-title', iconName: 'goals',
      title: 'Make space for what matters.',
      message: 'No goals yet. Create a goal to give your effort a direction.',
      detail: 'Goals are temporary and disappear on refresh.',
      action: { label: 'Back to overview', href: '#/overview' },
    });
  }

  let cardsHtml = '';
  for (const goal of goals) {
    cardsHtml += renderGoalCard(goal, areas);
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

export function renderGoalForm(data = {}) {
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

  return `<form id="create-goal-form" class="ui-stack" novalidate>
    ${renderField({ id: 'goal-title', name: 'title', label: 'Goal title', required: true, maxLength: GOAL_LIMITS.title, hint: 'Up to ' + GOAL_LIMITS.title + ' characters.' })}
    ${renderField({ id: 'goal-area', name: 'areaId', type: 'select', label: 'Growth area', required: true, options: areaOptions, hint: areaHint })}
    ${renderField({ id: 'goal-description', name: 'description', type: 'textarea', label: 'Description (optional)', maxLength: GOAL_LIMITS.description, hint: 'Up to ' + GOAL_LIMITS.description + ' characters.' })}
    ${renderField({ id: 'goal-date', name: 'targetDate', type: 'date', label: 'Target date (optional)' })}
    <p class="ui-hint">New goals start with the status Not started.</p>
    ${renderButton({ label: 'Add temporary goal', type: 'submit' })}
  </form>`;
}
