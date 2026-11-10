import './styles/tokens.css';
import './styles/components.css';
import './styles/app.css';
import { renderShell } from './components/shell.js';
import { startRouter } from './router.js';

document.querySelector('#app').innerHTML = renderShell();
startRouter();

// Vite removes this branch and its showcase module from production builds.
if (import.meta.env.DEV && new URLSearchParams(location.search).has('ui')) {
  import('./dev/showcase.js').then(({ mountShowcase }) => mountShowcase());
}
