import { renderEmptyState } from '../components/ui.js';

export function renderActivity() {
  return `<div class="page-heading"><p class="eyebrow">THE WORK YOU PUT IN</p><h1>Activity<span>.</span></h1><p>A record of the things you’ve done, big and small.</p></div>
    ${renderEmptyState({
      id: 'activity-empty-title',
      title: 'Every bit of effort has a place.',
      message: 'You’ll be able to record completed work, connect it to a growth area or goal, and look back on what you’ve accomplished.',
      detail: 'Activity logging and history aren’t available in this foundation preview.',
      badge: 'Coming in a future milestone',
      action: { label: 'Back to overview', href: '#/overview' },
    })}`;
}
