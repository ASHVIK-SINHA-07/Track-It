import { parseCalendarDate } from './overview.js';

export const GOAL_LIMITS = Object.freeze({ title: 160, description: 4000 });

function getText(value) {
  if (value === undefined || value === null) {
    return '';
  }
  return String(value);
}

export function validateGoalDetails(input) {
  const enteredTitle = getText(input.title);
  const title = enteredTitle.trim();
  const description = getText(input.description);
  const enteredDate = getText(input.targetDate).trim();
  const errors = {};

  if (title === '') {
    errors.title = 'Enter a goal title.';
  } else if (enteredTitle.length > GOAL_LIMITS.title) {
    errors.title = 'Use ' + GOAL_LIMITS.title + ' characters or fewer.';
  }
  if (description.length > GOAL_LIMITS.description) {
    errors.description = 'Use ' + GOAL_LIMITS.description + ' characters or fewer.';
  }

  let targetDate = null;
  if (enteredDate !== '') {
    targetDate = enteredDate;
    if (targetDate.startsWith('0000-') || !parseCalendarDate(targetDate)) {
      errors.targetDate = 'Enter a valid calendar date, or leave it blank.';
    }
  }

  return {
    errors: errors,
    value: { title: title, description: description, targetDate: targetDate },
  };
}

export function validateGoal(input, data = {}) {
  const result = validateGoalDetails(input);
  const areaId = getText(input.areaId);
  const areas = data.areas || [];
  result.value.areaId = areaId;

  for (const area of areas) {
    if (area.id === areaId && area.archivedAt == null) {
      return result;
    }
  }
  result.errors.areaId = 'Choose an available growth area.';
  return result;
}

export function findGoal(goals, goalId) {
  for (const goal of goals) {
    if (goal.id === goalId) return goal;
  }
  return null;
}

export function goalStatusOptions(status) {
  if (status === 'not_started' || status === 'completed') return ['in_progress', 'archived'];
  if (status === 'in_progress') return ['completed', 'archived'];
  if (status === 'archived') return ['not_started', 'in_progress', 'completed'];
  return [];
}

function compareGoals(first, second) {
  const firstArchived = first.status === 'archived';
  const secondArchived = second.status === 'archived';
  if (firstArchived !== secondArchived) {
    return firstArchived ? 1 : -1;
  }

  let firstTime = Date.parse(first.createdAt);
  let secondTime = Date.parse(second.createdAt);
  if (Number.isNaN(firstTime)) firstTime = -Infinity;
  if (Number.isNaN(secondTime)) secondTime = -Infinity;
  if (firstTime > secondTime) return -1;
  if (firstTime < secondTime) return 1;
  return 0;
}

export function sortGoals(goals) {
  const sortedGoals = goals.slice();
  sortedGoals.sort(compareGoals);
  return sortedGoals;
}
