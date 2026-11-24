import assert from 'node:assert/strict';
import test, { afterEach, beforeEach } from 'node:test';
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { createWorkspace, loadWorkspace } from '../src/data/workspace.js';
import { createStarterAreas } from '../src/data/areas.js';
import { filterActivities } from '../src/data/activity.js';
import { parseBackup } from '../src/data/backup.js';
import { summarizeWeek } from '../src/data/overview.js';
import { renderActivityHistory, renderGoalOptions } from '../src/views/activity.js';
import { renderSettings } from '../src/components/settings.js';
import { renderOverview } from '../src/views/overview.js';
import { closeDatabase, readWorkspace, replaceWorkspace, saveRecord } from '../src/storage/indexed-db.js';

const date = new Date('2026-11-25T12:00:00Z');
const areaInput = { name: 'Writing', icon: 'leaf', color: 'sand' };
const goalInput = { title: 'Learn queues', areaId: 'academics' };
const activityInput = { title: 'Practice', areaId: 'academics', occurredOn: '2026-11-24', durationMinutes: 12 };

beforeEach(function freshDatabase() { globalThis.indexedDB = new IDBFactory(); });
afterEach(async function closeConnection() {
  await closeDatabase();
  delete globalThis.indexedDB;
});

test('concurrent first loads seed five areas exactly once and preserve a rename on reopening', async function () {
  const [first, second] = await Promise.all([loadWorkspace(), loadWorkspace()]);
  assert.equal(first.getData().areas.length, 5);
  assert.deepEqual(first.getData(), second.getData());
  assert.equal((await first.saveArea(areaInput, 'academics')).area.id, 'academics');
  await closeDatabase();
  const reopened = await loadWorkspace();
  assert.equal(reopened.getData().areas.length, 5);
  assert.equal(reopened.getData().areas.find(area => area.id === 'academics').name, 'Writing');
});

test('initialization respects databases with existing areas, even without the marker', async function () {
  const area = { ...createStarterAreas(date)[0], name: 'Existing area' };
  await saveRecord('areas', area);
  const workspace = await loadWorkspace();
  assert.deepEqual(workspace.getData().areas, [area]);
  assert.deepEqual((await loadWorkspace()).getData().areas, [area]);
});

test('personal goals, edits, status, and activity links survive connection closure; sample writes stay separate', async function () {
  const workspace = await loadWorkspace();
  const goal = (await workspace.addGoal(goalInput, 'personal', date)).goal;
  const activity = (await workspace.addActivity({ ...activityInput, goalId: goal.id })).activity;
  await workspace.updateGoal(goal.id, { title: 'Study queues', targetDate: '2026-12-01' });
  await workspace.changeGoalStatus(goal.id, 'in_progress');
  await workspace.changeGoalStatus(goal.id, 'archived');
  await workspace.addGoal({ ...goalInput, title: 'Sample only' }, 'sample');
  await workspace.addActivity({ ...activityInput, title: 'Sample entry' }, 'sample');
  assert.ok((await workspace.addActivity({ ...activityInput, goalId: goal.id })).errors.goalId);
  await closeDatabase();
  const data = (await loadWorkspace()).getData();
  assert.equal(data.goals.length, 1);
  assert.equal(data.goals[0].title, 'Study queues');
  assert.equal(data.goals[0].targetDate, '2026-12-01');
  assert.equal(data.goals[0].status, 'archived');
  assert.equal(data.goals[0].createdAt, date.toISOString());
  assert.deepEqual(data.activities, [activity]);
  assert.deepEqual(renderGoalOptions(data.goals, 'academics'), [{ value: '', label: 'No connected goal' }]);
});

test('activity edits validate every field, preserve stable identity, and deletions persist', async function () {
  const workspace = await loadWorkspace();
  const first = (await workspace.addActivity(activityInput, 'personal', date)).activity;
  const goal = (await workspace.addGoal({ title: 'Portfolio project', areaId: 'portfolio' })).goal;
  const changed = {
    title: '  Write a case study  ', occurredOn: '2026-11-25', areaId: 'portfolio',
    goalId: goal.id, durationMinutes: '0', note: 'Record the design decisions.',
  };
  const invalid = await workspace.updateActivity(first.id, { ...changed, areaId: 'academics', occurredOn: '2026-02-30', durationMinutes: '-1' });
  assert.deepEqual(Object.keys(invalid.errors).sort(), ['durationMinutes', 'goalId', 'occurredOn']);
  assert.deepEqual(workspace.getData().activities, [first]);
  const updatedAt = new Date('2026-11-26T11:00:00Z');
  const updated = (await workspace.updateActivity(first.id, changed, 'personal', updatedAt)).activity;
  assert.deepEqual(updated, {
    ...changed, title: 'Write a case study', durationMinutes: 0, id: first.id, createdAt: first.createdAt,
    updatedAt: updatedAt.toISOString(),
  });
  assert.deepEqual((await loadWorkspace()).getData().activities, [updated]);
  assert.deepEqual((await workspace.deleteActivity(first.id)).errors, {});
  assert.deepEqual((await loadWorkspace()).getData().activities, []);
  assert.ok((await workspace.deleteActivity(first.id)).errors.activity);
});

