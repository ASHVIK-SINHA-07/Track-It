import { icon } from '../components/icons.js';

export function renderActivity() {
  return `<div class="page-heading"><p class="eyebrow">THE WORK YOU PUT IN</p><h1>Activity<span>.</span></h1><p>A record of the things you’ve done, big and small.</p></div>
    <section class="full-empty" aria-labelledby="activity-empty-title"><span class="empty-icon large">${icon('activity')}</span><span class="small-tag">Coming in a future milestone</span><h2 id="activity-empty-title">Every bit of effort has a place.</h2><p>You’ll be able to record completed work, connect it to a growth area or goal, and look back on what you’ve accomplished.</p><p class="empty-detail">Activity logging and history aren’t available in this foundation preview.</p><a class="text-link" href="#/overview">Back to overview ${icon('arrow')}</a></section>`;
}
