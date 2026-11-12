import { parseCalendarDate } from './overview.js';

export const ACTIVITY_LIMITS = Object.freeze({ title: 160, note: 4000 });

export function localDateValue(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

export function availableGoals(goals, areaId) {
  const matchingGoals = [];
  for (const goal of goals) {
    if (goal.areaId === areaId && goal.status !== 'archived') {
      matchingGoals.push(goal);
    }
  }
  return matchingGoals;
}

function getText(value) {
  if (value === undefined || value === null) {
    return '';
  }
  return String(value);
}

export function validateActivity(input, data = {}) {
  const areas = data.areas || [];
  const goals = data.goals || [];
  const enteredTitle = getText(input.title);
  const title = enteredTitle.trim();
  const note = getText(input.note);
  const areaId = getText(input.areaId);
  const occurredOn = getText(input.occurredOn);
  const duration = getText(input.durationMinutes).trim();
  const errors = {};

  let goalId = getText(input.goalId);
  if (goalId === '') {
    goalId = null;
  }

  if (title === '') {
    errors.title = 'Enter an activity title.';
  } else if (enteredTitle.length > ACTIVITY_LIMITS.title) {
    errors.title = 'Use ' + ACTIVITY_LIMITS.title + ' characters or fewer.';
  }

  if (note.length > ACTIVITY_LIMITS.note) {
    errors.note = 'Use ' + ACTIVITY_LIMITS.note + ' characters or fewer.';
  }

  let areaIsValid = false;
  for (const area of areas) {
    // == null accepts both a missing archive date and an explicit null.
    if (area.id === areaId && area.archivedAt == null) {
      areaIsValid = true;
      break;
    }
  }
  if (!areaIsValid) {
    errors.areaId = 'Choose an available growth area.';
  }

  if (!parseCalendarDate(occurredOn)) {
    errors.occurredOn = 'Enter a valid calendar date.';
  }

  if (goalId !== null) {
    let goalIsValid = false;
    const eligibleGoals = availableGoals(goals, areaId);
    for (const goal of eligibleGoals) {
      if (goal.id === goalId) {
        goalIsValid = true;
        break;
      }
    }
    if (!goalIsValid) {
      errors.goalId = 'Choose an available goal from the selected growth area, or leave it unconnected.';
    }
  }

  let durationMinutes = null;
  if (duration !== '') {
    durationMinutes = Number(duration);
    // This pattern accepts digits only, excluding decimals and negative numbers.
    const containsOnlyDigits = /^\d+$/.test(duration);
    if (!containsOnlyDigits || !Number.isSafeInteger(durationMinutes)) {
      errors.durationMinutes = 'Enter a nonnegative whole number of minutes, or leave it blank.';
    }
  }

  return {
    errors: errors,
    value: {
      title: title,
      areaId: areaId,
      goalId: goalId,
      occurredOn: occurredOn,
      durationMinutes: durationMinutes,
      note: note,
    },
  };
}
