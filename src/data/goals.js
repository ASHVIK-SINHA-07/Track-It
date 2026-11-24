import { parseCalendarDate } from './overview.js';

export const GOAL_LIMITS = Object.freeze({ title: 160, description: 4000 });

function getText(value) {
  if (value === undefined || value === null) {
    return '';
  }
  return String(value);
}

export function validateGoal(input, data = {}) {
  const areas = data.areas || [];
  const enteredTitle = getText(input.title);
  const title = enteredTitle.trim();
  const areaId = getText(input.areaId);
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

  let areaIsValid = false;
  for (const area of areas) {
    if (area.id === areaId && area.archivedAt == null) {
      areaIsValid = true;
      break;
    }
  }
  if (!areaIsValid) {
    errors.areaId = 'Choose an available growth area.';
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
    value: { title: title, areaId: areaId, description: description, targetDate: targetDate },
  };
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
