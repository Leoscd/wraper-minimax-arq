/**
 * Rate limiting simple por IP usando Vercel KV con fallback in-memory.
 *
 * Diseño:
 *   - Counter por (acción, IP, ventana de 1h)
 *   - Si supera el máximo, devuelve `allowed: false` con `resetAt`
 *   - Si Vercel KV no está configurado, usa Map in-memory (válido para
 *     dev/single-instance; en multi-instancia habría race conditions)
 *   - La IP se obtiene de `x-forwarded-for` (Vercel/proxies) o
 *     `x-real-ip`. Si no hay nada, usa 'unknown' (compartido entre todos
 *     los que no tienen IP, lo cual es un fallback conservador).
 *
 * Defaults:
 *   - /api/generate: 5 / hora / IP (es el endpoint más caro: consume M3)
 *   - /api/lead: 10 / hora / IP (suscripción a emails)
 *   - /api/upload: 30 / hora / IP (más permisivo, son archivos)
 */

import { storage } from './kv';

export interface RateLimitOptions {
  action: string;
  ip: string;
  max?: number;
  windowSeconds?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: string;
  limit: number;
}

const DEFAULTS: Record<string, { max: number; windowSeconds: number }> = {
  generate: { max: 5, windowSeconds: 3600 },
  chat: { max: 40, windowSeconds: 3600 },
  lead: { max: 10, windowSeconds: 3600 },
  upload: { max: 30, windowSeconds: 3600 },
};

const memCounters = new Map<string, { count: number; resetAt: number }>();

function counterKey(action: string, ip: string): string {
  return `ratelimit:${action}:${ip}`;
}

export async function checkRateLimit({
  action,
  ip,
  max,
  windowSeconds,
}: RateLimitOptions): Promise<RateLimitResult> {
  const cfg = DEFAULTS[action] ?? {
    max: max ?? 10,
    windowSeconds: windowSeconds ?? 3600,
  };
  const effectiveMax = max ?? cfg.max;
  const effectiveWindow = windowSeconds ?? cfg.windowSeconds;
  const key = counterKey(action, ip || 'unknown');
  const now = Date.now();

  if (storage.isKV) {
    return await checkKV(key, effectiveMax, effectiveWindow);
  }
  return checkMemory(key, effectiveMax, effectiveWindow, now);
}

async function checkKV(
  key: string,
  max: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const stored = await storage.get<{ count: number; resetAt: number }>(key);
  let count = stored?.count ?? 0;
  let resetAt = stored?.resetAt ?? now + windowSeconds * 1000;

  if (now >= resetAt) {
    count = 0;
    resetAt = now + windowSeconds * 1000;
  }

  count += 1;
  await storage.set(key, { count, resetAt });

  return {
    allowed: count <= max,
    remaining: Math.max(0, max - count),
    resetAt: new Date(resetAt).toISOString(),
    limit: max,
  };
}

function checkMemory(
  key: string,
  max: number,
  windowSeconds: number,
  now: number
): RateLimitResult {
  let entry = memCounters.get(key);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + windowSeconds * 1000 };
  }
  entry.count += 1;
  memCounters.set(key, entry);

  return {
    allowed: entry.count <= max,
    remaining: Math.max(0, max - entry.count),
    resetAt: new Date(entry.resetAt).toISOString(),
    limit: max,
  };
}

export function getIpFromRequest(req: { headers: Headers }): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]!.trim();
  const xri = req.headers.get('x-real-ip');
  if (xri) return xri.trim();
  return 'unknown';
}

export function rateLimitResponseHeaders(
  result: RateLimitResult
): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': result.resetAt,
  };
}
