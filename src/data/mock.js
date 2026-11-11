// Illustrative records only. This module never reads or writes browser storage.
// Descriptions are optional presentation metadata alongside the agreed model.
export function createMockOverview(now = new Date()) {
  const calendarDay = (daysAgo) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  const timestamp = `${calendarDay(7)}T12:00:00`;
  const dates = { createdAt: timestamp, updatedAt: timestamp };
  const areas = [
    ['academics', 'DSA & Academics', 'goals', 'sage', 'Build understanding, one concept at a time.'],
    ['portfolio', 'Portfolio Projects', 'overview', 'blue', 'Turn what you learn into something real.'],
    ['creative', 'Creative Skills', 'leaf', 'purple', 'Make room to explore and experiment.'],
    ['content', 'Content Creation', 'activity', 'sand', 'Share your ideas and your perspective.'],
    ['personal', 'Personal Development', 'check', 'rose', 'Invest in the person you are becoming.'],
  ].map(([id, name, icon, color, description]) => ({ id, name, icon, color, description, ...dates, archivedAt: null }));
  const goals = [
    { id: 'arrays', areaId: 'academics', title: 'Practice array fundamentals', description: 'Work through a small set of problems.', status: 'active', targetDate: null, ...dates },
    { id: 'portfolio-page', areaId: 'portfolio', title: 'Build a portfolio page', description: 'Create a first project page.', status: 'active', targetDate: null, ...dates },
    { id: 'sketches', areaId: 'creative', title: 'Try three sketch studies', description: 'Explore simple shapes.', status: 'completed', targetDate: null, ...dates },
  ];
  const activities = [
    { id: 'sample-01', areaId: 'academics', goalId: 'arrays', title: 'Practiced two array problems', note: 'Reviewed the solutions afterwards.', occurredOn: calendarDay(0), durationMinutes: 35, ...dates },
    { id: 'sample-02', areaId: 'portfolio', goalId: 'portfolio-page', title: 'Sketched a project page layout', note: '', occurredOn: calendarDay(1), durationMinutes: null, ...dates },
    { id: 'sample-03', areaId: 'personal', goalId: null, title: 'Read a chapter and took notes', note: '', occurredOn: calendarDay(3), ...dates },
    { id: 'sample-04', areaId: 'creative', goalId: 'sketches', title: 'Finished a shape study', note: '', occurredOn: calendarDay(8), durationMinutes: 20, ...dates },
  ];
  return { areas, goals, activities };
}
