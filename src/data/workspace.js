import { createStarterAreas } from './areas.js';
import { createMockOverview } from './mock.js';
import { validateActivity } from './activity.js';

// Owned by the router for this page session. No browser storage or subscriptions.
export function createWorkspace({ now = new Date() } = {}) {
  const workspaces = {
    personal: { areas: createStarterAreas(now), goals: [], activities: [] },
    sample: createMockOverview(now),
  };
  let sequence = 0;
  function getData(mode = 'personal') {
    if (!Object.hasOwn(workspaces, mode)) throw new Error('Unknown workspace mode');
    return workspaces[mode];
  }
  return {
    // Snapshots prevent callers from mutating another view's records.
    getData(mode = 'personal') { return structuredClone(getData(mode)); },
    addActivity(input, mode = 'personal', date = new Date()) {
      const data = getData(mode);
      const result = validateActivity(input, data);
      if (Object.keys(result.errors).length) return result;
      const timestamp = date.toISOString();
      const activity = { ...result.value, id: `temporary-${++sequence}`, createdAt: timestamp, updatedAt: timestamp };
      data.activities.push(activity);
      return { errors: {}, activity: { ...activity } };
    },
  };
}
