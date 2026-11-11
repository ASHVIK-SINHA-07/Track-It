import test from 'node:test';
import assert from 'node:assert/strict';
import { mountActivity } from '../src/components/quick-log.js';
import { createWorkspace } from '../src/data/workspace.js';

// A small DOM boundary exercises controller events and state updates.
// Native focus containment, Escape, and layout still require a real browser.
class Element {
  constructor() { this.listeners = {}; this.children = []; this.isConnected = true; this.value = ''; this.validity = { badInput: false }; }
  addEventListener(name, callback) { (this.listeners[name] ??= []).push(callback); }
  removeEventListener(name, callback) { this.listeners[name] = this.listeners[name]?.filter(fn => fn !== callback); }
  fire(name) { for (const callback of this.listeners[name] ?? []) callback({ preventDefault() {} }); }
  setAttribute(name, value) { this[name] = value; }
  append(...children) { this.children.push(...children); }
  focus() { this.focused = true; }
  showModal() { this.open = true; }
  close() { this.open = false; this.fire('close'); }
  remove() { this.removed = true; this.isConnected = false; }
}

function setup(mode = 'personal') {
  const workspace = createWorkspace();
  const names = ['title', 'areaId', 'occurredOn', 'goalId', 'durationMinutes', 'note'];
  const fields = Object.fromEntries(names.map(name => [name, Object.assign(new Element(), { id: `test-${name}` })]));
  const errors = Object.fromEntries(names.map(name => [`test-${name}-error`, new Element()]));
  const form = new Element();
  form.elements = { namedItem: name => fields[name] };
  form.reset = () => { for (const field of Object.values(fields)) field.value = ''; };
  const parts = Object.fromEntries(['#log-activity', '#activity-history', '#activity-status'].map(key => [key, new Element()]));
  const body = new Element();
  const original = Object.getOwnPropertyDescriptor(globalThis, 'document');
  globalThis.document = {
    body,
    createElement() { const element = new Element(); element.querySelector = () => form; return element; },
    getElementById: id => errors[id],
  };
  const cleanup = mountActivity({ querySelector: key => parts[key] }, { workspace, mode });
  const dialog = body.children[0];
  return {
    fields, form, errors, parts, dialog, workspace,
    restore() {
      cleanup();
      if (original) Object.defineProperty(globalThis, 'document', original);
      else delete globalThis.document;
    },
  };
}

function fill(fields, values) { for (const [name, value] of Object.entries(values)) fields[name].value = value; }

test('quick-log controller preserves invalid input, adds valid input, updates history, and resets only after success', () => {
  const context = setup();
  const { fields, form, errors, parts, dialog, workspace } = context;
  try {
    parts['#log-activity'].fire('click');
    assert.equal(dialog.open, true);
    fill(fields, { title: '   ', areaId: 'academics', occurredOn: '2026-11-12', note: 'Keep my draft' });
    form.fire('submit');
    assert.equal(workspace.getData().activities.length, 0);
    assert.equal(fields.note.value, 'Keep my draft');
    assert.equal(dialog.open, true);
    assert.equal(fields.title.focused, true);
    assert.match(errors['test-title-error'].textContent, /Enter an activity title/);
    fields.title.value = '  Finished a chapter  ';
    form.fire('submit');
    assert.equal(workspace.getData().activities.length, 1);
    assert.match(parts['#activity-history'].innerHTML, /Finished a chapter/);
    assert.match(parts['#activity-status'].textContent, /disappear on refresh/);
    assert.equal(dialog.open, false);
    assert.equal(parts['#log-activity'].focused, true);
    assert.equal(fields.title.value, '');
    assert.equal(fields.note.value, '');
    assert.match(fields.occurredOn.value, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(errors['test-title-error'].hidden, true);
  } finally { context.restore(); }
  assert.equal(dialog.removed, true);
});

test('area changes reset incompatible goals while keeping other fields and compatible goals', () => {
  const context = setup('sample');
  const { fields } = context;
  try {
    fill(fields, { areaId: 'academics', goalId: 'arrays', title: 'My draft', note: 'My notes' });
    fields.areaId.fire('change');
    assert.equal(fields.goalId.value, 'arrays');
    fields.areaId.value = 'portfolio';
    fields.areaId.fire('change');
    assert.equal(fields.goalId.value, '');
    assert.match(fields.goalId.innerHTML, /Build a portfolio page/);
    assert.doesNotMatch(fields.goalId.innerHTML, /Practice array fundamentals/);
    assert.equal(fields.title.value, 'My draft');
    assert.equal(fields.note.value, 'My notes');
  } finally { context.restore(); }
});

test('incomplete browser number input cannot be silently submitted as an omitted duration', () => {
  const context = setup();
  try {
    fill(context.fields, { title: 'Work', areaId: 'personal', occurredOn: '2026-11-12', durationMinutes: '' });
    context.fields.durationMinutes.validity.badInput = true;
    context.form.fire('submit');
    assert.equal(context.workspace.getData().activities.length, 0);
    assert.match(context.errors['test-durationMinutes-error'].textContent, /whole number/);
    assert.equal(context.fields.title.value, 'Work');
  } finally { context.restore(); }
});

test('closing and reopening retains the draft; unmounting removes the dialog and listener', () => {
  const context = setup();
  try {
    context.parts['#log-activity'].fire('click');
    context.fields.note.value = 'Draft';
    context.dialog.close();
    context.parts['#log-activity'].fire('click');
    assert.equal(context.fields.note.value, 'Draft');
    assert.equal(context.dialog.open, true);
  } finally { context.restore(); }
  assert.equal(context.dialog.removed, true);
  assert.equal(context.parts['#log-activity'].listeners.click.length, 0);
});
