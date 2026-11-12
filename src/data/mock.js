import { createStarterAreas } from './areas.js';
import { localDateValue } from './activity.js';

// Illustrative records only. This module never reads or writes browser storage.
// Descriptions are optional presentation metadata alongside the agreed model.
export function createMockOverview(now = new Date()) {
  function calendarDay(daysAgo) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo);
    return localDateValue(date);
  }
  const timestamp = `${calendarDay(7)}T12:00:00`;
  const areas = createStarterAreas(now);
  const goals = [
    { id: 'arrays', areaId: 'academics', title: 'Practice array fundamentals', description: 'Work through a small set of problems.', status: 'in_progress', targetDate: null },
    { id: 'portfolio-page', areaId: 'portfolio', title: 'Build a portfolio page', description: 'Create a first project page.', status: 'in_progress', targetDate: null },
    { id: 'sketches', areaId: 'creative', title: 'Try three sketch studies', description: 'Explore simple shapes.', status: 'completed', targetDate: null },
  ];
  const activities = [
    { id: 'sample-01', areaId: 'academics', goalId: 'arrays', title: 'Practiced two array problems', note: 'Reviewed the solutions afterwards.', occurredOn: calendarDay(0), durationMinutes: 35 },
    { id: 'sample-02', areaId: 'portfolio', goalId: 'portfolio-page', title: 'Sketched a project page layout', note: '', occurredOn: calendarDay(1), durationMinutes: null },
    { id: 'sample-03', areaId: 'personal', goalId: null, title: 'Read a chapter and took notes', note: '', occurredOn: calendarDay(3) },
    { id: 'sample-04', areaId: 'creative', goalId: 'sketches', title: 'Finished a shape study', note: '', occurredOn: calendarDay(8), durationMinutes: 20 },
  ];
  for (const goal of goals) {
    goal.createdAt = timestamp;
    goal.updatedAt = timestamp;
  }
  for (const activity of activities) {
    activity.createdAt = timestamp;
    activity.updatedAt = timestamp;
  }
  return { areas: areas, goals: goals, activities: activities };
}
