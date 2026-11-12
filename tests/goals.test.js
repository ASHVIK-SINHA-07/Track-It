import test from 'node:test';
import assert from 'node:assert/strict';
import { GOAL_LIMITS, validateGoal } from '../src/data/goals.js';
import { createWorkspace } from '../src/data/workspace.js';
import { availableGoals, validateActivity } from '../src/data/activity.js';
import { renderGoalForm, renderGoalList, renderGoals } from '../src/views/goals.js';
import { renderGoalOptions } from '../src/views/activity.js';
import { countActiveGoals } from '../src/data/overview.js';

const now = new Date(2026, 10, 12, 12);
const data = { areas: [{ id: 'a', name: 'Academics', archivedAt: null }, { id: 'old', archivedAt: '2026-01-01' }] };
const valid = { title: '  Practice arrays  ', areaId: 'a', description: 'Keep my notes\nwith line breaks.', targetDate: '' };

test('goal validation trims the title, preserves description, and accepts omitted optional fields', function () {
  const result = validateGoal(valid, data);
  assert.deepEqual(result.errors, {});
  assert.equal(result.value.title, 'Practice arrays');
  assert.equal(result.value.description, valid.description);
  assert.equal(result.value.targetDate, null);
  const minimal = validateGoal({ title: 'Study', areaId: 'a' }, data);
  assert.deepEqual(minimal.errors, {});
  assert.equal(minimal.value.description, '');
  assert.equal(minimal.value.targetDate, null);
});

test('goal validation rejects missing titles, unavailable areas, and excessive text without changing input', function () {
  const invalidInputs = [
    { title: '', areaId: 'a' },
    { title: ' \n ', areaId: 'a' },
    { areaId: 'a' },
    { title: 'Study', areaId: '' },
    { title: 'Study', areaId: 'missing' },
    { title: 'Study', areaId: 'old' },
    { title: 'x'.repeat(GOAL_LIMITS.title + 1), areaId: 'a' },
    { title: 'Study', areaId: 'a', description: 'x'.repeat(GOAL_LIMITS.description + 1) },
  ];
  for (const input of invalidInputs) {
    const before = structuredClone(input);
    assert.ok(Object.keys(validateGoal(input, data).errors).length > 0);
    assert.deepEqual(input, before);
  }
  const atLimits = { title: 'x'.repeat(160), areaId: 'a', description: 'x'.repeat(4000) };
  assert.deepEqual(validateGoal(atLimits, data).errors, {});
  assert.ok(validateGoal(valid).errors.areaId);
});

test('optional target dates support real calendar days and reject impossible or malformed dates', function () {
  for (const date of ['', '  ', null, undefined, '2024-02-29', '2026-12-31']) {
    const input = { title: 'Study', areaId: 'a', targetDate: date };
    assert.deepEqual(validateGoal(input, data).errors, {});
  }
  for (const date of ['2026-02-29', '2026-02-30', '2026-13-01', '2026-11-12T00:00:00Z', 'tomorrow']) {
    const input = { title: 'Study', areaId: 'a', targetDate: date };
    assert.ok(validateGoal(input, data).errors.targetDate);
  }
});

test('workspace creates unique goals with the agreed fields and not_started status', function () {
  const workspace = createWorkspace({ now: now });
  const input = { title: '  Practice arrays  ', areaId: 'academics', targetDate: '2026-12-01' };
  const result = workspace.addGoal(input, 'personal', now);
  assert.deepEqual(result.errors, {});
  assert.deepEqual(result.goal, {
    id: 'temporary-goal-1', areaId: 'academics', title: 'Practice arrays', description: '',
    status: 'not_started', targetDate: '2026-12-01', createdAt: now.toISOString(), updatedAt: now.toISOString(),
  });
  const next = workspace.addGoal(input, 'personal', now);
  assert.notEqual(next.goal.id, result.goal.id);
  assert.equal(workspace.getData().goals.length, 2);
  assert.equal(countActiveGoals(workspace.getData().goals), 0);
  result.goal.title = 'Changed outside the workspace';
  assert.equal(workspace.getData().goals[0].title, 'Practice arrays');
  assert.ok(workspace.addGoal({ title: '', areaId: 'academics' }).errors.title);
  assert.equal(workspace.getData().goals.length, 2);
});

test('sample and personal goals stay isolated and refresh starts a fresh collection', function () {
  const workspace = createWorkspace({ now: now });
  workspace.addGoal({ title: 'Personal goal', areaId: 'personal' });
  workspace.addGoal({ title: 'Sample goal', areaId: 'academics' }, 'sample');
  assert.equal(workspace.getData().goals.length, 1);
  assert.equal(workspace.getData('sample').goals.length, 4);
  assert.equal(workspace.getData('sample').goals[3].title, 'Sample goal');
  assert.equal(workspace.getData().goals[0].title, 'Personal goal');
  assert.equal(createWorkspace().getData().goals.length, 0);
});

