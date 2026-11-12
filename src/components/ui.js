import { icon } from './icons.js';

let nextId = 0;

// Escape text before placing it inside an HTML string or quoted attribute.
export function escapeHtml(value) {
  let text = String(value);
  text = text.replaceAll('&', '&amp;');
  text = text.replaceAll('<', '&lt;');
  text = text.replaceAll('>', '&gt;');
  text = text.replaceAll('"', '&quot;');
  text = text.replaceAll("'", '&#39;');
  return text;
}

export function renderButton(options = {}) {
  let variant = options.variant;
  if (variant === undefined) variant = 'primary';
  let type = options.type;
  if (type === undefined) type = 'button';
  let label = '';
  if (options.label != null) label = options.label;
  if (!['primary', 'secondary', 'destructive'].includes(variant)) {
    throw new Error('Unknown button variant');
  }
  if (!['button', 'submit', 'reset'].includes(type)) {
    throw new Error('Unknown button type');
  }

  let attributes = '';
  if (options.id) attributes += ` id="${escapeHtml(options.id)}"`;
  if (options.disabled) attributes += ' disabled';
  return `<button class="ui-button ui-button--${variant}" type="${type}"${attributes}>${escapeHtml(label)}</button>`;
}

export function renderField(options = {}) {
  let id = options.id;
  if (id === undefined) {
    nextId += 1;
    id = 'ui-field-' + nextId;
  }
  let name = options.name;
  if (name === undefined) name = id;
  let type = options.type;
  if (type === undefined) type = 'text';
  const hint = options.hint || '';
  const error = options.error || '';
  let label = '';
  if (options.label != null) label = options.label;
  let value = options.value;
  if (value === undefined) value = '';
  if (!['text', 'textarea', 'select', 'date', 'number'].includes(type)) {
    throw new Error('Unknown field type');
  }

  const safeId = escapeHtml(id);
  let describedBy = id + '-error';
  if (hint) describedBy = id + '-hint ' + describedBy;
  let attributes = `id="${safeId}" name="${escapeHtml(name)}" class="ui-control" aria-describedby="${escapeHtml(describedBy)}" aria-invalid="${Boolean(error)}"`;
  if (options.required) attributes += ' required';
  if (options.disabled) attributes += ' disabled';

  let lengthLimit = '';
  if (options.maxLength !== undefined) {
    lengthLimit = ` maxlength="${escapeHtml(options.maxLength)}"`;
  }

  let controlHtml = '';
  if (type === 'textarea') {
    controlHtml = `<textarea ${attributes}${lengthLimit} rows="4">${escapeHtml(value)}</textarea>`;
  } else if (type === 'select') {
    let optionsHtml = '';
    const choices = options.options || [];
    for (const choice of choices) {
      let choiceAttributes = '';
      if (String(choice.value) === String(value)) choiceAttributes += ' selected';
      if (choice.disabled) choiceAttributes += ' disabled';
      optionsHtml += `<option value="${escapeHtml(choice.value)}"${choiceAttributes}>${escapeHtml(choice.label)}</option>`;
    }
    controlHtml = `<select ${attributes}>${optionsHtml}</select>`;
  } else {
    let limits = '';
    if (type === 'number' || type === 'date') {
      if (options.min !== undefined) limits += ` min="${escapeHtml(options.min)}"`;
      if (options.max !== undefined) limits += ` max="${escapeHtml(options.max)}"`;
      if (type === 'number' && options.step !== undefined) limits += ` step="${escapeHtml(options.step)}"`;
    }
    controlHtml = `<input ${attributes}${lengthLimit} type="${type}" value="${escapeHtml(value)}"${limits}>`;
  }

  let requiredHtml = '';
  if (options.required) requiredHtml = ' <span class="ui-required">(required)</span>';
  let hintHtml = '';
  if (hint) hintHtml = `<p class="ui-hint" id="${safeId}-hint">${escapeHtml(hint)}</p>`;
  let hidden = ' hidden';
  if (error) hidden = '';
  return `<div class="ui-field"><label for="${safeId}">${escapeHtml(label)}${requiredHtml}</label>${controlHtml}${hintHtml}<p class="ui-error" id="${safeId}-error" aria-live="polite"${hidden}>${escapeHtml(error)}</p></div>`;
}

// Validation rules belong to the form. This helper only displays an error.
export function setFieldError(control, message = '') {
  const error = document.getElementById(control.id + '-error');
  error.textContent = message;
  error.hidden = !message;
  control.setAttribute('aria-invalid', String(Boolean(message)));
}

// contentHtml must be trusted markup. Escape user text before including it.
export function renderCard(options = {}) {
  let headingHtml = '';
  if (options.title) headingHtml = `<h2 class="ui-card-heading">${escapeHtml(options.title)}</h2>`;
  const contentHtml = options.contentHtml || '';
  return `<div class="ui-card">${headingHtml}${contentHtml}</div>`;
}

export function renderEmptyState(options = {}) {
  let id = options.id;
  if (id === undefined) {
    nextId += 1;
    id = 'ui-empty-' + nextId;
  }
  let iconName = options.iconName;
  if (iconName === undefined) iconName = 'activity';
  if (!['activity', 'goals', 'leaf', 'overview', 'check'].includes(iconName)) {
    throw new Error('Unknown empty-state icon');
  }
  // Only internal routes are allowed as empty-state actions.
  if (options.action && !/^#\/[a-z0-9-]+$/.test(options.action.href)) {
    throw new Error('Empty-state actions require an internal hash route');
  }

  let title = '';
  if (options.title != null) title = options.title;
  let message = '';
  if (options.message != null) message = options.message;
  let badgeHtml = '';
  if (options.badge) badgeHtml = `<span class="small-tag">${escapeHtml(options.badge)}</span>`;
  let detailHtml = '';
  if (options.detail) detailHtml = `<p class="empty-detail">${escapeHtml(options.detail)}</p>`;
  let actionHtml = '';
  if (options.action) {
    actionHtml = `<a class="text-link" href="${escapeHtml(options.action.href)}">${escapeHtml(options.action.label)} ${icon('arrow')}</a>`;
  }
  return `<section class="full-empty" aria-labelledby="${escapeHtml(id)}"><span class="empty-icon large">${icon(iconName)}</span>${badgeHtml}<h2 id="${escapeHtml(id)}">${escapeHtml(title)}</h2><p>${escapeHtml(message)}</p>${detailHtml}${actionHtml}</section>`;
}
