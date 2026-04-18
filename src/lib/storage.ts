import type { Trade } from '@/data/trades';

const DB_NAME = 'orca-trading-os';
const DB_VERSION = 3;

function ensureStores(db: IDBDatabase) {
  if (!db.objectStoreNames.contains('trades')) db.createObjectStore('trades', { keyPath: 'id' });
  if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' });
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    // First try without version → adopt whatever exists in the browser
    const probe = indexedDB.open(DB_NAME);
    probe.onsuccess = () => {
      const db = probe.result;
      const currentVersion = db.version;
      const missingStore = !db.objectStoreNames.contains('trades') || !db.objectStoreNames.contains('settings');
      if (!missingStore) { resolve(db); return; }
      // Need to upgrade to add stores
      db.close();
      const upgradeReq = indexedDB.open(DB_NAME, currentVersion + 1);
      upgradeReq.onupgradeneeded = () => ensureStores(upgradeReq.result);
      upgradeReq.onsuccess = () => resolve(upgradeReq.result);
      upgradeReq.onerror = () => reject(upgradeReq.error);
    };
    probe.onupgradeneeded = () => ensureStores(probe.result);
    probe.onerror = () => reject(probe.error);
    probe.onblocked = () => reject(new Error('Database blocked'));
  });
}

function txOp<T>(storeName: string, mode: IDBTransactionMode, op: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const req = op(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

export async function getAllTrades(): Promise<Trade[]> {
  return txOp<Trade[]>('trades', 'readonly', s => s.getAll());
}

export async function saveTrade(trade: Trade): Promise<void> {
  await txOp('trades', 'readwrite', s => s.put(trade));
}

export async function saveTrades(trades: Trade[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('trades', 'readwrite');
    const store = tx.objectStore('trades');
    trades.forEach(t => store.put(t));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteTrade(id: number): Promise<void> {
  await txOp('trades', 'readwrite', s => s.delete(id));
}

export async function getSetting<T = unknown>(key: string): Promise<T | undefined> {
  const result = await txOp<{ key: string; value: T } | undefined>('settings', 'readonly', s => s.get(key));
  return result?.value;
}

export async function setSetting<T = unknown>(key: string, value: T): Promise<void> {
  await txOp('settings', 'readwrite', s => s.put({ key, value }));
}

export async function clearAllData(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['trades', 'settings'], 'readwrite');
    tx.objectStore('trades').clear();
    tx.objectStore('settings').clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getTradeCount(): Promise<number> {
  return txOp<number>('trades', 'readonly', s => s.count());
}
