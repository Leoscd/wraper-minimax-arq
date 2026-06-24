/**
 * Cliente de Vercel KV (Redis) para persistencia de proyectos.
 *
 * Si las env vars no están configuradas (desarrollo local), usa
 * un fallback in-memory para que el dashboard funcione sin DB.
 */

import { kv } from '@vercel/kv';

interface KVAvailable {
  available: boolean;
}

function checkAvailable(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

const IS_KV = checkAvailable();

const memoryStore = new Map<string, string>();

async function memoryGet(key: string): Promise<string | null> {
  return memoryStore.get(key) ?? null;
}

async function memorySet(key: string, value: string): Promise<void> {
  memoryStore.set(key, value);
}

async function memoryDel(key: string): Promise<void> {
  memoryStore.delete(key);
}

async function memoryKeys(pattern: string): Promise<string[]> {
  const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
  return Array.from(memoryStore.keys()).filter((k) => regex.test(k));
}

export const storage = {
  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const raw = IS_KV
        ? await kv.get<string>(key)
        : await memoryGet(key);
      if (!raw) return null;
      return typeof raw === 'string' ? (JSON.parse(raw) as T) : (raw as T);
    } catch (err) {
      console.error(`[storage.get] error for key ${key}:`, err);
      return null;
    }
  },

  async set(key: string, value: unknown): Promise<void> {
    try {
      const raw = JSON.stringify(value);
      if (IS_KV) {
        await kv.set(key, raw);
      } else {
        await memorySet(key, raw);
      }
    } catch (err) {
      console.error(`[storage.set] error for key ${key}:`, err);
    }
  },

  async del(key: string): Promise<void> {
    try {
      if (IS_KV) {
        await kv.del(key);
      } else {
        await memoryDel(key);
      }
    } catch (err) {
      console.error(`[storage.del] error for key ${key}:`, err);
    }
  },

  async keys(pattern: string): Promise<string[]> {
    try {
      if (IS_KV) {
        return await kv.keys(pattern);
      }
      return await memoryKeys(pattern);
    } catch (err) {
      console.error(`[storage.keys] error for pattern ${pattern}:`, err);
      return [];
    }
  },

  isKV: IS_KV,
};

export type { KVAvailable };
