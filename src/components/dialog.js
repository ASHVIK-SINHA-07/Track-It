// A DOM factory keeps event listeners alongside the dialog they belong to.
export function createDialog(options = {}) {
  const title = options.title;
  const description = options.description || '';
  const content = options.content;
  const element = document.createElement('dialog');
  element.className = 'ui-dialog';
  const heading = document.createElement('h2');
  heading.id = `ui-dialog-${++dialogCount}-title`;
  heading.textContent = title;
  element.setAttribute('aria-labelledby', heading.id);

  const header = document.createElement('div');
  header.className = 'ui-dialog-header';
  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'ui-button ui-button--secondary';
  closeButton.textContent = 'Close';
  closeButton.setAttribute('aria-label', 'Close dialog');
  header.append(heading, closeButton);
  element.append(header);

  if (description) {
    const text = document.createElement('p');
    text.id = `ui-dialog-${dialogCount}-description`;
    text.className = 'ui-dialog-description';
    text.textContent = description;
    element.setAttribute('aria-describedby', text.id);
    element.append(text);
  }

  const body = document.createElement('div');
  body.className = 'ui-dialog-body';
  if (content) body.append(content); // Accept a DOM node, never an HTML string.
  element.append(body);

  let opener;
  let busy = false;
  function close() {
    element.close();
  }
  closeButton.addEventListener('click', function dismiss() {
    if (!busy) close();
  });
  element.addEventListener('cancel', function handleEscape(event) {
    if (busy) event.preventDefault();
  });
  function restoreFocus() {
    if (opener && opener.isConnected) {
      opener.focus();
    }
  }
  element.addEventListener('close', restoreFocus);

  function open(trigger = document.activeElement) {
    if (element.open) return;
    opener = trigger;
    element.showModal(); // The browser handles modal focus and Escape.
  }

  function setBusy(value) {
    busy = value;
    closeButton.disabled = value;
  }

  return { element: element, open: open, close: close, setBusy: setBusy };
}

let dialogCount = 0;

export function confirmAction(options) {
  const content = document.createElement('div');
  content.className = 'ui-stack';
  content.innerHTML = `<p role="alert" class="ui-error"></p>
    <div class="ui-actions">
      <button class="ui-button ui-button--secondary" type="button" data-cancel>Cancel</button>
      <button class="ui-button ui-button--destructive" type="button" data-confirm></button>
    </div>`;
  const cancel = content.querySelector('[data-cancel]');
  const confirm = content.querySelector('[data-confirm]');
  const notice = content.querySelector('[role="alert"]');
  cancel.autofocus = true;
  confirm.textContent = options.confirmLabel;
  const dialog = createDialog({ title: options.title, description: options.description, content: content });
  document.body.append(dialog.element);

  async function runAction() {
    if (confirm.disabled) return;
    dialog.setBusy(true);
    cancel.disabled = true;
    confirm.disabled = true;
    notice.textContent = '';
    try {
      await options.onConfirm();
    } catch (error) {
      notice.textContent = error.message;
      return;
    } finally {
      dialog.setBusy(false);
      cancel.disabled = false;
      confirm.disabled = false;
    }
    dialog.close();
    options.onDone?.();
  }

  cancel.addEventListener('click', dialog.close);
  confirm.addEventListener('click', runAction);
  dialog.element.addEventListener('close', function removeConfirmation() { dialog.element.remove(); });
  dialog.open(options.trigger);
  return dialog;
}
