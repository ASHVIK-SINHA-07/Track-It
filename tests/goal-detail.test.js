import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkspace } from '../src/data/workspace.js';
import { countActiveGoals } from '../src/data/overview.js';
import { renderGoalForm, renderGoalList } from '../src/views/goals.js';
import { renderGoalDetail } from '../src/views/goal-detail.js';
import { renderActivityHistory, renderGoalOptions } from '../src/views/activity.js';

const createdAt = new Date('2026-11-01T12:00:00Z');
const updatedAt = new Date('2026-11-10T12:00:00Z');
const activityInput = { title: 'Worked through an example', areaId: 'academics', occurredOn: '2026-11-05' };

function makeGoal(workspace) {
  return workspace.addGoal({ title: 'Practice arrays', areaId: 'academics' }, 'personal', createdAt).goal;
}

test('editing a goal changes its details and updated timestamp while keeping its identity, area, and links', function () {
  const workspace = createWorkspace();
  const goal = makeGoal(workspace);
  const activity = workspace.addActivity({ ...activityInput, goalId: goal.id }).activity;
  const input = {
    title: '  Practice lists  ', description: 'Try three examples.', targetDate: '2028-02-29',
    areaId: 'portfolio', status: 'completed', id: 'other',
  };
  const result = workspace.updateGoal(goal.id, input, 'personal', updatedAt);
  assert.deepEqual(result.errors, {});
  assert.deepEqual(result.goal, {
    ...goal, title: 'Practice lists', description: 'Try three examples.', targetDate: '2028-02-29',
    updatedAt: updatedAt.toISOString(),
  });
  assert.equal(workspace.getData().goals.length, 1);
  assert.deepEqual(workspace.getData().activities, [activity]);
  assert.match(renderActivityHistory(workspace.getData()), /Goal: Practice lists/);
  result.goal.title = 'External mutation';
  assert.equal(workspace.getData().goals[0].title, 'Practice lists');
  assert.equal(workspace.updateGoal(goal.id, { title: 'Practice lists', targetDate: '' }).goal.targetDate, null);
});

test('invalid edits and unknown goals leave workspace records intact', function () {
  const workspace = createWorkspace();
  const goal = makeGoal(workspace);
  const result = workspace.updateGoal(goal.id, { title: '  ', description: 'x'.repeat(4001), targetDate: '2026-02-29' });
  assert.deepEqual(Object.keys(result.errors), ['title', 'description', 'targetDate']);
  assert.ok(workspace.updateGoal(goal.id, { title: 'x'.repeat(161) }).errors.title);
  assert.ok(workspace.updateGoal('missing', { title: 'Valid' }).errors.goal);
  assert.ok(workspace.changeGoalStatus('missing', 'in_progress').errors.goal);
  assert.deepEqual(workspace.getData().goals, [goal]);
});

test('starting, completing, reopening, and archiving update eligibility and the Active Goals metric', function () {
  const workspace = createWorkspace();
  const goal = makeGoal(workspace);
  const input = { ...activityInput, goalId: goal.id };
  assert.ok(workspace.changeGoalStatus(goal.id, 'completed').errors.status);
  assert.equal(workspace.getData().goals[0].updatedAt, goal.updatedAt);
  const firstActivity = workspace.addActivity(input).activity;

  for (const [status, active, eligible] of [
    ['in_progress', 1, true], ['completed', 0, false], ['in_progress', 1, true], ['archived', 0, false],
  ]) {
    const result = workspace.changeGoalStatus(goal.id, status, 'personal', updatedAt);
    assert.deepEqual(result.errors, {});
    assert.equal(result.goal.status, status);
    assert.equal(result.goal.createdAt, goal.createdAt);
    assert.equal(result.goal.updatedAt, updatedAt.toISOString());
    const data = workspace.getData();
    assert.equal(countActiveGoals(data.goals), active);
    assert.equal(renderGoalOptions(data.goals, 'academics').some(option => option.value === goal.id), eligible);
    if (!eligible) assert.ok(workspace.addActivity(input).errors.goalId);
    assert.deepEqual(workspace.getData().activities, [firstActivity]);
    assert.match(renderActivityHistory(data), /Goal: Practice arrays/);
    assert.match(renderGoalDetail(data, result.goal), /Worked through an example/);
  }

  assert.match(renderGoalList(workspace.getData()), /Archived goals[\s\S]*href="#\/goals\/temporary-goal-1"/);
});

test('goals can be archived from each live status and require an explicit valid restore status', function () {
  for (const restoreStatus of ['not_started', 'in_progress', 'completed']) {
    const workspace = createWorkspace();
    const goal = makeGoal(workspace);
    if (restoreStatus !== 'not_started') workspace.changeGoalStatus(goal.id, 'in_progress');
    if (restoreStatus === 'completed') workspace.changeGoalStatus(goal.id, 'completed');
    assert.equal(workspace.changeGoalStatus(goal.id, 'archived').goal.status, 'archived');

    const html = renderGoalDetail(workspace.getData(), workspace.getData().goals[0]);
    assert.match(html, /Restore as/);
    assert.match(html, /<option value="" selected>Choose a status/);
    assert.doesNotMatch(html, /id="archive-goal"/);
    for (const invalidStatus of [undefined, '', 'archived', 'unknown']) {
      assert.ok(workspace.changeGoalStatus(goal.id, invalidStatus).errors.status);
    }
    assert.equal(workspace.getData().goals[0].status, 'archived');
    assert.equal(workspace.changeGoalStatus(goal.id, restoreStatus).goal.status, restoreStatus);
  }
});

