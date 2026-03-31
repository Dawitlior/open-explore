// IndexedDB-based image storage for trade screenshots and charts
// Never uses localStorage — uses IndexedDB for unlimited storage

const DB_NAME = 'orca-media-store';
const DB_VERSION = 1;
const STORE_NAME = 'images';

interface StoredImage {
  id: string;           // tradeId-type or custom key
  blob: Blob;
  mimeType: string;
  fileName: string;
  timestamp: number;
  tradeId?: number;
  category: 'trade-screenshot' | 'eod-chart' | 'archive';
}

function openMediaDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('tradeId', 'tradeId', { unique: false });
        store.createIndex('category', 'category', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveImage(
  id: string,
  file: File | Blob,
  options: { tradeId?: number; category: StoredImage['category']; fileName?: string }
): Promise<string> {
  const db = await openMediaDB();
  const record: StoredImage = {
    id,
    blob: file,
    mimeType: file.type || 'image/png',
    fileName: options.fileName || `image-${Date.now()}.png`,
    timestamp: Date.now(),
    tradeId: options.tradeId,
    category: options.category,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getImage(id: string): Promise<StoredImage | undefined> {
  const db = await openMediaDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getImagesByTrade(tradeId: number): Promise<StoredImage[]> {
  const db = await openMediaDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const index = tx.objectStore(STORE_NAME).index('tradeId');
    const req = index.getAll(tradeId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getImagesByCategory(category: StoredImage['category']): Promise<StoredImage[]> {
  const db = await openMediaDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const index = tx.objectStore(STORE_NAME).index('category');
    const req = index.getAll(category);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteImage(id: string): Promise<void> {
  const db = await openMediaDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllImages(): Promise<StoredImage[]> {
  const db = await openMediaDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function createImageURL(image: StoredImage): string {
  return URL.createObjectURL(image.blob);
}
