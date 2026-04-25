const DB_NAME = 'licencia-claseb-import-draft-assets';
const DB_VERSION = 1;
const STORE_NAME = 'assets';

export type ImportDraftAssetKind = 'crop' | 'upload';

export type StoredImportDraftAsset = {
  id: string;
  kind: ImportDraftAssetKind;
  name: string;
  mimeType: string;
  byteSize: number;
  createdAt: string;
  page?: number;
  previewDataUrl?: string;
  blob: Blob;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB no está disponible en este contexto.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error('No se pudo abrir IndexedDB.'));
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  executor: (store: IDBObjectStore, resolve: (value: T) => void, reject: (error: Error) => void) => void,
): Promise<T> {
  return openDatabase().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        executor(
          store,
          (value) => resolve(value),
          (error) => reject(error),
        );
        transaction.onerror = () =>
          reject(transaction.error ?? new Error('Fallo en la transacción de IndexedDB.'));
      }),
  );
}

export async function saveImportDraftAsset(asset: StoredImportDraftAsset) {
  return runTransaction<void>('readwrite', (store, resolve, reject) => {
    const request = store.put(asset);
    request.onerror = () => reject(request.error ?? new Error('No se pudo guardar el asset.'));
    request.onsuccess = () => resolve();
  });
}

export async function loadImportDraftAsset(assetId: string) {
  return runTransaction<StoredImportDraftAsset | null>('readonly', (store, resolve, reject) => {
    const request = store.get(assetId);
    request.onerror = () => reject(request.error ?? new Error('No se pudo leer el asset.'));
    request.onsuccess = () => resolve((request.result as StoredImportDraftAsset | undefined) ?? null);
  });
}

export async function deleteImportDraftAsset(assetId: string) {
  return runTransaction<void>('readwrite', (store, resolve, reject) => {
    const request = store.delete(assetId);
    request.onerror = () => reject(request.error ?? new Error('No se pudo eliminar el asset.'));
    request.onsuccess = () => resolve();
  });
}

export async function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo convertir el blob a data URL.'));
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.readAsDataURL(blob);
  });
}
