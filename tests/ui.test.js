import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, renderButton, renderField, renderCard, renderEmptyState } from '../src/components/ui.js';

const hostile = '<img src=x onerror="alert(1)"> & \'quoted\'';

test('text and attribute values cannot inject HTML', () => {
  assert.equal(escapeHtml('&<>"\''), '&amp;&lt;&gt;&quot;&#39;');
  for (const html of [
    renderButton({ label: hostile, id: hostile }),
    renderField({ id: hostile, name: hostile, label: hostile, value: hostile, hint: hostile, error: hostile }),
    renderField({ type: 'textarea', label: hostile, value: '</textarea><script>alert(1)</script>' }),
    renderField({ type: 'select', label: hostile, options: [{ value: hostile, label: hostile }] }),
    renderCard({ title: hostile }),
    renderEmptyState({ id: hostile, title: hostile, message: hostile, detail: hostile, badge: hostile }),
  ]) {
    assert.doesNotMatch(html, /<img|<script|<\/textarea><script/);
    assert.match(html, /&lt;/);
  }
});

test('buttons default to non-submitting and support semantic disabled state', () => {
  for (const variant of ['primary', 'secondary', 'destructive']) {
    assert.match(renderButton({ label: 'Example', variant, disabled: true }), /type="button" disabled/);
  }
  assert.throws(() => renderButton({ variant: 'unsafe" onclick="alert(1)' }));
  assert.throws(() => renderButton({ type: 'unknown' }));
});

test('all field types have associated labels, hints, and errors', () => {
  for (const type of ['text', 'textarea', 'select', 'date', 'number']) {
    const html = renderField({ id: 'example', label: 'Example', type, required: true, hint: 'Hint', error: 'Error' });
    assert.match(html, /<label for="example">Example/);
    assert.match(html, /id="example" name="example"/);
    assert.match(html, /aria-describedby="example-hint example-error"/);
    assert.match(html, /aria-invalid="true" required/);
    assert.match(html, /id="example-error" aria-live="polite">Error/);
  }
  assert.notEqual(renderField({ label: 'First' }).match(/for="([^"]+)"/)[1], renderField({ label: 'Second' }).match(/for="([^"]+)"/)[1]);
  assert.match(renderField({ label: 'Example' }), /aria-live="polite" hidden/);
  assert.match(renderField({ type: 'number', label: 'Count', min: 0, max: 10, step: 2 }), /min="0" max="10" step="2"/);
  assert.match(renderField({ type: 'select', label: 'Choice', value: 'b', options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] }), /value="b" selected>B/);
  assert.throws(() => renderField({ type: 'unsupported' }));
});

test('optional content and empty-state action remain explicit', () => {
  assert.doesNotMatch(renderCard({ contentHtml: '<p>Trusted composition</p>' }), /<h2/);
  assert.match(renderCard({ title: 'Heading' }), /<h2 class="ui-card-heading">Heading<\/h2>/);
  assert.doesNotMatch(renderEmptyState({ title: 'Empty', message: 'Nothing here' }), /<a /);
  assert.match(renderEmptyState({ title: 'Empty', message: 'Nothing here', action: { label: 'Overview', href: '#/overview' } }), /href="#\/overview"/);
  for (const href of ['javascript:alert(1)', 'https://example.com', '" onclick="alert(1)']) {
    assert.throws(() => renderEmptyState({ action: { label: 'Unsafe', href } }));
  }
});
