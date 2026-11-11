// Calendar dates stay local: parsing YYYY-MM-DD with new Date(string) would use UTC.
export function parseCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

export function countWeeklyActivities(activities = [], now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  const end = new Date(start);
  // Calendar arithmetic also works when daylight saving changes the week's length.
  end.setDate(end.getDate() + 7);
  return activities.filter(({ occurredOn }) => {
    const date = parseCalendarDate(occurredOn);
    return date && date >= start && date < end;
  }).length;
}

export function countActiveGoals(goals = []) {
  return goals.filter(({ status }) => status === 'in_progress').length;
}

export function countGrowthAreas(areas = []) {
  return areas.filter(({ archivedAt }) => archivedAt == null).length;
}

export function summarizeOverview({ areas = [], goals = [], activities = [] } = {}, now = new Date()) {
  return {
    weeklyActivities: countWeeklyActivities(activities, now),
    activeGoals: countActiveGoals(goals),
    growthAreas: countGrowthAreas(areas),
  };
}

export function sortRecentActivities(activities = []) {
  // Sort a copy. Invalid dates go last; IDs break same-day ties, then input order.
  return [...activities].sort((a, b) => {
    const dateA = parseCalendarDate(a.occurredOn)?.getTime() ?? -Infinity;
    const dateB = parseCalendarDate(b.occurredOn)?.getTime() ?? -Infinity;
    if (dateA !== dateB) return dateA > dateB ? -1 : 1;
    const idA = String(a.id ?? '');
    const idB = String(b.id ?? '');
    return idA < idB ? -1 : idA > idB ? 1 : 0;
  });
}
