import { icon } from './icons.js';

let nextId = 0;

// Escape text and quoted attributes before inserting them into an HTML template.
export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

export function renderButton({ label, variant = 'primary', type = 'button', disabled = false, id } = {}) {
  if (!['primary', 'secondary', 'destructive'].includes(variant)) throw new Error('Unknown button variant');
  if (!['button', 'submit', 'reset'].includes(type)) throw new Error('Unknown button type');
  return `<button class="ui-button ui-button--${variant}" type="${type}"${id ? ` id="${escapeHtml(id)}"` : ''}${disabled ? ' disabled' : ''}>${escapeHtml(label ?? '')}</button>`;
}

export function renderField({
  id = `ui-field-${++nextId}`, name = id, label, type = 'text', value = '',
  hint = '', error = '', required = false, disabled = false, options = [],
  min, max, step,
} = {}) {
  if (!['text', 'textarea', 'select', 'date', 'number'].includes(type)) throw new Error('Unknown field type');
  const safeId = escapeHtml(id);
  const describedBy = [hint && `${id}-hint`, `${id}-error`].filter(Boolean).join(' ');
  const attributes = `id="${safeId}" name="${escapeHtml(name)}" class="ui-control" aria-describedby="${escapeHtml(describedBy)}" aria-invalid="${Boolean(error)}"${required ? ' required' : ''}${disabled ? ' disabled' : ''}`;
  let control;

  if (type === 'textarea') {
    control = `<textarea ${attributes} rows="4">${escapeHtml(value)}</textarea>`;
  } else if (type === 'select') {
    control = `<select ${attributes}>${options.map((option) => `<option value="${escapeHtml(option.value)}"${String(option.value) === String(value) ? ' selected' : ''}${option.disabled ? ' disabled' : ''}>${escapeHtml(option.label)}</option>`).join('')}</select>`;
  } else {
    const limits = type === 'number' || type === 'date'
      ? Object.entries({ min, max, step: type === 'number' ? step : undefined })
        .filter(([, limit]) => limit !== undefined)
        .map(([key, limit]) => ` ${key}="${escapeHtml(limit)}"`).join('')
      : '';
    control = `<input ${attributes} type="${type}" value="${escapeHtml(value)}"${limits}>`;
  }

  return `<div class="ui-field"><label for="${safeId}">${escapeHtml(label ?? '')}${required ? ' <span class="ui-required">(required)</span>' : ''}</label>${control}${hint ? `<p class="ui-hint" id="${safeId}-hint">${escapeHtml(hint)}</p>` : ''}<p class="ui-error" id="${safeId}-error" aria-live="polite"${error ? '' : ' hidden'}>${escapeHtml(error)}</p></div>`;
}

// The caller owns validation rules; this helper only updates the field's presentation.
export function setFieldError(control, message = '') {
  const error = document.getElementById(`${control.id}-error`);
  error.textContent = message;
  error.hidden = !message;
  control.setAttribute('aria-invalid', String(Boolean(message)));
}

// contentHtml is trusted, developer-composed markup (e.g. renderField results).
// Put user text through escapeHtml first; never pass raw user input as contentHtml.
export function renderCard({ title = '', contentHtml = '' } = {}) {
  return `<div class="ui-card">${title ? `<h2 class="ui-card-heading">${escapeHtml(title)}</h2>` : ''}${contentHtml}</div>`;
}

export function renderEmptyState({
  id = `ui-empty-${++nextId}`, title, message, detail = '',
  iconName = 'activity', badge = '', action,
} = {}) {
  if (!['activity', 'goals', 'leaf', 'overview', 'check'].includes(iconName)) throw new Error('Unknown empty-state icon');
  // Actions are internal hash links; arbitrary URL schemes are intentionally unsupported.
  if (action && !/^#\/[a-z0-9-]+$/.test(action.href)) throw new Error('Empty-state actions require an internal hash route');
  return `<section class="full-empty" aria-labelledby="${escapeHtml(id)}"><span class="empty-icon large">${icon(iconName)}</span>${badge ? `<span class="small-tag">${escapeHtml(badge)}</span>` : ''}<h2 id="${escapeHtml(id)}">${escapeHtml(title ?? '')}</h2><p>${escapeHtml(message ?? '')}</p>${detail ? `<p class="empty-detail">${escapeHtml(detail)}</p>` : ''}${action ? `<a class="text-link" href="${escapeHtml(action.href)}">${escapeHtml(action.label)} ${icon('arrow')}</a>` : ''}</section>`;
}
