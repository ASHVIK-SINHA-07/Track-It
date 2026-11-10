import './styles/tokens.css';
import './styles/app.css';
import { renderShell } from './components/shell.js';
import { startRouter } from './router.js';

document.querySelector('#app').innerHTML = renderShell();
startRouter();
