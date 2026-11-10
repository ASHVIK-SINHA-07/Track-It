// A DOM factory keeps event listeners alongside the dialog they belong to.
export function createDialog({ title, description = '', content } = {}) {
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
  element.addEventListener('close', () => {
    if (opener?.isConnected) opener.focus();
  });

  return {
    element,
    open(trigger = document.activeElement) {
      if (element.open) return;
      opener = trigger;
      element.showModal(); // Native modality, focus containment, and Escape handling.
    },
    close,
  };
}

let dialogCount = 0;