test('areas can be edited and archived while keeping historical relationships', async function () {
  const workspace = await loadWorkspace();
  const first = (await workspace.saveArea(areaInput, null, 'personal', date)).area;
  assert.ok((await workspace.saveArea({ ...areaInput, name: '  WRITING  ' })).errors.name);
  assert.ok((await workspace.saveArea({ ...areaInput, name: 'DSA & Academics' })).errors.name);
  assert.ok((await workspace.saveArea({ ...areaInput, icon: 'unsupported' })).errors.icon);
  const area = (await workspace.saveArea({ ...areaInput, name: 'Writing practice', color: 'blue' }, first.id)).area;
  assert.equal(area.createdAt, first.createdAt);
  const goal = (await workspace.addGoal({ ...goalInput, areaId: area.id })).goal;
  const historical = (await workspace.addActivity({ ...activityInput, areaId: area.id, goalId: goal.id })).activity;
  await workspace.changeGoalStatus(goal.id, 'in_progress');
  await workspace.changeGoalStatus(goal.id, 'completed');
  await workspace.archiveArea(area.id);
  assert.ok((await workspace.addActivity({ ...activityInput, areaId: area.id, goalId: goal.id })).errors.areaId);
  assert.ok((await workspace.addGoal({ ...goalInput, areaId: area.id })).errors.areaId);
  assert.deepEqual((await workspace.updateActivity(historical.id, { ...historical, title: 'Historical edit' })).errors, {});
  const reopened = await loadWorkspace();
  assert.ok(reopened.getData().areas.find(record => record.id === area.id).archivedAt);
  assert.equal(reopened.getData().activities[0].goalId, goal.id);
  assert.match(renderSettings(reopened.getData()), /Archived growth areas[\s\S]*Writing practice/);
});

test('failed activity writes leave both history and the database unchanged and can be retried', async function (context) {
  const workspace = await loadWorkspace();
  const activity = (await workspace.addActivity(activityInput)).activity;
  const put = context.mock.method(IDBObjectStore.prototype, 'put', function failWrite() { throw new Error('Storage unavailable'); });
  await assert.rejects(workspace.updateActivity(activity.id, { ...activityInput, title: 'Edited' }), /Storage unavailable/);
  put.mock.restore();
  const remove = context.mock.method(IDBObjectStore.prototype, 'delete', function failDelete() { throw new Error('Storage unavailable'); });
  await assert.rejects(workspace.deleteActivity(activity.id), /Storage unavailable/);
  remove.mock.restore();
  assert.deepEqual(workspace.getData().activities, [activity]);
  assert.deepEqual((await readWorkspace()).activities, [activity]);
  assert.deepEqual((await workspace.deleteActivity(activity.id)).errors, {});
  assert.deepEqual((await readWorkspace()).activities, []);
});

test('stale tabs cannot overwrite a newer workspace or restore over it', async function () {
  const first = await loadWorkspace();
  const backup = await first.exportBackup();
  const second = await loadWorkspace();
  await first.addActivity(activityInput);
  await assert.rejects(second.addActivity({ ...activityInput, title: 'Stale entry' }), /changed in another tab/);
  await assert.rejects(second.restoreBackup(backup), /changed in another tab/);
  assert.equal((await readWorkspace()).activities.length, 1);
  const reloaded = await loadWorkspace();
  assert.deepEqual((await reloaded.addActivity(activityInput)).errors, {});
  assert.equal((await readWorkspace()).activities.length, 2);
});

test('activity filters combine area, goal, inclusive dates, and case-insensitive title or notes', function () {
  const records = [
    { ...activityInput, id: 'first', goalId: 'g', note: 'Queue problems' },
    { ...activityInput, id: 'second', title: 'Queues', goalId: 'g', occurredOn: '2026-11-25' },
    { ...activityInput, id: 'third', title: 'Queues', goalId: 'g', occurredOn: '2026-11-26' },
    { ...activityInput, id: 'fourth', title: 'Queues', areaId: 'other', goalId: 'g' },
  ];
  const filters = { query: ' QUEUE ', areaId: 'academics', goalId: 'g', from: '2026-11-24', to: '2026-11-25' };
  assert.deepEqual(filterActivities(records, filters).map(record => record.id), ['first', 'second']);
  assert.match(renderActivityHistory({ activities: records }, { filters: { goalId: 'missing' } }), /No matching activities/);
  assert.ok(renderActivityHistory({ activities: records }, { filters: filters }).indexOf('Queues') <
    renderActivityHistory({ activities: records }, { filters: filters }).indexOf('Practice'));
});

