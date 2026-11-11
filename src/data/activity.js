import { parseCalendarDate } from './overview.js';

export const ACTIVITY_LIMITS = Object.freeze({ title: 160, note: 4000 });

export function localDateValue(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function availableGoals(goals, areaId) {
  return goals.filter(goal => goal.areaId === areaId);
}

export function validateActivity(input, { areas = [], goals = [] } = {}) {
  const text = key => String(input[key] ?? '');
  const title = text('title').trim();
  const note = text('note');
  const areaId = text('areaId');
  const goalId = text('goalId') || null;
  const occurredOn = text('occurredOn');
  const duration = text('durationMinutes').trim();
  const errors = {};
  if (!title) errors.title = 'Enter an activity title.';
  else if (text('title').length > ACTIVITY_LIMITS.title) errors.title = `Use ${ACTIVITY_LIMITS.title} characters or fewer.`;
  if (note.length > ACTIVITY_LIMITS.note) errors.note = `Use ${ACTIVITY_LIMITS.note} characters or fewer.`;
  if (!areas.some(area => area.id === areaId && area.archivedAt == null)) errors.areaId = 'Choose an available growth area.';
  if (!parseCalendarDate(occurredOn)) errors.occurredOn = 'Enter a valid calendar date.';
  if (goalId && !availableGoals(goals, areaId).some(goal => goal.id === goalId)) errors.goalId = 'Choose a goal from the selected growth area, or leave it unconnected.';
  if (duration && (!/^\d+$/.test(duration) || !Number.isSafeInteger(Number(duration)))) errors.durationMinutes = 'Enter a nonnegative whole number of minutes, or leave it blank.';
  return {
    errors,
    value: { title, areaId, goalId, occurredOn, durationMinutes: duration ? Number(duration) : null, note },
  };
}
