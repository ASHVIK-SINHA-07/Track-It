import { icon } from '../components/icons.js';

const areas = [
  ['01', 'DSA & Academics', 'Build understanding, one concept at a time.', 'sage'],
  ['02', 'Portfolio Projects', 'Turn what you learn into something real.', 'blue'],
  ['03', 'Creative Skills', 'Make room to explore and experiment.', 'purple'],
  ['04', 'Content Creation', 'Share your ideas and your perspective.', 'sand'],
  ['05', 'Personal Development', 'Invest in the person you are becoming.', 'rose'],
];

export function renderOverview() {
  return `
    <div class="page-heading"><p class="eyebrow">THE BIG PICTURE</p><h1>Your progress, at a glance<span>.</span></h1><p>A space for what you’ve done, and where it’s taking you.</p></div>
    <div class="foundation-note"><span class="status-dot" aria-hidden="true"></span><p>Your workspace is taking shape. Activity logging and goal tracking are coming in future milestones.</p><span class="small-tag">Foundation preview</span></div>
    <section class="summary-grid" aria-label="Progress summary placeholders">
      ${[
      ['activity', 'Activities recorded', 'Completed work, collected here'],
      ['goals', 'Active goals', 'A little direction for your effort'],
      ['leaf', 'Growth areas', 'Room for every part of you'],
    ].map(([symbol, title, description]) => `<article class="ui-card summary-card"><div class="summary-label"><span>${title}</span>${icon(symbol)}</div><p class="summary-value"><span aria-hidden="true">—</span><span class="sr-only">Not available yet</span></p><p class="muted">${description}</p></article>`).join('')}
    </section>
    <section class="growth-section" aria-labelledby="growth-title">
      <div class="section-heading"><div><h2 id="growth-title">Room to grow</h2><p>The different parts of your journey, in one place.</p></div><span class="small-tag">Example areas</span></div>
      <div class="growth-grid">${areas.map(([number, title, description, color]) => `<article class="ui-card growth-card ${color}"><span class="area-number">${number}</span><h3>${title}</h3><p>${description}</p><span class="area-footnote">Example growth area</span></article>`).join('')}</div>
    </section>
    <section class="recent-section" aria-labelledby="recent-title">
      <div class="section-heading"><div><h2 id="recent-title">Recent activity</h2><p>Your completed work will find a home here.</p></div><a class="text-link" href="#/activity">View activity ${icon('arrow')}</a></div>
      <div class="compact-empty"><span class="empty-icon">${icon('activity')}</span><div><h3>A fresh start</h3><p>When activity logging arrives, this space will tell your story.</p></div><span class="small-tag">Coming later</span></div>
    </section>`;
}
