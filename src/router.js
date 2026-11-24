import { routes } from './components/shell.js';
import { renderOverview } from './views/overview.js';
import { renderActivity } from './views/activity.js';
import { renderGoals } from './views/goals.js';
import { renderGoalDetail } from './views/goal-detail.js';
import { createWorkspace } from './data/workspace.js';
import { findGoal } from './data/goals.js';
import { mountActivity } from './components/quick-log.js';
import { mountGoals } from './components/create-goal.js';
import { mountGoalDetail } from './components/goal-detail.js';
import { mountSettings, renderSettings } from './components/settings.js';

const goalDetailPrefix = '#/goals/';

function readGoalId(hash) {
  try {
    return decodeURIComponent(hash.slice(goalDetailPrefix.length));
  } catch {
    return '';
  }
}

export function startRouter(options = {}) {
  // Tests can supply their own workspace and page setup functions.
  const workspace = options.workspace || createWorkspace();
  const mountActivityView = options.mountActivityView || mountActivity;
  const mountGoalsView = options.mountGoalsView || mountGoals;
  const mountGoalDetailView = options.mountGoalDetailView || mountGoalDetail;
  const main = document.querySelector('#main');
  let cleanUpActivity = null;
  let cleanUpGoals = null;
  let cleanUpSettings = null;

  function renderRoute(moveFocus = false) {
    const isGoalDetail = location.hash.startsWith(goalDetailPrefix);
    const requestedPage = isGoalDetail ? 'goals' : location.hash.slice(2);
    let currentRoute = routes[0];

    // Start with Overview, then look for a route matching the URL.
    if (location.hash.startsWith('#/')) {
      for (const route of routes) {
        if (route.id === requestedPage) {
          currentRoute = route;
          break;
        }
      }
    }
    if (location.hash === '#/settings') currentRoute = { id: 'settings', label: 'Settings' };

    const correctHash = '#/' + currentRoute.id;
    if (!isGoalDetail && location.hash !== correctHash) {
      history.replaceState(null, '', correctHash);
    }

    const query = new URLSearchParams(location.search || '');
    const isSample = query.has('sample');
    let mode = 'personal';
    if (isSample) {
      mode = 'sample';
    }

    // Remove the previous page's dialog before replacing its HTML.
    if (cleanUpActivity) {
      cleanUpActivity();
      cleanUpActivity = null;
    }

    if (cleanUpGoals) {
      cleanUpGoals();
      cleanUpGoals = null;
    }
    if (cleanUpSettings) {
      cleanUpSettings();
      cleanUpSettings = null;
    }

    const data = workspace.getData(mode);
    const viewOptions = { sample: isSample };

    if (currentRoute.id === 'settings') {
      main.innerHTML = renderSettings(data, viewOptions);
      cleanUpSettings = mountSettings(main, { workspace: workspace, mode: mode });
    } else if (currentRoute.id === 'activity') {
      main.innerHTML = renderActivity(data, viewOptions);
      cleanUpActivity = mountActivityView(main, { workspace: workspace, mode: mode });
    } else if (isGoalDetail) {
      const goalId = readGoalId(location.hash);
      const goal = findGoal(data.goals, goalId);
      main.innerHTML = renderGoalDetail(data, goal, viewOptions);
      if (goal) {
        cleanUpGoals = mountGoalDetailView(main, { workspace: workspace, mode: mode, goal: goal, areas: data.areas });
      }
    } else if (currentRoute.id === 'goals') {
      main.innerHTML = renderGoals(data, viewOptions);
      cleanUpGoals = mountGoalsView(main, { workspace: workspace, mode: mode });
    } else {
      main.innerHTML = renderOverview(data, viewOptions);
    }

    document.title = currentRoute.label + ' · Track-It';
    document.querySelector('#current-view').textContent = currentRoute.label;
    const workspaceLabel = document.querySelector('#workspace-mode');
    if (workspaceLabel) workspaceLabel.textContent = isSample ? 'Sample workspace' : 'Personal workspace';

    const navigationLinks = document.querySelectorAll('[data-route]');
    for (const link of navigationLinks) {
      if (link.dataset.route === currentRoute.id) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    }

    if (moveFocus) {
      main.focus({ preventScroll: true });
      window.scrollTo(0, 0);
    }
  }

  function skipToContent(event) {
    event.preventDefault();
    main.focus();
  }

  function handlePageChange() {
    const pending = workspace.whenIdle();
    if (!pending) {
      renderRoute(true);
      return;
    }
    const targetHash = location.hash;
    pending.then(function afterWrite() {
      if (location.hash === targetHash) renderRoute(true);
    });
  }

  document.querySelector('.skip-link').addEventListener('click', skipToContent);
  window.addEventListener('hashchange', handlePageChange);
  renderRoute();
}