test('Goals renders empty states, temporary notices, and newly created goal cards', function () {
  assert.match(renderGoals(), /No goals yet/);
  assert.match(renderGoals(), /disappear on refresh/);
  assert.match(renderGoals({}, { sample: true }), /Sample workspace/);
  const workspace = createWorkspace({ now: now });
  workspace.addGoal({ title: 'Learn arrays', areaId: 'academics', description: 'Work through three examples.', targetDate: '2026-12-01' });
  const html = renderGoals(workspace.getData());
  assert.match(html, /<h3>Learn arrays<\/h3>/);
  assert.match(html, /DSA &amp; Academics/);
  assert.match(html, /Status: Not started/);
  assert.match(html, /datetime="2026-12-01"/);
  assert.match(html, /Work through three examples/);
  assert.doesNotMatch(html, /No goals yet/);
});

test('goal cards handle optional values, status labels, and short description previews', function () {
  const statuses = ['not_started', 'in_progress', 'completed', 'archived'];
  const labels = ['Not started', 'In progress', 'Completed', 'Archived'];
  for (let index = 0; index < statuses.length; index += 1) {
    const html = renderGoalList({ goals: [{ title: 'Study', status: statuses[index] }] });
    assert.ok(html.includes('Status: ' + labels[index]));
    assert.doesNotMatch(html, /Target:|undefined|NaN/);
  }
  const longDescription = 'x'.repeat(201);
  const html = renderGoalList({ goals: [{ title: 'Study', description: longDescription }] });
  assert.ok(html.includes('x'.repeat(200) + '…'));
  assert.ok(!html.includes(longDescription));
});

test('goal form has accessible labels, text limits, optional empty date, and only unarchived areas', function () {
  const html = renderGoalForm(data);
  for (const id of ['title', 'area', 'description', 'date']) {
    assert.ok(html.includes('<label for="goal-' + id + '">'));
    assert.ok(html.includes('goal-' + id + '-error'));
  }
  assert.match(html, /maxlength="160"/);
  assert.match(html, /maxlength="4000"/);
  assert.match(html, /name="targetDate"[^>]*type="date" value=""/);
  assert.doesNotMatch(html, /value="old"/);
});

test('goal text, area names, descriptions, and option identifiers render safely', function () {
  const hostile = '<img src=x onerror="alert(1)"> & \'quoted\'';
  const dataset = { areas: [{ id: hostile, name: hostile }], goals: [{ title: hostile, areaId: hostile, description: hostile, targetDate: hostile, status: hostile }] };
  for (const html of [renderGoalList(dataset), renderGoalForm(dataset)]) {
    assert.doesNotMatch(html, /<img|<script/);
    assert.match(html, /&lt;img/);
  }
});

test('new matching goals appear in quick-log options and can be linked to an activity', function () {
  const workspace = createWorkspace({ now: now });
  const result = workspace.addGoal({ title: 'Learn arrays', areaId: 'academics' });
  const goals = workspace.getData().goals;
  assert.equal(renderGoalOptions(goals, 'academics')[1].value, result.goal.id);
  assert.equal(renderGoalOptions(goals, 'portfolio').length, 1);
  const activity = workspace.addActivity({ title: 'Practice', areaId: 'academics', goalId: result.goal.id, occurredOn: '2026-11-12' });
  assert.deepEqual(activity.errors, {});
  assert.equal(activity.activity.goalId, result.goal.id);
});

test('archived goals are excluded from quick-log and rejected by activity validation', function () {
  const goals = [
    { id: 'new', areaId: 'a', status: 'not_started' },
    { id: 'progress', areaId: 'a', status: 'in_progress' },
    { id: 'done', areaId: 'a', status: 'completed' },
    { id: 'archived', areaId: 'a', status: 'archived' },
    { id: 'other', areaId: 'b', status: 'in_progress' },
  ];
  const options = availableGoals(goals, 'a');
  assert.equal(options.length, 3);
  const input = { title: 'Study', areaId: 'a', goalId: 'archived', occurredOn: '2026-11-12' };
  assert.ok(validateActivity(input, { areas: data.areas, goals: goals }).errors.goalId);
  for (const goal of options) {
    input.goalId = goal.id;
    assert.deepEqual(validateActivity(input, { areas: data.areas, goals: goals }).errors, {});
  }
});
