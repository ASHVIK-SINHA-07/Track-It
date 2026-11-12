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
    if (!parseCalendarDate(targetDate)) {
      errors.targetDate = 'Enter a valid calendar date, or leave it blank.';
    }
  }

  return {
    errors: errors,
    value: { title: title, areaId: areaId, description: description, targetDate: targetDate },
  };
}
