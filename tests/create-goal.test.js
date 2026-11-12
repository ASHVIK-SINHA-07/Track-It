import test from 'node:test';
import assert from 'node:assert/strict';
import { mountGoals } from '../src/components/create-goal.js';
import { createWorkspace } from '../src/data/workspace.js';

// A small DOM stand-in checks event wiring. Native dialog behavior needs a browser.
function createElement() {
  return {
    listeners: {}, children: [], isConnected: true, value: '', validity: { badInput: false },
    addEventListener(name, callback) { this.listeners[name] = callback; },
    removeEventListener(name) { delete this.listeners[name]; },
    fire(name) {
      const event = { preventDefault: function () {} };
      this.listeners[name](event);
    },
    append() {
      for (const child of arguments) this.children.push(child);
    },
    setAttribute(name, value) { this[name] = value; },
    focus() { this.focused = true; },
    showModal() { this.open = true; },
    close() { this.open = false; this.fire('close'); },
    remove() { this.removed = true; this.isConnected = false; },
  };
}

function setup(mode = 'personal') {
  const workspace = createWorkspace();
  const fields = {};
  const errors = {};
  for (const name of ['title', 'areaId', 'description', 'targetDate']) {
    fields[name] = createElement();
    fields[name].id = 'test-' + name;
    errors['test-' + name + '-error'] = createElement();
  }
  const form = createElement();
  form.elements = { namedItem: function (name) { return fields[name]; } };
  form.reset = function () {
    for (const name of Object.keys(fields)) fields[name].value = '';
  };
  const opener = createElement();
  const list = createElement();
  const status = createElement();
  const body = createElement();
  const original = Object.getOwnPropertyDescriptor(globalThis, 'document');
  globalThis.document = {
    body: body,
    createElement: function () {
      const element = createElement();
      element.querySelector = function () { return form; };
      return element;
    },
    getElementById: function (id) { return errors[id]; },
  };
  const main = {
    querySelector: function (selector) {
      if (selector === '#create-goal') return opener;
      if (selector === '#goals-list') return list;
      return status;
    },
  };
  const cleanup = mountGoals(main, { workspace: workspace, mode: mode });
  function restore() {
    cleanup();
    if (original) Object.defineProperty(globalThis, 'document', original);
    else delete globalThis.document;
  }
  return { workspace: workspace, fields: fields, errors: errors, form: form, opener: opener, list: list, status: status, dialog: body.children[0], restore: restore };
}

test('goal dialog preserves failed input and updates cards, status, and form after successful creation', function () {
  const context = setup();
  try {
    context.opener.fire('click');
    assert.equal(context.dialog.open, true);
    context.fields.title.value = '   ';
    context.fields.areaId.value = 'academics';
    context.fields.description.value = 'Keep my draft';
    context.form.fire('submit');
    assert.equal(context.workspace.getData().goals.length, 0);
    assert.equal(context.fields.description.value, 'Keep my draft');
    assert.equal(context.fields.title.focused, true);
    assert.match(context.errors['test-title-error'].textContent, /Enter a goal title/);
    assert.equal(context.dialog.open, true);

    context.fields.title.value = 'Learn arrays';
    context.form.fire('submit');
    assert.equal(context.workspace.getData().goals.length, 1);
    assert.match(context.list.innerHTML, /Learn arrays/);
    assert.match(context.list.innerHTML, /Not started/);
    assert.match(context.status.textContent, /disappear on refresh/);
    assert.equal(context.fields.title.value, '');
    assert.equal(context.fields.description.value, '');
    assert.equal(context.errors['test-title-error'].hidden, true);
    assert.equal(context.dialog.open, false);
    assert.equal(context.opener.focused, true);
  } finally {
    context.restore();
  }
  assert.equal(context.dialog.removed, true);
  assert.equal(context.opener.listeners.click, undefined);
});

test('incomplete optional date input is reported and closing/reopening retains the goal draft', function () {
  const context = setup();
  try {
    context.opener.fire('click');
    context.fields.title.value = 'Keep this goal';
    context.fields.areaId.value = 'personal';
    context.fields.targetDate.validity.badInput = true;
    context.form.fire('submit');
    assert.equal(context.workspace.getData().goals.length, 0);
    assert.match(context.errors['test-targetDate-error'].textContent, /valid calendar date/);
    assert.equal(context.fields.targetDate.focused, true);
    assert.equal(context.fields.title.value, 'Keep this goal');
    context.dialog.close();
    context.opener.fire('click');
    assert.equal(context.fields.title.value, 'Keep this goal');
    assert.equal(context.dialog.open, true);
  } finally {
    context.restore();
  }
});

test('goal controller writes only to the selected sample workspace', function () {
  const context = setup('sample');
  try {
    context.fields.title.value = 'Sample-only goal';
    context.fields.areaId.value = 'personal';
    context.form.fire('submit');
    assert.equal(context.workspace.getData('sample').goals.length, 4);
    assert.equal(context.workspace.getData().goals.length, 0);
    assert.match(context.list.innerHTML, /Sample-only goal/);
  } finally {
    context.restore();
  }
});
