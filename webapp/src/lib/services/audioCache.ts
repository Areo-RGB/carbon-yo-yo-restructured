import { writable } from 'svelte/store';
import type { TestType } from '$lib/domain/protocol.ts';

export const YOYO_LOCAL_PATH = './assets/audio/yoyo.m4a';
export const BEEP_LOCAL_PATH = './assets/audio/beep_test.m4a';

export const CACHE_NAME = 'fitness-audio-cache-v2';
const IDB_NAME = 'FitnessAudioDB';
const IDB_STORE = 'audioBlobs';

export interface AudioItemConfig {
  type: TestType;
  localPath: string;
  idbKey: string;
  approxSize: number;
  label: string;
}

export const AUDIO_CONFIGS: Record<TestType, AudioItemConfig> = {
  yoyoIR1: {
    type: 'yoyoIR1',
    localPath: YOYO_LOCAL_PATH,
    idbKey: 'yoyo_ir1_audio_v2',
    approxSize: 27_891_366,
    label: 'Yo-Yo IR1'
  },
  beepTest: {
    type: 'beepTest',
    localPath: BEEP_LOCAL_PATH,
    idbKey: 'beep_test_audio_v2',
    approxSize: 21_658_736,
    label: 'Beep Test'
  }
};

export type CacheStatus = 'idle' | 'checking' | 'downloading' | 'ready' | 'error';

export interface AudioCacheState {
  status: CacheStatus;
  progressPercent: number;
  sizeBytes: number;
  source: 'cache-api' | 'indexeddb' | 'bundled' | 'unknown';
  error?: string;
}

function initialCacheState(): AudioCacheState {
  return {
    status: 'idle',
    progressPercent: 0,
    sizeBytes: 0,
    source: 'unknown'
  };
}

export const yoyoCacheStore = writable<AudioCacheState>(initialCacheState());
export const beepCacheStore = writable<AudioCacheState>(initialCacheState());

// Backwards compatibility alias for Yo-Yo cache store
export const audioCacheStore = yoyoCacheStore;

function getStoreForType(type: TestType) {
  return type === 'yoyoIR1' ? yoyoCacheStore : beepCacheStore;
}

const inMemoryObjectUrls: Partial<Record<TestType, string>> = {};
const activeDownloadPromises: Partial<Record<TestType, Promise<string>>> = {};

/**
 * Open IndexedDB store safely with graceful degradation.
 */
function openIDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(IDB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function getFromIDB(key: string): Promise<Blob | null> {
  const db = await openIDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(key);
      req.onsuccess = () => {
        const result = req.result as Blob | undefined;
        resolve(result instanceof Blob ? result : null);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function saveToIDB(key: string, blob: Blob): Promise<boolean> {
  const db = await openIDB();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      const req = store.put(blob, key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Check if the audio is already cached in Cache API or IndexedDB.
 */
export async function checkAudioCached(type: TestType = 'yoyoIR1'): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const config = AUDIO_CONFIGS[type];

  // 1. Check in-memory
  if (inMemoryObjectUrls[type]) {
    return true;
  }

  // 2. Check Cache API
  if ('caches' in window) {
    try {
      const cache = await caches.open(CACHE_NAME);
      const matched = await cache.match(config.localPath);
      if (matched) {
        return true;
      }
    } catch {
      // ignore
    }
  }

  // 3. Check IndexedDB
  const blob = await getFromIDB(config.idbKey);
  return blob !== null;
}

/**
 * Load bundled audio for a given test type from cache or the app asset and cache it.
 * Returns an object URL or valid playback src.
 */
export async function loadAndCacheAudio(
  type: TestType,
  onProgress?: (percent: number) => void
): Promise<string> {
  if (inMemoryObjectUrls[type]) {
    return inMemoryObjectUrls[type]!;
  }

  if (activeDownloadPromises[type]) {
    return activeDownloadPromises[type]!;
  }

  const config = AUDIO_CONFIGS[type];
  const store = getStoreForType(type);

  const promise = (async () => {
    store.update((s) => ({ ...s, status: 'checking' }));

    // 1. Attempt to retrieve from Cache API
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cache = await caches.open(CACHE_NAME);
        const matched = await cache.match(config.localPath);
        if (matched) {
          const blob = await matched.blob();
          if (blob.size > 1_000_000) {
            const objectUrl = URL.createObjectURL(blob);
            inMemoryObjectUrls[type] = objectUrl;
            store.set({
              status: 'ready',
              progressPercent: 100,
              sizeBytes: blob.size,
              source: 'cache-api'
            });
            onProgress?.(100);
            return objectUrl;
          }
        }
      } catch (err) {
        console.warn(`Cache API lookup skipped for ${type}:`, err);
      }
    }

    // 2. Attempt to retrieve from IndexedDB
    try {
      const idbBlob = await getFromIDB(config.idbKey);
      if (idbBlob && idbBlob.size > 1_000_000) {
        const objectUrl = URL.createObjectURL(idbBlob);
        inMemoryObjectUrls[type] = objectUrl;
        store.set({
          status: 'ready',
          progressPercent: 100,
          sizeBytes: idbBlob.size,
          source: 'indexeddb'
        });
        onProgress?.(100);
        return objectUrl;
      }
    } catch (err) {
      console.warn(`IndexedDB lookup skipped for ${type}:`, err);
    }

    // 3. Read and cache the bundled app asset
    store.update((s) => ({ ...s, status: 'downloading', progressPercent: 0 }));

    let successfulResponse: Response;
    try {
      const response = await fetch(config.localPath);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      successfulResponse = response;
    } catch (error) {
      const errorMsg = `Failed to load bundled ${config.label} audio.`;
      store.set({
        status: 'error',
        progressPercent: 0,
        sizeBytes: 0,
        source: 'unknown',
        error: `${errorMsg} ${String(error)}`
      });
      delete activeDownloadPromises[type];
      return config.localPath;
    }

    try {
      const contentLengthHeader = successfulResponse.headers.get('content-length');
      const totalBytes = contentLengthHeader
        ? parseInt(contentLengthHeader, 10)
        : config.approxSize;
      const reader = successfulResponse.body?.getReader();

      let blob: Blob;
      if (reader) {
        const chunks: Uint8Array[] = [];
        let receivedBytes = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            receivedBytes += value.length;
            const percent = Math.min(99, Math.round((receivedBytes / totalBytes) * 100));
            store.update((s) => ({
              ...s,
              progressPercent: percent,
              sizeBytes: receivedBytes
            }));
            onProgress?.(percent);
          }
        }
        blob = new Blob(chunks as BlobPart[], { type: 'audio/mp4' });
      } else {
        blob = await successfulResponse.blob();
      }

      // Store in Cache API
      if (typeof window !== 'undefined' && 'caches' in window) {
        try {
          const cache = await caches.open(CACHE_NAME);
          const cacheResponse = new Response(blob, {
            headers: {
              'Content-Type': 'audio/mp4',
              'Content-Length': blob.size.toString()
            }
          });
          await cache.put(config.localPath, cacheResponse);
        } catch (cacheErr) {
          console.warn(`Unable to write to Cache API for ${type}:`, cacheErr);
        }
      }

      // Store in IndexedDB as persistent secondary cache
      try {
        await saveToIDB(config.idbKey, blob);
      } catch (idbErr) {
        console.warn(`Unable to write to IndexedDB for ${type}:`, idbErr);
      }

      const objectUrl = URL.createObjectURL(blob);
      inMemoryObjectUrls[type] = objectUrl;
      store.set({
        status: 'ready',
        progressPercent: 100,
        sizeBytes: blob.size,
        source: 'bundled'
      });
      onProgress?.(100);
      return objectUrl;
    } catch (err) {
      console.error(`Error caching audio blob for ${type}:`, err);
      store.set({
        status: 'error',
        progressPercent: 0,
        sizeBytes: 0,
        source: 'unknown',
        error: String(err)
      });
      return config.localPath;
    } finally {
      delete activeDownloadPromises[type];
    }
  })();

  activeDownloadPromises[type] = promise;
  return promise;
}

export function loadAndCacheYoYoAudio(onProgress?: (percent: number) => void): Promise<string> {
  return loadAndCacheAudio('yoyoIR1', onProgress);
}

export function loadAndCacheBeepAudio(onProgress?: (percent: number) => void): Promise<string> {
  return loadAndCacheAudio('beepTest', onProgress);
}

export async function preloadAllAudio(): Promise<void> {
  await Promise.allSettled([
    loadAndCacheAudio('yoyoIR1'),
    loadAndCacheAudio('beepTest')
  ]);
}

/**
 * Clear cached audio from Cache API and IndexedDB.
 */
export async function clearAudioCache(type?: TestType): Promise<void> {
  const typesToClear: TestType[] = type ? [type] : ['yoyoIR1', 'beepTest'];

  for (const t of typesToClear) {
    if (inMemoryObjectUrls[t]) {
      URL.revokeObjectURL(inMemoryObjectUrls[t]!);
      delete inMemoryObjectUrls[t];
    }
    const store = getStoreForType(t);
    store.set(initialCacheState());
  }

  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      if (!type) {
        await caches.delete(CACHE_NAME);
      } else {
        const cache = await caches.open(CACHE_NAME);
        const config = AUDIO_CONFIGS[type];
        await cache.delete(config.localPath);
      }
    } catch {
      // ignore
    }
  }

  const db = await openIDB();
  if (db) {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      for (const t of typesToClear) {
        store.delete(AUDIO_CONFIGS[t].idbKey);
      }
    } catch {
      // ignore
    }
  }
}
