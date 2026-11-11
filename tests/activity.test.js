import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTIVITY_LIMITS, availableGoals, localDateValue, validateActivity } from '../src/data/activity.js';
import { createWorkspace } from '../src/data/workspace.js';
import { renderActivity, renderActivityForm, renderActivityHistory, renderGoalOptions } from '../src/views/activity.js';
import { summarizeOverview } from '../src/data/overview.js';

const now = new Date(2026, 10, 11, 23, 30);
const data = { areas: [{ id: 'a', name: 'Area A' }, { id: 'b', name: 'Area B' }, { id: 'old', archivedAt: '2026-01-01' }], goals: [{ id: 'g', areaId: 'a', title: 'Goal A' }, { id: 'other', areaId: 'b', title: 'Goal B' }] };
const valid = { title: '  Read a chapter  ', areaId: 'a', goalId: '', occurredOn: '2026-11-11', durationMinutes: '', note: 'Keep these notes\nwith a line break.' };

test('activity validation trims titles and preserves notes and optional null values', () => {
  const { errors, value } = validateActivity(valid, data);
  assert.deepEqual(errors, {});
  assert.equal(value.title, 'Read a chapter');
  assert.equal(value.note, valid.note);
  assert.equal(value.goalId, null);
  assert.equal(value.durationMinutes, null);
  assert.deepEqual(validateActivity({ ...valid, note: undefined, durationMinutes: undefined }, data).errors, {});
});

test('invalid required input and excessive lengths yield field errors without modifying input', () => {
  for (const [name, value] of [
    ['title', ' \n '], ['title', 'x'.repeat(ACTIVITY_LIMITS.title + 1)],
    ['note', 'x'.repeat(ACTIVITY_LIMITS.note + 1)], ['areaId', 'missing'], ['areaId', 'old'],
    ['occurredOn', '2026-02-30'], ['occurredOn', '2026-11-11T00:00:00Z'], ['occurredOn', ''],
  ]) {
    const input = { ...valid, [name]: value };
    const copy = { ...input };
    assert.ok(validateActivity(input, data).errors[name], name);
    assert.deepEqual(input, copy);
  }
  assert.deepEqual(validateActivity({ ...valid, title: 'x'.repeat(160), note: 'x'.repeat(4000), occurredOn: '2024-02-29' }, data).errors, {});
});

test('goal selection and validation enforce the selected area relationship', () => {
  assert.deepEqual(availableGoals(data.goals, 'a').map(g => g.id), ['g']);
  assert.deepEqual(renderGoalOptions(data.goals, 'b').map(g => g.value), ['', 'other']);
  assert.deepEqual(renderGoalOptions(data.goals, 'missing').map(g => g.value), ['']);
  assert.deepEqual(validateActivity({ ...valid, goalId: 'g' }, data).errors, {});
  for (const goalId of ['other', 'missing']) assert.ok(validateActivity({ ...valid, goalId }, data).errors.goalId);
});

test('optional duration accepts blank, zero, and whole minutes but rejects invalid numbers', () => {
  for (const [input, expected] of [['', null], ['  ', null], ['0', 0], [0, 0], ['25', 25]]) {
    const result = validateActivity({ ...valid, durationMinutes: input }, data);
    assert.deepEqual(result.errors, {});
    assert.equal(result.value.durationMinutes, expected);
  }
  for (const input of ['-1', '1.5', 'NaN', 'Infinity', '1e2', '9007199254740992', 'text']) {
    assert.ok(validateActivity({ ...valid, durationMinutes: input }, data).errors.durationMinutes);
  }
});

test('default form date is local, labeled, constrained, and independent of UTC day', () => {
  assert.equal(localDateValue(now), '2026-11-11');
  const html = renderActivityForm(data, now);
  assert.match(html, /name="occurredOn"[^>]*value="2026-11-11"/);
  for (const id of ['title', 'area', 'date', 'goal', 'duration', 'note']) {
    assert.match(html, new RegExp(`<label for="log-${id}">`));
    assert.match(html, new RegExp(`log-${id}-error`));
  }
  assert.match(html, /maxlength="160"/);
  assert.match(html, /maxlength="4000"/);
  assert.doesNotMatch(html, /value="old"/);
});

