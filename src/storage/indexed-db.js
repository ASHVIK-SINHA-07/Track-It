const databaseName = 'track-it-db';
const databaseVersion = 1;
const stores = {
  areas: { keyPath: 'id', indexes: [] },
  goals: { keyPath: 'id', indexes: ['areaId'] },
  activities: { keyPath: 'id', indexes: ['areaId', 'goalId', 'occurredOn'] },
  settings: { keyPath: 'key', indexes: [] },
};

let database = null;
let openingDatabase = null;

function upgradeDatabase(connection, transaction) {
  for (const name of Object.keys(stores)) {
    const definition = stores[name];
    let store;
    if (connection.objectStoreNames.contains(name)) {
      store = transaction.objectStore(name);
    } else {
      store = connection.createObjectStore(name, { keyPath: definition.keyPath });
    }
    for (const index of definition.indexes) {
      if (!store.indexNames.contains(index)) {
        store.createIndex(index, index);
      }
    }
  }
}

function forgetDatabase(connection) {
  if (database === connection) database = null;
}

function connectDatabase() {
  return new Promise(function connect(resolve, reject) {
    let request;
    try {
      if (!globalThis.indexedDB) {
        reject(new Error('IndexedDB is unavailable in this environment.'));
        return;
      }
      request = globalThis.indexedDB.open(databaseName, databaseVersion);
    } catch (error) {
      reject(new Error('Could not open the Track-It database.', { cause: error }));
      return;
    }

    let blocked = false;
    let upgradeError;
    request.onblocked = function reportBlockedUpgrade() {
      blocked = true;
      reject(new Error('Close other Track-It tabs or windows, then try opening the database again.'));
    };
    request.onupgradeneeded = function applyUpgrade() {
      // A blocked open request can resume even after its promise was rejected.
      if (blocked) {
        request.transaction.abort();
        return;
      }
      try {
        upgradeDatabase(request.result, request.transaction);
      } catch (error) {
        upgradeError = error;
        request.transaction.abort();
      }
    };
    request.onerror = function reportOpenError() {
      reject(new Error('Could not open the Track-It database.', { cause: upgradeError || request.error }));
    };
    request.onsuccess = function useConnection() {
      const connection = request.result;
      if (blocked) {
        connection.close();
        return;
      }
      connection.onversionchange = function releaseForUpgrade() {
        forgetDatabase(connection);
        connection.close();
      };
      connection.onclose = function releaseClosedConnection() {
        forgetDatabase(connection);
      };
      database = connection;
      resolve(connection);
    };
  });
}

export async function openDatabase() {
  if (database) return database;
  if (!openingDatabase) openingDatabase = connectDatabase();

  const pending = openingDatabase;
  try {
    return await pending;
  } finally {
    if (openingDatabase === pending) openingDatabase = null;
  }
}

export async function closeDatabase() {
  if (openingDatabase) await openingDatabase;
  if (database) {
    database.close();
    database = null;
  }
}

async function runStoreRequest(storeName, mode, makeRequest) {
  if (typeof storeName !== 'string' || !Object.hasOwn(stores, storeName)) {
    throw new Error('Unknown Track-It object store: ' + String(storeName));
  }

  return runTransaction(storeName, mode, function queueRequest(transaction) {
    const request = makeRequest(transaction.objectStore(storeName));
    return function readResult() { return request.result; };
  });
}

async function runTransaction(storeNames, mode, queueRequests) {
  const connection = await openDatabase();
  try {
    return executeTransaction(connection, storeNames, mode, queueRequests);
  } catch (error) {
    // An explicit close() on the native handle does not emit a close event.
    if (error.name !== 'InvalidStateError') throw error;
    forgetDatabase(connection);
    const reopened = await openDatabase();
    return executeTransaction(reopened, storeNames, mode, queueRequests);
  }
}

function executeTransaction(connection, storeNames, mode, queueRequests) {
  const transaction = connection.transaction(storeNames, mode);
  return new Promise(function waitForTransaction(resolve, reject) {
    let readResult;
    let failure;

    function rejectTransaction() {
      const cause = failure || transaction.error;
      const detail = cause ? ' ' + cause.message : '';
      reject(new Error('Track-It transaction failed for ' + storeNames + '.' + detail, { cause: cause }));
    }

    transaction.oncomplete = function finish() {
      if (failure) {
        rejectTransaction();
        return;
      }
      resolve(readResult());
    };
    transaction.onerror = function recordRequestError(event) {
      if (!failure) failure = event.target.error;
    };
    transaction.onabort = rejectTransaction;

    function abortWith(error) {
      failure = error;
      transaction.abort();
    }

    try {
      readResult = queueRequests(transaction, abortWith);
    } catch (error) {
      abortWith(error);
    }
  });
}

