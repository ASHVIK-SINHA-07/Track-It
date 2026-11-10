import { icon } from '../components/icons.js';

export function renderGoals() {
  return `<div class="page-heading"><p class="eyebrow">A SENSE OF DIRECTION</p><h1>Goals<span>.</span></h1><p>Give your everyday effort something meaningful to connect to.</p></div>
    <section class="full-empty" aria-labelledby="goals-empty-title"><span class="empty-icon large">${icon('goals')}</span><span class="small-tag">Coming in a future milestone</span><h2 id="goals-empty-title">Make space for what matters.</h2><p>You’ll be able to define goals, give them a growth area, and connect completed activities to the things you want to work toward.</p><p class="empty-detail">Goal creation and tracking aren’t available in this foundation preview.</p><a class="text-link" href="#/overview">Back to overview ${icon('arrow')}</a></section>`;
}
