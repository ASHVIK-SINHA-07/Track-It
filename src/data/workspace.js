import { createStarterAreas } from './areas.js';
import { createMockOverview } from './mock.js';
import { validateActivity } from './activity.js';

// One workspace is created when the app starts. Refreshing clears its records.
export function createWorkspace(options = {}) {
  const now = options.now || new Date();
  const personalData = {
    areas: createStarterAreas(now),
    goals: [],
    activities: [],
  };
  const sampleData = createMockOverview(now);
  let nextActivityNumber = 0;

  function getCollection(mode) {
    if (mode === 'personal') {
      return personalData;
    }
    if (mode === 'sample') {
      return sampleData;
    }
    throw new Error('Unknown workspace mode');
  }

  function getData(mode = 'personal') {
    // Return a deep copy so a view cannot change the original records.
    return structuredClone(getCollection(mode));
  }

  function addActivity(input, mode = 'personal', date = new Date()) {
    const data = getCollection(mode);
    const result = validateActivity(input, data);
    const errorNames = Object.keys(result.errors);
    if (errorNames.length > 0) {
      return result;
    }

    nextActivityNumber += 1;
    const timestamp = date.toISOString();
    const values = result.value;
    const activity = {
      id: 'temporary-' + nextActivityNumber,
      areaId: values.areaId,
      goalId: values.goalId,
      title: values.title,
      note: values.note,
      occurredOn: values.occurredOn,
      durationMinutes: values.durationMinutes,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    data.activities.push(activity);
    return { errors: {}, activity: structuredClone(activity) };
  }

  // These functions remember the data above (a JavaScript closure).
  return { getData: getData, addActivity: addActivity };
}
