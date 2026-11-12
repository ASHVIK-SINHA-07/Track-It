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
  function close() {
    element.close();
  }
  closeButton.addEventListener('click', close);
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

  return { element: element, open: open, close: close };
}

let dialogCount = 0;
