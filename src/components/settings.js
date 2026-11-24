import { AREA_COLORS, AREA_ICONS, AREA_NAME_LIMIT } from '../data/areas.js';
import { parseBackup } from '../data/backup.js';
import { createDialog, confirmAction } from './dialog.js';
import { icon } from './icons.js';
import { escapeHtml, renderButton, renderField, setFieldError, storageErrorMessage } from './ui.js';

function choices(values, names = values) {
  return values.map(function getChoice(value, index) {
    return { value: value, label: names[index] };
  });
}

function countLabel(count, singular, plural = singular + 's') {
  return count + ' ' + (count === 1 ? singular : plural);
}

function renderAreaList(areas, archived) {
  let items = '';
  for (const area of areas) {
    if ((area.archivedAt != null) !== archived) continue;
    const name = escapeHtml(area.name);
    const id = escapeHtml(area.id);
    const iconName = AREA_ICONS.includes(area.icon) ? area.icon : 'leaf';
    const color = AREA_COLORS.includes(area.color) ? area.color : 'sage';
    const archive = archived ? '' : `<button class="ui-button ui-button--secondary" type="button" data-archive-area="${id}" aria-label="Archive area: ${name}">Archive</button>`;
    items += `<li class="recent-item"><div class="area-row ${color}">
      <span class="area-number">${icon(iconName)}</span><h3>${name}</h3></div>
      <div class="ui-actions">
        <button class="ui-button ui-button--secondary" type="button" data-edit-area="${id}" aria-label="Edit area: ${name}">Edit</button>
        ${archive}
      </div></li>`;
  }
  if (items) return `<ul class="recent-list ui-card">${items}</ul>`;
  return archived ? '<p class="muted">No archived growth areas.</p>' : '<p class="muted">No active growth areas.</p>';
}

function renderAreas(areas) {
  return `<div class="ui-stack"><h2>Active growth areas</h2>${renderAreaList(areas, false)}</div>
    <div class="ui-stack"><h2>Archived growth areas</h2>${renderAreaList(areas, true)}</div>`;
}

export function renderSettings(data, options = {}) {
  return `<div class="page-heading"><h1>Settings<span>.</span></h1></div>
    <section class="ui-stack" aria-labelledby="area-settings-heading">
      <div class="section-heading activity-heading">
        <h2 id="area-settings-heading" tabindex="-1">Manage growth areas</h2>
        ${renderButton({ label: 'Create Growth Area', id: 'create-area' })}
      </div>
      ${options.sample ? '<p class="ui-hint">Sample changes reset on reload.</p>' : ''}
      <p id="area-status" class="ui-hint" role="status"></p>
      <div id="area-lists" class="ui-stack">${renderAreas(data.areas)}</div>
    </section>
    <section class="ui-card ui-stack backup-settings" aria-labelledby="backup-heading">
      <h2 id="backup-heading">Backup and restore</h2>
      ${options.sample ? '<p>Backups are available in the personal workspace.</p><div><a class="text-link" href="?#/settings">Open personal settings</a></div>' : `
        <p>Download a JSON backup of your personal growth areas, goals, and activities.</p>
        <div class="ui-actions">${renderButton({ label: 'Export Backup', id: 'export-backup', variant: 'secondary' })}</div>
        <div class="ui-field"><label for="backup-file">JSON backup to restore</label>
          <input class="ui-control" id="backup-file" type="file" accept=".json,application/json" aria-describedby="backup-error"></div>
        <div class="ui-actions">${renderButton({ label: 'Review Backup', id: 'review-backup', variant: 'secondary' })}</div>
        <p id="backup-error" class="ui-error" role="alert"></p>
        <p id="backup-status" class="ui-hint" role="status"></p>`}
    </section>`;
}

function openAreaEditor(area, options) {
  const content = document.createElement('div');
  content.innerHTML = `<form class="ui-stack" novalidate>
    ${renderField({ id: 'area-name', name: 'name', label: 'Growth area name', required: true, value: area?.name, maxLength: AREA_NAME_LIMIT })}
    ${renderField({ id: 'area-icon', name: 'icon', label: 'Icon', type: 'select', value: area?.icon || 'leaf',
      options: choices(AREA_ICONS, ['Leaf', 'Target', 'Grid', 'List', 'Check']) })}
    ${renderField({ id: 'area-color', name: 'color', label: 'Color', type: 'select', value: area?.color || 'sage',
      options: choices(AREA_COLORS, ['Sage', 'Blue', 'Purple', 'Sand', 'Rose']) })}
    <p class="ui-error" role="alert"></p>
    ${renderButton({ label: 'Save Growth Area', type: 'submit' })}
  </form>`;

  const form = content.querySelector('form');
  const nameField = form.elements.namedItem('name');
  const submit = form.querySelector('button[type="submit"]');
  const notice = form.querySelector('[role="alert"]');
  nameField.autofocus = true;
  const dialog = createDialog({ title: area ? 'Edit Growth Area' : 'Create Growth Area', content: content });
  document.body.append(dialog.element);

  async function submitArea(event) {
    event.preventDefault();
    if (submit.disabled) return;
    notice.textContent = '';
    submit.disabled = true;
    dialog.setBusy(true);
    let result;
    try {
      const input = Object.fromEntries(new FormData(form));
      result = await options.workspace.saveArea(input, area?.id ?? null, options.mode);
    } catch (error) {
      notice.textContent = storageErrorMessage(error, 'Could not save the growth area. Try again.');
      return;
    } finally {
      submit.disabled = false;
      dialog.setBusy(false);
    }

    if (!dialog.element.isConnected) return;
    notice.textContent = result.errors.area || '';
    let firstError;
    for (const name of ['name', 'icon', 'color']) {
      const field = form.elements.namedItem(name);
      setFieldError(field, result.errors[name] || '');
      if (!firstError && result.errors[name]) firstError = field;
    }
    if (firstError) firstError.focus();
    if (Object.keys(result.errors).length) return;

    dialog.close();
    options.onSaved('Growth area saved.', Boolean(area));
  }

  form.addEventListener('submit', submitArea);
  dialog.element.addEventListener('close', function removeDialog() { dialog.element.remove(); });
  dialog.open(options.trigger);
  return dialog;
}

