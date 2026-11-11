import { routes } from './components/shell.js';
import { renderOverview } from './views/overview.js';
import { renderActivity } from './views/activity.js';
import { renderGoals } from './views/goals.js';
import { createWorkspace } from './data/workspace.js';
import { mountActivity } from './components/quick-log.js';

const views = { overview: renderOverview, activity: renderActivity, goals: renderGoals };

export function startRouter({ workspace = createWorkspace(), mountActivityView = mountActivity } = {}) {
  const main = document.querySelector('#main');
  let unmountActivity;

  function renderRoute(moveFocus = false) {
    const requested = location.hash.slice(2);
    const route = routes.find(({ id }) => location.hash.startsWith('#/') && id === requested) ?? routes[0];

    // Replace invalid URLs rather than adding another browser history entry.
    if (location.hash !== `#/${route.id}`) {
      history.replaceState(null, '', `#/${route.id}`);
    }

    const sample = new URLSearchParams(location.search ?? '').has('sample');
    const mode = sample ? 'sample' : 'personal';
    unmountActivity?.();
    unmountActivity = undefined;
    main.innerHTML = views[route.id](workspace.getData(mode), { sample });
    if (route.id === 'activity') unmountActivity = mountActivityView(main, { workspace, mode });
    document.title = `${route.label} · Track-It`;
    document.querySelector('#current-view').textContent = route.label;
    document.querySelectorAll('[data-route]').forEach((link) => {
      if (link.dataset.route === route.id) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    if (moveFocus) {
      main.focus({ preventScroll: true });
      window.scrollTo(0, 0);
    }
  }

  // Skip to content without adding a non-route fragment to browser history.
  document.querySelector('.skip-link').addEventListener('click', (event) => {
    event.preventDefault();
    main.focus();
  });
  window.addEventListener('hashchange', () => renderRoute(true));
  renderRoute();
}
