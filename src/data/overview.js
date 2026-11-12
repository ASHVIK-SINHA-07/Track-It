// Parse calendar dates in local time; new Date('YYYY-MM-DD') would use UTC.
export function parseCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const parts = value.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(0, 0, 0, 0);

  // JavaScript rolls impossible dates into the next month. Reject those dates.
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

export function countWeeklyActivities(activities = [], now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let daysSinceMonday = start.getDay() - 1;
  if (start.getDay() === 0) {
    daysSinceMonday = 6; // Sunday is day 0 in JavaScript.
  }
  start.setDate(start.getDate() - daysSinceMonday);

  // Move by calendar days so daylight-saving changes are handled correctly.
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  let count = 0;
  for (const activity of activities) {
    const date = parseCalendarDate(activity.occurredOn);
    if (date && date >= start && date < end) {
      count += 1;
    }
  }
  return count;
}

export function countActiveGoals(goals = []) {
  let count = 0;
  for (const goal of goals) {
    if (goal.status === 'in_progress') {
      count += 1;
    }
  }
  return count;
}

export function countGrowthAreas(areas = []) {
  let count = 0;
  for (const area of areas) {
    if (area.archivedAt == null) {
      count += 1;
    }
  }
  return count;
}

export function summarizeOverview(data = {}, now = new Date()) {
  return {
    weeklyActivities: countWeeklyActivities(data.activities || [], now),
    activeGoals: countActiveGoals(data.goals || []),
    growthAreas: countGrowthAreas(data.areas || []),
  };
}

function compareActivities(first, second) {
  const firstDate = parseCalendarDate(first.occurredOn);
  const secondDate = parseCalendarDate(second.occurredOn);
  let firstTime = -Infinity;
  let secondTime = -Infinity;
  if (firstDate) {
    firstTime = firstDate.getTime();
  }
  if (secondDate) {
    secondTime = secondDate.getTime();
  }

  // A negative result puts the first record before the second.
  if (firstTime > secondTime) return -1;
  if (firstTime < secondTime) return 1;

  let firstId = '';
  let secondId = '';
  if (first.id != null) firstId = String(first.id);
  if (second.id != null) secondId = String(second.id);
  if (firstId < secondId) return -1;
  if (firstId > secondId) return 1;
  return 0;
}

export function sortRecentActivities(activities = []) {
  // sort() changes an array, so sort a copy to protect the original.
  const sortedActivities = activities.slice();
  sortedActivities.sort(compareActivities);
  return sortedActivities;
}
