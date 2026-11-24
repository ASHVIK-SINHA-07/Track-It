import { validateActivity } from './activity.js';
import { validateArea } from './areas.js';
import { validateGoalDetails } from './goals.js';

const formatVersion = 1;
const goalStatuses = ['not_started', 'in_progress', 'completed', 'archived'];

function isRecord(value) {
  return value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;
}

function isTimestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return false;
  if (!Number.isFinite(Date.parse(value))) return false;
  const day = value.slice(0, 10);
  return new Date(day + 'T00:00:00.000Z').toISOString().slice(0, 10) === day;
}

function isKey(value) {
  if (typeof value !== 'string' || !value || value.trim() !== value) return false;
  try {
    encodeURIComponent(value);
    return true;
  } catch {
    return false;
  }
}

function indexRecords(records, label, field = 'id') {
  if (!Array.isArray(records)) throw new Error('The backup must contain a ' + label + ' list.');
  const index = new Map();
  for (const record of records) {
    if (!isRecord(record) || !isKey(record[field])) {
      throw new Error('The ' + label + ' list contains an invalid ' + field + '.');
    }
    if (index.has(record[field])) throw new Error('The ' + label + ' list contains a duplicate ' + field + '.');
    if (field === 'id' && (!isTimestamp(record.createdAt) || !isTimestamp(record.updatedAt))) {
      throw new Error('The ' + label + ' list contains invalid timestamps.');
    }
    index.set(record[field], record);
  }
  return index;
}

function checkSettings(settings) {
  const index = indexRecords(settings, 'settings', 'key');
  for (const setting of index.values()) {
    if (setting.key === 'workspace-initialized' || !isJsonValue(setting.value)) {
      throw new Error('The backup contains an invalid setting.');
    }
  }
}

function isJsonValue(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (isRecord(value)) return Object.values(value).every(isJsonValue);
  return false;
}

function validateBackup(backup) {
  if (!isRecord(backup) || backup.formatVersion !== formatVersion) {
    throw new Error('This file is not a supported Track-It backup (version 1).');
  }
  if (!isTimestamp(backup.exportedAt)) throw new Error('The backup export timestamp is invalid.');

  const areas = indexRecords(backup.areas, 'growth areas');
  for (const area of areas.values()) {
    if (Object.keys(validateArea(area).errors).length
        || (area.description !== undefined && typeof area.description !== 'string')
        || (area.archivedAt !== null && !isTimestamp(area.archivedAt))) {
      throw new Error('The backup contains an invalid growth area.');
    }
  }

  const goals = indexRecords(backup.goals, 'goals');
  for (const goal of goals.values()) {
    if (!areas.has(goal.areaId)) throw new Error('A goal refers to a missing growth area.');
    const checked = validateGoalDetails(goal);
    if (typeof goal.title !== 'string' || typeof goal.description !== 'string'
        || !goalStatuses.includes(goal.status) || checked.value.targetDate !== goal.targetDate
        || Object.keys(checked.errors).length) {
      throw new Error('The backup contains an invalid goal.');
    }
  }

  for (const activity of indexRecords(backup.activities, 'activities').values()) {
    const area = areas.get(activity.areaId);
    const goal = goals.get(activity.goalId);
    if (!area || (activity.goalId !== null && (!goal || goal.areaId !== activity.areaId))) {
      throw new Error('An activity has an invalid growth area or connected goal.');
    }
    if (typeof activity.title !== 'string' || typeof activity.note !== 'string'
        || (activity.durationMinutes !== null && typeof activity.durationMinutes !== 'number')) {
      throw new Error('The backup contains an invalid activity.');
    }
    const checked = validateActivity(activity, { areas: [area], goals: goal ? [goal] : [] }, activity);
    if (Object.keys(checked.errors).length) throw new Error('The backup contains an invalid activity.');
  }

  checkSettings(backup.settings);
  return { areas: backup.areas, goals: backup.goals, activities: backup.activities, settings: backup.settings };
}

export function parseBackup(text) {
  let backup;
  try {
    backup = JSON.parse(text, function checkNumber(key, value) {
      if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Number out of range');
      return value;
    });
  } catch {
    throw new Error('Choose a valid JSON backup file.');
  }
  return validateBackup(backup);
}

export function createBackup(data, now = new Date()) {
  const backup = {
    formatVersion: formatVersion,
    exportedAt: now.toISOString(),
    areas: data.areas,
    goals: data.goals,
    activities: data.activities,
    settings: data.settings,
  };
  validateBackup(backup);
  return JSON.stringify(backup, null, 2);
}