test('weekly totals follow the local Monday–Sunday boundary and ignore invalid durations', function () {
  const now = new Date(2026, 10, 25);
  const records = [
    { occurredOn: '2026-11-22', durationMinutes: 80 },
    { occurredOn: '2026-11-23', durationMinutes: 20 },
    { occurredOn: '2026-11-23', durationMinutes: null },
    { occurredOn: '2026-11-25', durationMinutes: 13 },
    { occurredOn: '2026-11-29', durationMinutes: -5 },
    { occurredOn: '2026-11-30', durationMinutes: 55 },
  ];
  assert.deepEqual(summarizeWeek(records, now), { count: 4, minutes: 33n, dailyCounts: [2, 0, 1, 0, 0, 0, 1] });
  const html = renderOverview({ activities: records }, { now: now });
  assert.match(html, /Time this week[\s\S]*33 min/);
  assert.match(html, /Activity count by day[\s\S]*Monday[\s\S]*>2<\/span>/);
  assert.match(renderOverview({}, { now: now }), /No activities logged this week/);
});

test('JSON export round-trips records and settings, replaces personal data, and excludes sample data', async function () {
  await saveRecord('settings', { key: 'display', value: { showNotes: true } });
  const workspace = await loadWorkspace();
  const goal = (await workspace.addGoal(goalInput)).goal;
  await workspace.addActivity({ ...activityInput, goalId: goal.id });
  await workspace.changeGoalStatus(goal.id, 'archived');
  const text = await workspace.exportBackup();
  const root = JSON.parse(text);
  assert.equal(root.formatVersion, 1);
  assert.match(root.exportedAt, /Z$/);
  assert.deepEqual(root.settings, [{ key: 'display', value: { showNotes: true } }]);
  assert.doesNotMatch(text, /Practice array fundamentals|workspace-initialized/);
  assert.deepEqual(parseBackup(text), workspace.getData());
  await assert.rejects(workspace.exportBackup('sample'), /personal workspace/);
  await assert.rejects(workspace.restoreBackup(text, 'sample'), /personal workspace/);
  await workspace.addActivity({ ...activityInput, title: 'Discard after confirmation' });
  await workspace.restoreBackup(text);
  assert.deepEqual(workspace.getData(), parseBackup(text));
  assert.deepEqual((await loadWorkspace()).getData(), parseBackup(text));
});

test('invalid backup versions, IDs, fields and relationships leave personal data unchanged', async function () {
  const workspace = await loadWorkspace();
  const goal = (await workspace.addGoal(goalInput)).goal;
  await workspace.addActivity({ ...activityInput, goalId: goal.id });
  const before = workspace.getData();
  const original = JSON.parse(await workspace.exportBackup());
  const invalidBackups = [
    { ...original, formatVersion: 9 },
    { ...original, areas: [...original.areas, original.areas[0]] },
    { ...original, goals: [{ ...goal, status: 'active' }] },
    { ...original, goals: [{ ...goal, id: '' }] },
    { ...original, goals: [{ ...goal, areaId: 'unknown' }] },
    { ...original, activities: [{ ...original.activities[0], areaId: 'portfolio' }] },
    { ...original, activities: [{ ...original.activities[0], occurredOn: '2026-02-30' }] },
    { ...original, activities: [{ ...original.activities[0], createdAt: '2026-02-30T01:00:00Z' }] },
    { ...original, settings: [{ key: 'workspace-initialized', value: true }] },
  ];
  await assert.rejects(workspace.restoreBackup('{invalid'), /valid JSON/);
  for (const invalid of invalidBackups) {
    await assert.rejects(workspace.restoreBackup(JSON.stringify(invalid)), /backup|growth area|activit|goal/i);
  }
  assert.deepEqual(workspace.getData(), before);
  assert.deepEqual((await loadWorkspace()).getData(), before);
});

test('a restore write failure rolls back all stores and can be retried', async function (context) {
  const workspace = await loadWorkspace();
  const goal = (await workspace.addGoal(goalInput)).goal;
  await workspace.addActivity({ ...activityInput, goalId: goal.id });
  const data = await readWorkspace();
  const original = JSON.parse(await workspace.exportBackup());
  const replacement = { ...original, areas: [], goals: [], activities: [], settings: [{ key: 'display', value: false }] };
  const add = IDBObjectStore.prototype.add;
  const mock = context.mock.method(IDBObjectStore.prototype, 'add', function failSetting(record) {
    if (this.name === 'settings' && record.key === 'display') throw new Error('Simulated write failure');
    return add.call(this, record);
  });
  await assert.rejects(workspace.restoreBackup(JSON.stringify(replacement)), /Simulated write failure/);
  mock.mock.restore();
  assert.deepEqual(await readWorkspace(), data);
  assert.deepEqual(workspace.getData(), parseBackup(JSON.stringify(original)));
  await assert.rejects(replaceWorkspace({ ...replacement, areas: [data.areas[0], data.areas[0]] }), /transaction failed/i);
  assert.deepEqual(await readWorkspace(), data);
  await workspace.restoreBackup(JSON.stringify(replacement));
  assert.equal((await loadWorkspace()).getData().areas.length, 0);
  assert.equal((await readWorkspace()).settings.length, 1);
});

test('sample settings expose neither export nor restore and area names render safely', function () {
  const sample = createWorkspace().getData('sample');
  sample.areas[0].name = '<img src=x onerror=alert(1)>';
  const html = renderSettings(sample, { sample: true });
  assert.match(html, /&lt;img/);
  assert.doesNotMatch(html, /<img|id="export-backup"|id="review-backup"/);
});
