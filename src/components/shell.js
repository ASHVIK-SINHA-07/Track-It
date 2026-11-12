import { icon } from './icons.js';

export const routes = [
  { id: 'overview', label: 'Overview' },
  { id: 'activity', label: 'Activity' },
  { id: 'goals', label: 'Goals' },
];

export function renderShell() {
  let navigationHtml = '';
  for (const route of routes) {
    navigationHtml += `<a class="nav-link" href="#/${route.id}" data-route="${route.id}">${icon(route.id)}<span>${route.label}</span><span class="nav-indicator" aria-hidden="true"></span></a>`;
  }
  return `
    <a class="skip-link" href="#main">Skip to content</a>
    <div class="app-shell">
      <aside class="sidebar">
        <a href="#/overview" class="brand" aria-label="Track-It overview">
          <span class="brand-mark">${icon('check')}</span><span>track-it<span class="brand-dot">.</span></span>
        </a>
        <p class="nav-caption">YOUR WORKSPACE</p>
        <nav class="navigation" aria-label="Main navigation">
          ${navigationHtml}
        </nav>
        <div class="sidebar-footer">
          <div class="quiet-note">${icon('leaf')}<p>A little progress.<br>A little more you.</p></div>
          <div class="workspace-label"><span class="avatar" aria-hidden="true">Y</span><div>Your personal space<span>Foundation · v0.1</span></div></div>
        </div>
      </aside>
      <div class="content-shell">
        <header class="topbar"><span>Personal workspace <span class="breadcrumb" aria-hidden="true">/</span> <span id="current-view">Overview</span></span><span class="version-badge">M1 · UI foundations</span></header>
        <main id="main" tabindex="-1"></main>
        <footer class="content-footer"><span>Made for your own pace.</span><span>track-it.</span></footer>
      </div>
    </div>`;
}