test('editing and changing status stay within the selected personal or sample workspace', function () {
  const workspace = createWorkspace();
  const personalGoal = makeGoal(workspace);
  const sampleBefore = workspace.getData('sample').goals[0];
  assert.ok(workspace.updateGoal(personalGoal.id, { title: 'Wrong workspace' }, 'sample').errors.goal);
  assert.ok(workspace.changeGoalStatus(sampleBefore.id, 'archived').errors.goal);
  assert.equal(workspace.updateGoal(sampleBefore.id, { title: 'Sample edit' }, 'sample').goal.title, 'Sample edit');
  assert.equal(workspace.changeGoalStatus(sampleBefore.id, 'archived', 'sample').goal.status, 'archived');
  assert.deepEqual(workspace.getData().goals, [personalGoal]);
  assert.equal(workspace.getData('sample').activities.length, 4);
  assert.equal(createWorkspace().getData('sample').goals[0].status, sampleBefore.status);
});

test('goal details show only linked records, newest first, with an exact total from valid durations', function () {
  const goal = { id: 'g', title: 'Practice arrays', areaId: 'a', status: 'in_progress', description: 'Review examples', targetDate: '2026-12-01' };
  const maximum = Number.MAX_SAFE_INTEGER;
  const activities = [
    { ...activityInput, title: 'Older linked work', goalId: 'g', occurredOn: '2026-11-01', durationMinutes: maximum },
    { ...activityInput, title: 'Unlinked work', goalId: 'other', durationMinutes: 45 },
    { ...activityInput, title: 'Newest linked work', goalId: 'g', occurredOn: '2026-11-12', durationMinutes: 2, note: 'My notes' },
    { ...activityInput, title: 'Missing duration', goalId: 'g' },
    { ...activityInput, title: 'Invalid duration', goalId: 'g', durationMinutes: -15 },
    { ...activityInput, title: 'Zero duration', goalId: 'g', durationMinutes: 0 },
  ];
  const html = renderGoalDetail({ areas: [{ id: 'a', name: 'Academics' }], activities: activities }, goal);
  assert.match(html, /<h1>Practice arrays<\/h1>/);
  assert.match(html, /Growth area: Academics/);
  assert.match(html, /Review examples/);
  assert.match(html, /In progress/);
  assert.match(html, /datetime="2026-12-01"/);
  assert.match(html, /Activity count<\/dt><dd>5/);
  assert.match(html, /Recorded duration<\/dt><dd>9007199254740993 min/);
  assert.match(html, /Newest linked work[\s\S]*Older linked work/);
  assert.match(html, /Newest linked work[\s\S]*2 min[\s\S]*My notes[\s\S]*datetime="2026-11-12"/);
  assert.match(html, /Zero duration<\/h3>[\s\S]*>0 min<\/p>/);
  assert.doesNotMatch(html, /Unlinked work|-15 min/);
});

test('zero linked activities and unavailable goals have useful empty states', function () {
  const workspace = createWorkspace();
  const goal = makeGoal(workspace);
  const html = renderGoalDetail(workspace.getData(), goal);
  assert.match(html, /No linked activities yet/);
  assert.match(html, /Activity count<\/dt><dd>0/);
  assert.match(html, /Recorded duration<\/dt><dd>0 min/);
  const missing = renderGoalDetail(workspace.getData(), null);
  assert.match(missing, /Goal unavailable/);
  assert.match(missing, /href="#\/goals"/);
  assert.doesNotMatch(missing, /Edit Goal/);
});

test('goal details, edit values, activity notes, and title links safely render user text', function () {
  const text = '</textarea><img src=x onerror="alert(1)"> & quoted';
  const goal = { id: 'g/1"?#', title: text, description: text, targetDate: '2026-12-01', areaId: 'a', status: 'not_started' };
  const data = { areas: [{ id: 'a', name: text }], goals: [goal], activities: [{ ...activityInput, goalId: goal.id, title: text, note: text }] };
  const detail = renderGoalDetail(data, goal);
  const form = renderGoalForm(data, goal);
  const list = renderGoalList(data);
  for (const html of [detail, form, list]) {
    assert.doesNotMatch(html, /<img/);
    assert.match(html, /&lt;img/);
  }
  assert.match(list, /href="#\/goals\/g%2F1%22%3F%23"/);
  assert.match(form, /name="targetDate"[^>]*value="2026-12-01"/);
  assert.doesNotMatch(form, /name="areaId"/);
});
