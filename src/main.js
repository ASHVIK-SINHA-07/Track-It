import './styles/tokens.css';
import './styles/components.css';
import './styles/app.css';
import { renderShell } from './components/shell.js';
import { startRouter } from './router.js';

const app = document.querySelector('#app');
app.innerHTML = renderShell();
startRouter();

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
