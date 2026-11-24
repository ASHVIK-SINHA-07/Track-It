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

  const connection = await openDatabase();
  try {
    return executeTransaction(connection, storeName, mode, makeRequest);
  } catch (error) {
    // An explicit close() on the native handle does not emit a close event.
    if (error.name !== 'InvalidStateError') throw error;
    forgetDatabase(connection);
    const reopened = await openDatabase();
    return executeTransaction(reopened, storeName, mode, makeRequest);
  }
}

function executeTransaction(connection, storeName, mode, makeRequest) {
  const transaction = connection.transaction(storeName, mode);
  return new Promise(function waitForTransaction(resolve, reject) {
    let request;
    let failure;

    function rejectTransaction() {
      const cause = failure || transaction.error;
      const detail = cause ? ' ' + cause.message : '';
      reject(new Error('Track-It transaction failed for ' + storeName + '.' + detail, { cause: cause }));
    }

    transaction.oncomplete = function readResult() {
      if (failure) {
        rejectTransaction();
        return;
      }
      resolve(request.result);
    };
    transaction.onerror = function recordRequestError(event) {
      failure = event.target.error;
    };
    transaction.onabort = rejectTransaction;

    try {
      request = makeRequest(transaction.objectStore(storeName));
    } catch (error) {
      failure = error;
      transaction.abort();
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
