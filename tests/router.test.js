import test from 'node:test';
import assert from 'node:assert/strict';
import { startRouter } from '../src/router.js';
import { routes } from '../src/components/shell.js';
import { localDateValue } from '../src/data/activity.js';

test('existing routes still render their actual views and update navigation metadata', () => {
  // Minimal DOM boundary: checks routing logic, not browser history or layout.
  const events = {};
  const main = { innerHTML: '', focus() { this.focused = true; } };
  const current = { textContent: '' };
  const links = routes.map(({ id }) => ({
    dataset: { route: id }, attributes: {},
    setAttribute(key, value) { this.attributes[key] = value; },
    removeAttribute(key) { delete this.attributes[key]; },
  }));
  const originalGlobals = Object.fromEntries(['document', 'window', 'location', 'history'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  globalThis.document = {
    querySelector: selector => ({ '#main': main, '#current-view': current, '.skip-link': { addEventListener() {} } })[selector],
    querySelectorAll: () => links,
  };
  globalThis.location = { hash: '' };
  globalThis.history = { replaceState(_data, _unused, hash) { location.hash = hash; } };
  globalThis.window = { addEventListener(name, handler) { events[name] = handler; }, scrollTo() {} };

  try {
    let activityContext;
    let unmounts = 0;
    startRouter({ mountActivityView: (_main, context) => {
      activityContext = context;
      return () => { unmounts++; };
    } });
    assert.equal(location.hash, '#/overview');
    for (const { id, label } of routes) {
      location.hash = `#/${id}`;
      events.hashchange();
      assert.equal(current.textContent, label);
      assert.equal(document.title, `${label} · Track-It`);
      assert.equal(links.filter(link => link.attributes['aria-current'] === 'page').length, 1);
      assert.equal(links.find(link => link.attributes['aria-current'] === 'page').dataset.route, id);
      assert.match(main.innerHTML, /<h1>/);
      assert.equal(main.focused, true);
      if (id !== 'overview') {
        assert.match(main.innerHTML, /class="full-empty"/);
        assert.match(main.innerHTML, /href="#\/overview"/);
      }
    }
    activityContext.workspace.addActivity({ title: 'Session-only reading', areaId: 'personal', occurredOn: localDateValue() });
    location.hash = '#/overview';
    events.hashchange();
    assert.match(main.innerHTML, /Session-only reading/);
    assert.equal(unmounts, 1);
    location.hash = '#/activity';
    events.hashchange();
    assert.match(main.innerHTML, /Session-only reading/);
    location.search = '?sample';
    location.hash = '#/overview';
    events.hashchange();
    assert.match(main.innerHTML, /Sample data only/);
    assert.doesNotMatch(main.innerHTML, /Session-only reading/);
    assert.match(main.innerHTML, /Practiced two array problems/);
    location.search = '';
    events.hashchange();
    assert.doesNotMatch(main.innerHTML, /Practiced two array problems/);
    assert.match(main.innerHTML, /Session-only reading/);
    location.hash = '#/unknown';
    events.hashchange();
    assert.equal(location.hash, '#/overview');
  } finally {
    for (const [key, descriptor] of Object.entries(originalGlobals)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});
