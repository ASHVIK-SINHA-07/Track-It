import { createStarterAreas, validateArea } from './areas.js';
import { createMockOverview } from './mock.js';
import { validateActivity } from './activity.js';
import { findGoal, goalStatusOptions, validateGoal, validateGoalDetails } from './goals.js';
import { createBackup, parseBackup } from './backup.js';
import * as storage from '../storage/indexed-db.js';

function newRecordId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let id = '';
  for (const byte of bytes) id += byte.toString(16).padStart(2, '0');
  return id;
}

export async function loadWorkspace() {
  await storage.initializeWorkspace(createStarterAreas());
  const data = await storage.readWorkspace();
  const personalData = { areas: data.areas, goals: data.goals, activities: data.activities, settings: data.settings };
  return createWorkspace({ personalData: personalData, revision: data.revision });
}

export function createWorkspace(options = {}) {
  const now = options.now || new Date();
  const persistent = Boolean(options.personalData);
  const personalData = options.personalData || {
    areas: createStarterAreas(now), goals: [], activities: [], settings: [],
  };
  const sampleData = createMockOverview(now);
  let nextActivityNumber = 0;
  let nextGoalNumber = 0;
  let nextAreaNumber = 0;
  let pendingWrite = Promise.resolve();
  let queuedWrites = 0;
  let revision = options.revision;

  function getCollection(mode) {
    if (mode === 'personal') return personalData;
    if (mode === 'sample') return sampleData;
    throw new Error('Unknown workspace mode');
  }

  function getData(mode = 'personal') {
    return structuredClone(getCollection(mode));
  }

  function writesToDisk(mode) {
    return persistent && mode === 'personal';
  }

  function write(mode, operation) {
    if (!writesToDisk(mode)) return operation();
    // Validate and write in order, and let later operations retry after a failure.
    queuedWrites += 1;
    const result = pendingWrite.then(operation);
    function finishWrite() { queuedWrites -= 1; }
    pendingWrite = result.then(finishWrite, finishWrite);
    return result;
  }

  function save(mode, store, record, apply) {
    if (writesToDisk(mode)) {
      return storage.saveWorkspaceRecord(store, record, revision).then(function applySavedRecord(nextRevision) {
        revision = nextRevision;
        return apply();
      });
    }
    return apply();
  }

  function addActivity(input, mode = 'personal', date = new Date()) {
    return write(mode, function createActivity() {
      const data = getCollection(mode);
      const result = validateActivity(input, data);
      if (Object.keys(result.errors).length) return result;

      const timestamp = date.toISOString();
      const activity = {
        id: writesToDisk(mode) ? newRecordId() : 'temporary-' + ++nextActivityNumber,
        ...result.value,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      return save(mode, 'activities', activity, function addToHistory() {
        data.activities.push(activity);
        return { errors: {}, activity: structuredClone(activity) };
      });
    });
  }

  function addGoal(input, mode = 'personal', date = new Date()) {
    return write(mode, function createGoal() {
      const data = getCollection(mode);
      const result = validateGoal(input, data);
      if (Object.keys(result.errors).length) return result;

      const timestamp = date.toISOString();
      const goal = {
        id: writesToDisk(mode) ? newRecordId() : 'temporary-goal-' + ++nextGoalNumber,
        ...result.value,
        status: 'not_started',
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      return save(mode, 'goals', goal, function addToGoals() {
        data.goals.push(goal);
        return { errors: {}, goal: structuredClone(goal) };
      });
    });
  }

  function updateActivity(id, input, mode = 'personal', date = new Date()) {
    return write(mode, function editActivity() {
      const data = getCollection(mode);
      const activity = data.activities.find(record => record.id === id);
      if (!activity) return { errors: { activity: 'This activity is unavailable.' } };

      const result = validateActivity(input, data, activity);
      if (Object.keys(result.errors).length) return result;
      const updated = { ...activity, ...result.value, updatedAt: date.toISOString() };
      return save(mode, 'activities', updated, function applyEdit() {
        Object.assign(activity, updated);
        return { errors: {}, activity: structuredClone(activity) };
      });
    });
  }

  function deleteActivity(id, mode = 'personal') {
    return write(mode, function removeActivity() {
      const activities = getCollection(mode).activities;
      const index = activities.findIndex(record => record.id === id);
      if (index === -1) return { errors: { activity: 'This activity is unavailable.' } };
      function removeFromHistory() {
        activities.splice(index, 1);
        return { errors: {} };
      }
      if (writesToDisk(mode)) {
        return storage.deleteWorkspaceActivity(id, revision).then(function applyDeletion(nextRevision) {
          revision = nextRevision;
          return removeFromHistory();
        });
      }
      return removeFromHistory();
    });
  }

  function updateGoal(goalId, input, mode = 'personal', date = new Date()) {
    return write(mode, function editGoal() {
      const goal = findGoal(getCollection(mode).goals, goalId);
      if (!goal) return { errors: { goal: 'This goal is unavailable.' } };

      const result = validateGoalDetails(input);
      if (Object.keys(result.errors).length) return result;
      const updated = { ...goal, ...result.value, updatedAt: date.toISOString() };
      return save(mode, 'goals', updated, function applyEdit() {
        Object.assign(goal, updated);
        return { errors: {}, goal: structuredClone(goal) };
      });
    });
  }

  function changeGoalStatus(goalId, status, mode = 'personal', date = new Date()) {
    return write(mode, function changeStatus() {
      const goal = findGoal(getCollection(mode).goals, goalId);
      if (!goal) return { errors: { goal: 'This goal is unavailable.' } };
      if (!goalStatusOptions(goal.status).includes(status)) {
        return { errors: { status: 'Choose an available status for this goal.' } };
      }
      const updated = { ...goal, status: status, updatedAt: date.toISOString() };
      return save(mode, 'goals', updated, function applyStatus() {
        Object.assign(goal, updated);
        return { errors: {}, goal: structuredClone(goal) };
      });
    });
  }

  function saveArea(input, id = null, mode = 'personal', date = new Date()) {
    return write(mode, function editArea() {
      const areas = getCollection(mode).areas;
      const area = id === null ? null : areas.find(record => record.id === id);
      if (id !== null && !area) return { errors: { area: 'This growth area is unavailable.' } };
      const result = validateArea(input);
      if (Object.keys(result.errors).length) return result;
      if (areas.some(record => record.id !== id && record.name.toLowerCase() === result.value.name.toLowerCase())) {
        return { errors: { name: 'A growth area already uses this name.' } };
      }
      const timestamp = date.toISOString();
      const updated = area ? { ...area } : {
        id: writesToDisk(mode) ? newRecordId() : 'temporary-area-' + ++nextAreaNumber,
        description: '', createdAt: timestamp, archivedAt: null,
      };
      Object.assign(updated, result.value, { updatedAt: timestamp });
      return save(mode, 'areas', updated, function applyArea() {
        if (area) Object.assign(area, updated);
        else areas.push(updated);
        return { errors: {}, area: structuredClone(updated) };
      });
    });
  }

  function archiveArea(id, mode = 'personal', date = new Date()) {
    return write(mode, function archiveGrowthArea() {
      const area = getCollection(mode).areas.find(record => record.id === id);
      if (!area || area.archivedAt != null) return { errors: { area: 'This active growth area is unavailable.' } };
      const timestamp = date.toISOString();
      const updated = { ...area, archivedAt: timestamp, updatedAt: timestamp };
      return save(mode, 'areas', updated, function applyArchive() {
        Object.assign(area, updated);
        return { errors: {}, area: structuredClone(area) };
      });
    });
  }

  async function exportBackup(mode = 'personal') {
    if (!writesToDisk(mode)) throw new Error('Open the personal workspace to export a backup.');
    await pendingWrite;
    return createBackup(await storage.readWorkspace());
  }

  async function restoreBackup(text, mode = 'personal') {
    if (!writesToDisk(mode)) throw new Error('Open the personal workspace to restore a backup.');
    return write(mode, async function restore() {
      const data = parseBackup(text);
      revision = await storage.replaceWorkspace(data, revision);
      Object.assign(personalData, data);
    });
  }

  return {
    getData: getData,
    whenIdle: function whenIdle() { return queuedWrites ? pendingWrite : null; },
    addActivity: addActivity,
    updateActivity: updateActivity,
    deleteActivity: deleteActivity,
    addGoal: addGoal,
    updateGoal: updateGoal,
    changeGoalStatus: changeGoalStatus,
    saveArea: saveArea,
    archiveArea: archiveArea,
    exportBackup: exportBackup,
    restoreBackup: restoreBackup,
  };
}
