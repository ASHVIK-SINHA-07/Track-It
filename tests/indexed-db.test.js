import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { forceCloseDatabase, IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import {
  closeDatabase, deleteRecord, getAllRecords, getRecord, openDatabase, saveRecord,
} from '../src/storage/indexed-db.js';

const timestamp = '2026-11-24T12:00:00.000Z';
const area = {
  id: 'area-1', name: 'Academics', icon: 'goals', color: 'sage', description: '',
  archivedAt: null, createdAt: timestamp, updatedAt: timestamp,
};
const goal = {
  id: 'goal-1', areaId: area.id, title: 'Practice stacks', description: '',
  status: 'not_started', targetDate: null, createdAt: timestamp, updatedAt: timestamp,
};
const activity = {
  id: 'activity-1', areaId: area.id, goalId: goal.id, title: 'Study an example', note: '',
  occurredOn: '2026-11-24', durationMinutes: null, createdAt: timestamp, updatedAt: timestamp,
};

beforeEach(function useFreshDatabase() {
  globalThis.indexedDB = new IDBFactory();
});

afterEach(async function releaseDatabase() {
  await closeDatabase();
  delete globalThis.indexedDB;
});

function resultOf(request) {
  return new Promise(function waitForRequest(resolve, reject) {
    request.onsuccess = function read() { resolve(request.result); };
    request.onerror = function fail() { reject(request.error); };
  });
}

function hasCause(name) {
  return function checkCause(error) {
    assert.equal(error.cause?.name, name);
    return true;
  };
}

test('creates the version 1 schema with the required key paths, indexes, and empty stores', async function () {
  const database = await openDatabase();
  assert.equal(database.name, 'track-it-db');
  assert.equal(database.version, 1);
  assert.deepEqual(Array.from(database.objectStoreNames), ['activities', 'areas', 'goals', 'settings']);
  const transaction = database.transaction(['areas', 'goals', 'activities', 'settings']);
  const schema = [
    ['areas', 'id', []],
    ['goals', 'id', ['areaId']],
    ['activities', 'id', ['areaId', 'goalId', 'occurredOn']],
    ['settings', 'key', []],
  ];
  for (const [name, keyPath, indexNames] of schema) {
    const store = transaction.objectStore(name);
    assert.equal(store.keyPath, keyPath);
    assert.deepEqual(Array.from(store.indexNames), indexNames);
    for (const indexName of indexNames) {
      const index = store.index(indexName);
      assert.equal(index.keyPath, indexName);
      assert.equal(index.unique, false);
    }
  }
  for (const [name] of schema) {
    assert.deepEqual(await getAllRecords(name), []);
  }
});

test('saves and retrieves all record types without changing IDs, dates, null values, or relationships', async function () {
  const unlinkedActivity = { ...activity, id: 'activity-2', goalId: null, durationMinutes: 0 };
  const setting = { key: 'display', value: { compact: true } };
  assert.equal(await saveRecord('areas', area), area.id);
  assert.equal(await saveRecord('goals', goal), goal.id);
  assert.equal(await saveRecord('activities', activity), activity.id);
  await saveRecord('activities', unlinkedActivity);
  assert.equal(await saveRecord('settings', setting), setting.key);

  assert.deepEqual(await getRecord('areas', area.id), area);
  assert.deepEqual(await getRecord('goals', goal.id), goal);
  assert.deepEqual(await getRecord('activities', activity.id), activity);
  assert.deepEqual(await getAllRecords('activities'), [activity, unlinkedActivity]);
  assert.deepEqual(await getRecord('settings', setting.key), setting);
  const database = await openDatabase();
  const store = database.transaction('activities').objectStore('activities');
  assert.deepEqual(await resultOf(store.index('goalId').getAll(goal.id)), [activity]);
});

test('updates by key without duplicating or deleting other records, and deletes only the requested key', async function () {
  const otherArea = { ...area, id: 'area-2', name: 'Creative' };
  await saveRecord('areas', area);
  await saveRecord('areas', otherArea);
  const updatedArea = { ...area, name: 'Updated name', updatedAt: '2026-11-25T12:00:00.000Z' };
  await saveRecord('areas', updatedArea);
  assert.deepEqual(await getAllRecords('areas'), [updatedArea, otherArea]);
  await deleteRecord('areas', area.id);
  assert.deepEqual(await getAllRecords('areas'), [otherArea]);
  assert.equal(await getRecord('areas', area.id), undefined);
  assert.equal(await deleteRecord('areas', 'missing'), undefined);
});

test('rejects invalid store names before opening the database', async function () {
  await assert.rejects(getAllRecords('missing'), /Unknown Track-It object store/);
  await assert.rejects(getRecord('toString', 'x'), /Unknown Track-It object store/);
  await assert.rejects(saveRecord('__proto__', area), /Unknown Track-It object store/);
  await assert.rejects(deleteRecord(null, 'x'), /Unknown Track-It object store/);
  assert.deepEqual(await globalThis.indexedDB.databases(), []);
});

test('read and write promises wait for the transaction complete event', async function (context) {
  const database = await openDatabase();
  const transactionMethod = database.transaction.bind(database);
  const completedModes = [];
  context.mock.method(database, 'transaction', function watchTransaction(name, mode) {
    const transaction = transactionMethod(name, mode);
    transaction.addEventListener('complete', function recordCompletion() { completedModes.push(mode); });
    return transaction;
  });
  await saveRecord('areas', area);
  assert.deepEqual(completedModes, ['readwrite']);
  await getRecord('areas', area.id);
  assert.deepEqual(completedModes, ['readwrite', 'readonly']);
});

test('a request that succeeded before its transaction aborted leaves no record', async function (context) {
  const database = await openDatabase();
  const transactionMethod = database.transaction.bind(database);
  context.mock.method(database, 'transaction', function abortWrite(name, mode) {
    const transaction = transactionMethod(name, mode);
    const openStore = transaction.objectStore.bind(transaction);
    context.mock.method(transaction, 'objectStore', function getStore(storeName) {
      const store = openStore(storeName);
      const put = store.put.bind(store);
      context.mock.method(store, 'put', function abortAfterSuccess(record) {
        const request = put(record);
        request.onsuccess = function cancelTransaction() { transaction.abort(); };
        return request;
      });
      return store;
    });
    return transaction;
  });
  await assert.rejects(saveRecord('areas', area), /Track-It transaction failed for areas/);
  assert.equal(await getRecord('areas', area.id), undefined);
});

test('rejects synchronous and asynchronous request errors while preserving existing records', async function (context) {
  await saveRecord('areas', area);
  await assert.rejects(saveRecord('areas', { name: 'Missing key' }), hasCause('DataError'));
  await assert.rejects(saveRecord('areas', { ...area, name: function invalidValue() {} }), hasCause('DataCloneError'));

  const put = context.mock.method(
    IDBObjectStore.prototype,
    'put',
    function requireNewKey(record) { return this.add(record); },
  );
  await assert.rejects(saveRecord('areas', { ...area, name: 'Duplicate key' }), hasCause('ConstraintError'));
  put.mock.restore();
  assert.deepEqual(await getRecord('areas', area.id), area);
});

test('rejects BigInt values in records and nested settings', async function () {
  await assert.rejects(saveRecord('activities', { ...activity, durationMinutes: 1n }), /BigInt/);
  await assert.rejects(saveRecord('settings', { key: 'nested', value: { minutes: [1n] } }), /BigInt/);
  assert.deepEqual(await getAllRecords('activities'), []);
  assert.deepEqual(await getAllRecords('settings'), []);
});

test('concurrent opens share a connection and records survive explicit and unexpected closure', async function () {
  const [first, sameConnection] = await Promise.all([openDatabase(), openDatabase()]);
  assert.equal(first, sameConnection);
  await saveRecord('areas', area);
  await closeDatabase();
  const reopened = await openDatabase();
  assert.notEqual(reopened, first);
  assert.deepEqual(await getAllRecords('areas'), [area]);

  reopened.close();
  assert.deepEqual(await getRecord('areas', area.id), area);
  const recovered = await openDatabase();
  assert.notEqual(recovered, reopened);
  const closed = new Promise(function waitForClose(resolve) { recovered.addEventListener('close', resolve); });
  forceCloseDatabase(recovered);
  await closed;
  assert.notEqual(await openDatabase(), recovered);
  assert.deepEqual(await getAllRecords('areas'), [area]);
});

test('releases a connection for a version change and gives a useful error if the disk version is newer', async function () {
  await saveRecord('areas', area);
  const connection = await openDatabase();
  const upgrade = globalThis.indexedDB.open(connection.name, 2);
  upgrade.onblocked = function fail() { assert.fail('The old connection should release the upgrade'); };
  const upgraded = await resultOf(upgrade);
  try {
    assert.throws(function useOldConnection() { connection.transaction('areas'); }, { name: 'InvalidStateError' });
    await assert.rejects(openDatabase(), function checkVersionError(error) {
      assert.match(error.message, /Could not open the Track-It database/);
      return hasCause('VersionError')(error);
    });
    const record = await resultOf(upgraded.transaction('areas').objectStore('areas').get(area.id));
    assert.deepEqual(record, area);
  } finally {
    upgraded.close();
  }
});

test('reports a blocked upgrade and preserves data when retried after the other connection closes', async function (context) {
  await saveRecord('areas', area);
  await closeDatabase();
  const api = globalThis.indexedDB;
  const nativeOpen = api.open.bind(api);
  const blocker = await resultOf(nativeOpen('track-it-db', 1));
  context.mock.method(api, 'open', function simulateNextSchemaVersion(name) { return nativeOpen(name, 2); });
  try {
    await assert.rejects(openDatabase(), /Close other Track-It tabs or windows/);
  } finally {
    blocker.close();
  }
  const upgraded = await openDatabase();
  assert.equal(upgraded.version, 2);
  assert.deepEqual(await getAllRecords('areas'), [area]);
});

test('opening rejects when IndexedDB is unavailable and can be retried', async function () {
  delete globalThis.indexedDB;
  await assert.rejects(openDatabase(), /IndexedDB is unavailable/);
  globalThis.indexedDB = new IDBFactory();
  assert.equal((await openDatabase()).version, 1);
});
