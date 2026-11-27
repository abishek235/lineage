const DB_NAME = "lineage-photos";
const STORE = "blobs";
const urls = new Map<string, string>();

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function putPhotoBlob(id: string, blob: Blob): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  const previous = urls.get(id);
  if (previous) URL.revokeObjectURL(previous);
  urls.set(id, URL.createObjectURL(blob));
}

export async function getPhotoBlob(id: string): Promise<Blob | undefined> {
  if (typeof indexedDB === "undefined") return undefined;
  const db = await openDb();
  const blob = await new Promise<Blob | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(id);
    request.onsuccess = () => resolve(request.result as Blob | undefined);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return blob;
}

export async function forgetPhotos(ids: string[]): Promise<void> {
  for (const id of ids) {
    const url = urls.get(id);
    if (url) URL.revokeObjectURL(url);
    urls.delete(id);
  }
  if (typeof indexedDB === "undefined" || ids.length === 0) return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      for (const id of ids) store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // The portrait is already gone from the record.
  }
}

export function cachedPhotoUrl(id: string): string | undefined {
  return urls.get(id);
}

const pending = new Map<string, Promise<string | undefined>>();

export function photoUrl(id: string): Promise<string | undefined> {
  const cached = urls.get(id);
  if (cached) return Promise.resolve(cached);
  const existing = pending.get(id);
  if (existing) return existing;
  const job = getPhotoBlob(id)
    .then((blob) => {
      pending.delete(id);
      if (!blob) return undefined;
      const again = urls.get(id);
      if (again) return again;
      const url = URL.createObjectURL(blob);
      urls.set(id, url);
      return url;
    })
    .catch((error: unknown) => {
      pending.delete(id);
      throw error;
    });
  pending.set(id, job);
  return job;
}

export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const max = 1280;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Could not prepare that photo.");
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  if (!blob) throw new Error("Could not prepare that photo.");
  return blob;
}

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export function photoFileError(file: File): string | null {
  const named = /\.(jpe?g|png|webp)$/i.test(file.name);
  if (file.type && !ALLOWED.has(file.type) && !named) {
    return "Use a JPEG, PNG, or WebP photo.";
  }
  if (!file.type && !named) return "Use a JPEG, PNG, or WebP photo.";
  if (file.size > 5 * 1024 * 1024) return "Photos must be 5 MB or smaller.";
  return null;
}
