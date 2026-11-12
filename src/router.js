import { routes } from './components/shell.js';
import { renderOverview } from './views/overview.js';
import { renderActivity } from './views/activity.js';
import { renderGoals } from './views/goals.js';
import { createWorkspace } from './data/workspace.js';
import { mountActivity } from './components/quick-log.js';

export function startRouter(options = {}) {
  // Tests can supply their own workspace and Activity setup function.
  const workspace = options.workspace || createWorkspace();
  const mountActivityView = options.mountActivityView || mountActivity;
  const main = document.querySelector('#main');
  let cleanUpActivity = null;

  function renderRoute(moveFocus = false) {
    const requestedPage = location.hash.slice(2);
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

    const correctHash = '#/' + currentRoute.id;
    if (location.hash !== correctHash) {
      history.replaceState(null, '', correctHash);
    }

    const query = new URLSearchParams(location.search || '');
    const isSample = query.has('sample');
    let mode = 'personal';
    if (isSample) {
      mode = 'sample';
    }

    // Remove the previous Activity dialog before replacing the page.
    if (cleanUpActivity) {
      cleanUpActivity();
      cleanUpActivity = null;
    }

    const data = workspace.getData(mode);
    const viewOptions = { sample: isSample };

    if (currentRoute.id === 'activity') {
      main.innerHTML = renderActivity(data, viewOptions);
      cleanUpActivity = mountActivityView(main, { workspace: workspace, mode: mode });
    } else if (currentRoute.id === 'goals') {
      main.innerHTML = renderGoals();
    } else {
      main.innerHTML = renderOverview(data, viewOptions);
    }

    document.title = currentRoute.label + ' · Track-It';
    document.querySelector('#current-view').textContent = currentRoute.label;

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
    renderRoute(true);
  }

  document.querySelector('.skip-link').addEventListener('click', skipToContent);
  window.addEventListener('hashchange', handlePageChange);
  renderRoute();
}