test('temporary creation updates shared data and summaries, rejecting invalid submissions', () => {
  const workspace = createWorkspace({ now });
  const input = { ...valid, areaId: 'academics' };
  const result = workspace.addActivity(input, 'personal', now);
  assert.deepEqual(result.errors, {});
  assert.equal(result.activity.title, 'Read a chapter');
  assert.equal(result.activity.createdAt, now.toISOString());
  assert.equal(result.activity.createdAt, result.activity.updatedAt);
  assert.equal(summarizeOverview(workspace.getData(), now).weeklyActivities, 1);
  const next = workspace.addActivity(input, 'personal', now);
  assert.notEqual(result.activity.id, next.activity.id);
  assert.ok(workspace.addActivity({ ...input, title: '' }).errors.title);
  assert.equal(workspace.getData().activities.length, 2);
  const snapshot = workspace.getData();
  snapshot.activities.length = 0;
  assert.equal(workspace.getData().activities.length, 2);
});

test('personal and sample records are separate and a fresh workspace loses temporary entries', () => {
  const workspace = createWorkspace({ now });
  assert.equal(workspace.getData().activities.length, 0);
  assert.equal(workspace.getData().goals.length, 0);
  assert.equal(workspace.getData().areas.length, 5);
  assert.equal(workspace.getData('sample').activities.length, 4);
  workspace.addActivity({ ...valid, areaId: 'academics', goalId: 'arrays' }, 'sample', now);
  assert.equal(workspace.getData('sample').activities.length, 5);
  assert.equal(workspace.getData().activities.length, 0);
  assert.ok(workspace.addActivity({ ...valid, areaId: 'academics', goalId: 'arrays' }, 'personal', now).errors.goalId);
  workspace.addActivity({ ...valid, areaId: 'personal' }, 'personal', now);
  assert.equal(workspace.getData('sample').activities.length, 5);
  assert.equal(createWorkspace({ now }).getData().activities.length, 0);
  assert.throws(() => workspace.getData('unknown'));
});

test('history orders records, shows zero duration, omits missing relationships, and handles empty data', () => {
  assert.match(renderActivity(), /No activities yet/);
  assert.match(renderActivity({}, { sample: true }), /Sample workspace/);
  const html = renderActivityHistory({ ...data, activities: [
    { id: 'b', title: 'Second tie', areaId: 'a', goalId: 'g', occurredOn: '2026-11-11', durationMinutes: 0 },
    { id: 'old', title: 'Older record', areaId: 'missing', occurredOn: '2026-11-10' },
    { id: 'a', title: 'First tie', areaId: 'a', occurredOn: '2026-11-11' },
  ] });
  assert.ok(html.indexOf('First tie') < html.indexOf('Second tie'));
  assert.ok(html.indexOf('Second tie') < html.indexOf('Older record'));
  assert.match(html, /0 min/);
  assert.match(html, /Goal: Goal A/);
  assert.match(html, /Growth area unavailable/);
  assert.doesNotMatch(html, /undefined|NaN/);
});

test('history and form escape all user-controlled text', () => {
  const hostile = '<img src=x onerror="alert(1)"> & \'quote\'';
  const dataset = { areas: [{ id: hostile, name: hostile }], goals: [{ id: 'g', areaId: hostile, title: hostile }], activities: [{ id: 'x', title: hostile, areaId: hostile, goalId: 'g', occurredOn: hostile, note: hostile }] };
  for (const html of [renderActivityHistory(dataset), renderActivityForm(dataset)]) {
    assert.doesNotMatch(html, /<img|<script/);
    assert.match(html, /&lt;img/);
  }
});
