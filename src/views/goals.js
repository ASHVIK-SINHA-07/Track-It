import { renderEmptyState } from '../components/ui.js';

export function renderGoals() {
  return `<div class="page-heading"><p class="eyebrow">A SENSE OF DIRECTION</p><h1>Goals<span>.</span></h1><p>Give your everyday effort something meaningful to connect to.</p></div>
    ${renderEmptyState({
      id: 'goals-empty-title', iconName: 'goals',
      title: 'Make space for what matters.',
      message: 'You’ll be able to define goals, give them a growth area, and connect completed activities to the things you want to work toward.',
      detail: 'Goal creation and tracking aren’t available in this foundation preview.',
      badge: 'Coming in a future milestone',
      action: { label: 'Back to overview', href: '#/overview' },
    })}`;
}