export function mountSettings(main, options) {
  const workspace = options.workspace;
  const mode = options.mode;
  const lists = main.querySelector('#area-lists');
  const notice = main.querySelector('#area-status');
  const heading = main.querySelector('#area-settings-heading');
  const create = main.querySelector('#create-area');
  const exportButton = main.querySelector('#export-backup');
  const reviewButton = main.querySelector('#review-backup');
  const backupFile = main.querySelector('#backup-file');
  const backupError = main.querySelector('#backup-error');
  const backupStatus = main.querySelector('#backup-status');
  let dialog;

  function refreshAreas(message, moveFocus) {
    if (!lists.isConnected) return;
    lists.innerHTML = renderAreas(workspace.getData(mode).areas);
    if (moveFocus) heading.focus();
    notice.textContent = message;
  }

  function editArea(area, trigger) {
    dialog = openAreaEditor(area, { workspace: workspace, mode: mode, trigger: trigger, onSaved: refreshAreas });
  }

  function createArea() { editArea(null, create); }

  function manageArea(event) {
    const trigger = event.target.closest('button');
    if (!trigger) return;
    const id = trigger.dataset.editArea || trigger.dataset.archiveArea;
    const area = workspace.getData(mode).areas.find(record => record.id === id);
    if (!area) return;
    if (trigger.dataset.editArea) {
      editArea(area, trigger);
      return;
    }
    dialog = confirmAction({
      title: 'Archive Growth Area?',
      description: '“' + area.name + '” will stop appearing in new activity and goal forms. Its history will be kept.',
      confirmLabel: 'Archive Growth Area',
      trigger: trigger,
      onConfirm: async function archive() {
        let result;
        try {
          result = await workspace.archiveArea(id, mode);
        } catch (error) {
          throw new Error(storageErrorMessage(error, 'Could not archive the growth area. Try again.'));
        }
        if (result.errors.area) throw new Error(result.errors.area);
      },
      onDone: function showArchive() { refreshAreas('Growth area archived.', true); },
    });
  }

  async function downloadBackup() {
    if (exportButton.disabled) return;
    exportButton.disabled = true;
    backupError.textContent = '';
    backupStatus.textContent = '';
    try {
      const backup = await workspace.exportBackup(mode);
      if (!exportButton.isConnected) return;
      const url = URL.createObjectURL(new Blob([backup], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'track-it-backup-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(function releaseFile() { URL.revokeObjectURL(url); }, 1000);
      backupStatus.textContent = 'Backup exported.';
    } catch (error) {
      backupError.textContent = 'Could not export your backup. ' + error.message;
    } finally {
      exportButton.disabled = false;
    }
  }

  async function reviewBackup() {
    if (reviewButton.disabled) return;
    backupError.textContent = '';
    backupStatus.textContent = '';
    const file = backupFile.files[0];
    if (!file) {
      backupError.textContent = 'Choose a JSON backup file to review.';
      backupFile.focus();
      return;
    }
    reviewButton.disabled = true;
    backupFile.disabled = true;
    let text;
    let data;
    try {
      text = await file.text();
      data = parseBackup(text);
    } catch (error) {
      backupError.textContent = error.message;
      return;
    } finally {
      reviewButton.disabled = false;
      backupFile.disabled = false;
    }
    if (!reviewButton.isConnected) return;
    if (dialog?.element.open) {
      backupError.textContent = 'Close the other dialog and review the backup again.';
      return;
    }
    dialog = confirmAction({
      title: 'Restore Backup?',
      description: `This will replace all existing personal data with ${countLabel(data.areas.length, 'growth area')}, ${countLabel(data.goals.length, 'goal')}, ${countLabel(data.activities.length, 'activity', 'activities')}, and ${countLabel(data.settings.length, 'setting')}. Export a backup first if you want to keep your current data.`,
      confirmLabel: 'Replace Personal Data',
      trigger: reviewButton,
      onConfirm: async function restore() {
        try {
          await workspace.restoreBackup(text, mode);
        } catch (error) {
          throw new Error('Could not restore the backup. Existing data was kept. ' + storageErrorMessage(error, error.message));
        }
      },
      onDone: function showRestoration() {
        if (!reviewButton.isConnected) return;
        backupFile.value = '';
        refreshAreas('', false);
        backupStatus.textContent = 'Backup restored.';
      },
    });
  }

  create.addEventListener('click', createArea);
  lists.addEventListener('click', manageArea);
  exportButton?.addEventListener('click', downloadBackup);
  reviewButton?.addEventListener('click', reviewBackup);
  return function cleanUpSettings() {
    create.removeEventListener('click', createArea);
    lists.removeEventListener('click', manageArea);
    exportButton?.removeEventListener('click', downloadBackup);
    reviewButton?.removeEventListener('click', reviewBackup);
    dialog?.element.remove();
  };
}