function assertNoBigInt(value, visited = new Set()) {
  if (typeof value === 'bigint' || value instanceof BigInt64Array || value instanceof BigUint64Array
      || Object.prototype.toString.call(value) === '[object BigInt]') {
    throw new TypeError('Track-It storage does not support BigInt values.');
  }
  if (value === null || typeof value !== 'object' || visited.has(value)) return;
  visited.add(value);

  if (value instanceof Map) {
    for (const [key, entry] of value) {
      assertNoBigInt(key, visited);
      assertNoBigInt(entry, visited);
    }
  } else if (value instanceof Set) {
    for (const entry of value) assertNoBigInt(entry, visited);
  } else {
    for (const name of Object.getOwnPropertyNames(value)) {
      assertNoBigInt(value[name], visited);
    }
  }
}

export function getAllRecords(storeName) {
  return runStoreRequest(storeName, 'readonly', function readAll(store) {
    return store.getAll();
  });
}

export function getRecord(storeName, id) {
  return runStoreRequest(storeName, 'readonly', function readRecord(store) {
    return store.get(id);
  });
}

export function saveRecord(storeName, record) {
  return runStoreRequest(storeName, 'readwrite', function putRecord(store) {
    // Check the same snapshot that will be written, including nested settings values.
    const snapshot = structuredClone(record);
    assertNoBigInt(snapshot);
    return store.put(snapshot);
  });
}

export function deleteRecord(storeName, id) {
  return runStoreRequest(storeName, 'readwrite', function removeRecord(store) {
    return store.delete(id);
  });
}

const workspaceStores = ['areas', 'goals', 'activities', 'settings'];
const initializedKey = 'workspace-initialized';

export function initializeWorkspace(starterAreas) {
  return runTransaction(workspaceStores, 'readwrite', function initialize(transaction) {
    const settings = transaction.objectStore('settings');
    const areas = transaction.objectStore('areas');
    const marker = settings.get(initializedKey);
    const counts = ['areas', 'goals', 'activities'].map(name => transaction.objectStore(name).count());
    counts[counts.length - 1].onsuccess = function seedIfEmpty() {
      if (marker.result) return;
      if (counts.every(count => count.result === 0)) {
        for (const area of starterAreas) areas.add(area);
      }
      settings.put({ key: initializedKey, value: true });
    };
    return function initialized() {};
  });
}

export function readWorkspace() {
  return runTransaction(workspaceStores, 'readonly', function read(transaction) {
    const requests = {};
    for (const name of workspaceStores) requests[name] = transaction.objectStore(name).getAll();
    return function collect() {
      return {
        areas: requests.areas.result,
        goals: requests.goals.result,
        activities: requests.activities.result,
        settings: requests.settings.result.filter(setting => setting.key !== initializedKey),
        revision: requests.settings.result.find(setting => setting.key === initializedKey)?.revision ?? 0,
      };
    };
  });
}

function writeWorkspace(storeNames, expectedRevision, queueWrite) {
  return runTransaction(storeNames, 'readwrite', function checkRevision(transaction, abort) {
    const settings = transaction.objectStore('settings');
    const marker = settings.get(initializedKey);
    let revision;
    marker.onsuccess = function writeIfCurrent() {
      const current = marker.result?.revision ?? 0;
      if (expectedRevision !== undefined && current !== expectedRevision) {
        const error = new Error('This workspace changed in another tab. Refresh before saving again.');
        error.name = 'WorkspaceConflictError';
        abort(error);
        return;
      }
      try {
        revision = current + 1;
        queueWrite(transaction);
        settings.put({ key: initializedKey, value: true, revision: revision });
      } catch (error) {
        abort(error);
      }
    };
    return function getRevision() { return revision; };
  });
}

export function saveWorkspaceRecord(storeName, record, revision) {
  return writeWorkspace([storeName, 'settings'], revision, function save(transaction) {
    assertNoBigInt(record);
    transaction.objectStore(storeName).put(record);
  });
}

export function deleteWorkspaceActivity(id, revision) {
  return writeWorkspace(['activities', 'settings'], revision, function remove(transaction) {
    transaction.objectStore('activities').delete(id);
  });
}

export function replaceWorkspace(data, revision) {
  return writeWorkspace(workspaceStores, revision, function replace(transaction) {
    for (const name of workspaceStores) {
      const store = transaction.objectStore(name);
      store.clear();
      for (const record of data[name]) {
        const snapshot = structuredClone(record);
        assertNoBigInt(snapshot);
        store.add(snapshot);
      }
    }
  });
}
