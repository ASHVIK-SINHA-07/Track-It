import './styles/tokens.css';
import './styles/components.css';
import './styles/app.css';
import { renderShell } from './components/shell.js';
import { startRouter } from './router.js';
import { createWorkspace, loadWorkspace } from './data/workspace.js';

const app = document.querySelector('#app');
app.innerHTML = renderShell();
const main = document.querySelector('#main');

async function startApp() {
  const sample = new URLSearchParams(location.search).has('sample');
  if (sample) {
    startRouter({ workspace: createWorkspace() });
    return;
  }

  main.innerHTML = '<p class="ui-card" role="status">Loading your workspace…</p>';
  let workspace;
  try {
    workspace = await loadWorkspace();
  } catch (error) {
    main.innerHTML = `<section class="ui-card ui-stack"><h1>Workspace unavailable</h1>
      <p id="workspace-error" role="alert"></p>
      <div class="ui-actions"><button id="retry-workspace" class="ui-button ui-button--primary" type="button">Retry</button>
      <a class="text-link" href="?sample#/overview">Explore sample data</a></div></section>`;
    main.querySelector('#workspace-error').textContent = error.message;
    main.querySelector('#retry-workspace').addEventListener('click', startApp);
    main.focus();
    return;
  }
  startRouter({ workspace: workspace });
}

startApp();

function showDevelopmentExamples(showcaseModule) {
  showcaseModule.mountShowcase();
}

// Load examples only when ?ui is present during development.
// Vite removes this branch from production builds.
if (import.meta.env.DEV) {
  const query = new URLSearchParams(location.search);
  if (query.has('ui')) {
    import('./dev/showcase.js').then(showDevelopmentExamples);
  }
}
