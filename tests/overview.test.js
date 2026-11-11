import test from 'node:test';
import assert from 'node:assert/strict';
import { countWeeklyActivities, countActiveGoals, countGrowthAreas, summarizeOverview, sortRecentActivities, parseCalendarDate } from '../src/data/overview.js';
import { createMockOverview } from '../src/data/mock.js';
import { renderOverview } from '../src/views/overview.js';

const activitiesOn = (...days) => days.map(occurredOn => ({ occurredOn }));

test('weekly count uses local Monday midnight through Sunday, excluding adjacent weeks', () => {
  const activities = activitiesOn('2026-11-08', '2026-11-09', '2026-11-11', '2026-11-15', '2026-11-16');
  for (const now of [new Date(2026, 10, 9, 0), new Date(2026, 10, 11, 23), new Date(2026, 10, 15, 23, 59)]) {
    assert.equal(countWeeklyActivities(activities, now), 3);
  }
  assert.equal(countWeeklyActivities(activities, new Date(2026, 10, 16)), 1);
});

test('calendar weeks cross year, month, and daylight-saving boundaries', () => {
  assert.equal(countWeeklyActivities(activitiesOn('2025-12-28', '2025-12-29', '2026-01-04', '2026-01-05'), new Date(2026, 0, 1)), 2);
  assert.equal(countWeeklyActivities(activitiesOn('2026-03-02', '2026-03-08', '2026-03-09'), new Date(2026, 2, 8, 23, 59)), 2);
  assert.equal(countWeeklyActivities(activitiesOn('2026-10-26', '2026-11-01', '2026-11-02'), new Date(2026, 10, 1, 23, 59)), 2);
});

test('invalid or absent calendar dates do not count', () => {
  for (const value of [null, undefined, '', '2026-02-30', '2026-13-01', '2026-11-11T00:00:00Z', '<script>']) assert.equal(parseCalendarDate(value), null);
  const date = parseCalendarDate('2024-02-29');
  assert.equal(date.getDate(), 29);
  assert.equal(date.getHours(), 0);
  assert.equal(countWeeklyActivities(activitiesOn(null, '2026-02-30'), new Date(2026, 1, 28)), 0);
});

test('active goals and unarchived growth areas are derived from supplied records', () => {
  assert.equal(countActiveGoals([{ status: 'not_started' }, { status: 'in_progress' }, { status: 'completed' }, { status: 'archived' }, { status: 'active' }, {}]), 1);
  assert.equal(countGrowthAreas([{ archivedAt: null }, {}, { archivedAt: '2026-01-01' }]), 2);
  assert.deepEqual(summarizeOverview(), { weeklyActivities: 0, activeGoals: 0, growthAreas: 0 });
});

test('recent sorting is newest first, breaks ties by ID, and preserves the source', () => {
  const source = [
    { id: 'b', occurredOn: '2026-11-11' }, { id: 'old', occurredOn: '2026-11-09' },
    { id: 'a', occurredOn: '2026-11-11' }, { id: 'invalid' }, { id: 'also-invalid', occurredOn: 'invalid' },
  ];
  const before = structuredClone(source);
  assert.deepEqual(sortRecentActivities(source).map(({ id }) => id), ['a', 'b', 'old', 'also-invalid', 'invalid']);
  assert.deepEqual(source, before);
  const duplicates = [{ id: 'same', title: 'first' }, { id: 'same', title: 'second' }];
  assert.deepEqual(sortRecentActivities(duplicates), duplicates);
  assert.deepEqual(sortRecentActivities(), []);
});

test('default workspace is empty and sample data requires explicit selection', () => {
  const html = renderOverview();
  assert.match(html, /No goals yet/);
  assert.match(html, /No growth areas yet/);
  assert.match(html, /No activities recorded yet/);
  assert.equal((html.match(/class="summary-value">0</g) ?? []).length, 3);
  assert.doesNotMatch(html, /Practiced two array problems/);
  const sample = createMockOverview(new Date(2026, 10, 11));
  assert.equal(sample.areas.length, 5);
  assert.equal(sample.goals.length, 3);
  assert.equal(sample.activities[0].occurredOn, '2026-11-11');
  const preview = renderOverview(sample, { sample: true, now: new Date(2026, 10, 11) });
  assert.match(preview, /Sample data only/);
  assert.match(preview, /not your accomplishments/);
  assert.match(preview, /Goal: Practice array fundamentals/);
  assert.match(preview, /1 activity recorded/);
  assert.ok(preview.indexOf('Practiced two array problems') < preview.indexOf('Sketched a project page layout'));
});

test('missing optional values and unresolved relationships render without misleading placeholders', () => {
  const html = renderOverview({ activities: [{ id: 'a', title: 'Reading', areaId: 'missing', occurredOn: '2026-11-11' }] });
  assert.match(html, /Reading/);
  assert.match(html, /Growth area unavailable/);
  assert.doesNotMatch(html, /Goal:|undefined|NaN|null/);
  const invalid = renderOverview({ activities: [{ title: 'Undated', goalId: 'missing' }] });
  assert.match(invalid, /Date unavailable/);
  assert.doesNotMatch(invalid, /Goal:/);
});

test('only five recent activities render and archived areas do not render cards', () => {
  const html = renderOverview({ areas: [{ id: 'archived', name: 'Archived', archivedAt: '2026-01-01' }], activities: Array.from({ length: 7 }, (_, i) => ({ id: String(i), title: `Record ${i}`, occurredOn: `2026-11-${10 + i}` })) });
  assert.equal((html.match(/class="recent-item"/g) ?? []).length, 5);
  assert.doesNotMatch(html, /Record 0|Record 1|<h3>Archived/);
});

test('all record text is escaped and visual metadata cannot inject attributes or SVG', () => {
  const hostile = '<img src=x onerror="alert(1)"> & \'quoted\'';
  const html = renderOverview({
    areas: [{ id: 'a', name: hostile, description: hostile, icon: hostile, color: hostile }],
    goals: [{ id: 'g', title: hostile }],
    activities: [{ id: 'x', title: hostile, areaId: 'a', goalId: 'g', occurredOn: hostile }],
  });
  assert.doesNotMatch(html, /<img|<script|undefined|class="[^"]*onerror/);
  assert.equal((html.match(/&lt;img/g) ?? []).length, 5);
  assert.match(html, /growth-card sage/);
});

test('sample goals follow the approved status contract', () => {
  const { goals } = createMockOverview();
  assert.ok(goals.every(({ status }) => ['not_started', 'in_progress', 'completed', 'archived'].includes(status)));
  assert.equal(countActiveGoals(goals), 2);
});
