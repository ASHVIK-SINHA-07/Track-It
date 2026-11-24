import { parseCalendarDate } from './overview.js';

export const ACTIVITY_LIMITS = Object.freeze({ title: 160, note: 4000 });

export function filterActivities(activities, filters = {}) {
  const query = (filters.query || '').trim().toLowerCase();
  const matching = [];
  for (const activity of activities) {
    if (filters.areaId && activity.areaId !== filters.areaId) continue;
    if (filters.goalId && activity.goalId !== filters.goalId) continue;
    if ((filters.from || filters.to) && !parseCalendarDate(activity.occurredOn)) continue;
    if (filters.from && activity.occurredOn < filters.from) continue;
    if (filters.to && activity.occurredOn > filters.to) continue;
    if (query && !activity.title.toLowerCase().includes(query) && !(activity.note || '').toLowerCase().includes(query)) continue;
    matching.push(activity);
  }
  return matching;
}

export function localDateValue(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

export function availableGoals(goals, areaId) {
  const matchingGoals = [];
  for (const goal of goals) {
    const canLink = goal.status === 'not_started' || goal.status === 'in_progress';
    if (goal.areaId === areaId && canLink) {
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

export function validateActivity(input, data = {}, original = null) {
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

  let activeArea = false;
  let existingArea = false;
  for (const area of areas) {
    if (area.id === areaId) {
      activeArea = area.archivedAt == null;
      existingArea = original?.areaId === areaId;
      break;
    }
  }
  if (!activeArea && !existingArea) {
    errors.areaId = 'Choose an available growth area.';
  }

  if (occurredOn.startsWith('0000-') || !parseCalendarDate(occurredOn)) {
    errors.occurredOn = 'Enter a valid calendar date.';
  }

  if (goalId !== null) {
    let goalIsValid = existingArea && original.goalId === goalId
      && goals.some(goal => goal.id === goalId && goal.areaId === areaId);
    const eligibleGoals = activeArea ? availableGoals(goals, areaId) : [];
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
