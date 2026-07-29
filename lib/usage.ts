/**
 * Medidor de tokens por usuario para la cuota de 100k.
 *
 * Cuenta **output + input NO cacheado** (excluye `cache_read_input_tokens`,
 * que MiniMax cobra casi gratis gracias al caching implícito). Diseño del
 * PLAN-LANZAMIENTO.md §2: con esta fórmula 100k tokens dan para varios
 * proyectos completos (un turno de chat ~300-1500, un entregable ~5500).
 *
 * Diseño:
 *   - Counter por (userId) en Vercel KV con TTL mensual (reset natural).
 *   - Si KV no está configurado, usa Map in-memory (dev / single-instance).
 *   - Header `X-Usage-*` en cada response para que la UI lo muestre sin
 *     pedir un endpoint extra.
 *   - **No falla la response** si el registro de usage falla: lo loguea pero
 *     deja pasar. La cuota es UX, no seguridad.
 *
 * El `rate-limit` (por IP, en lib/rate-limit.ts) sigue sirviendo para
 * limitar abuso anonimo. Este modulo es la cuota del usuario autenticado.
 */

import { storage } from './kv';

export const QUOTA_FREE_TOKENS = 100_000;

export interface RecordUsageOptions {
  userId: string;
  /** identica el endpoint: 'chat' | 'generate' | 'documento' */
  action: 'chat' | 'generate' | 'documento';
  /** usage completo de la respuesta de M3. */
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens: number;
  };
}

export interface UsageSnapshot {
  userId: string;
  /** tokens consumidos en el mes/periodo actual */
  used: number;
  /** configurado por PLAN-LANZAMIENTO.md §2 */
  limit: number;
  /** resetAt: cuando vence el periodo. Default: fin de mes. */
  resetAt: string;
  /** percent restante, redondeado a 1 decimal */
  remainingPct: number;
  /** aproximado en "presupuestos" segun PLAN-LANZAMIENTO.md (1 entregable ~ 5500 tokens) */
  estimatedPresupuestos: number;
}

function usageKey(userId: string): string {
  return `usage:${userId}`;
}

function endOfMonth(): Date {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return end;
}

/** Calcula los tokens que cuentan contra la cuota, segun PLAN-LANZAMIENTO.md §2. */
export function tokensContados(usage: RecordUsageOptions['usage']): number {
  const noCacheados = Math.max(0, usage.input_tokens - usage.cache_read_input_tokens);
  return noCacheados + usage.output_tokens;
}

export async function recordUsage(opts: RecordUsageOptions): Promise<UsageSnapshot> {
  const key = usageKey(opts.userId);
  const ttlMs = endOfMonth().getTime() - Date.now();
  const tokens = tokensContados(opts.usage);

  let current: { used: number; resetAt: string };
  try {
    const stored = await storage.get<{ used: number; resetAt: string }>(key);
    current = stored ?? { used: 0, resetAt: endOfMonth().toISOString() };

    // Reset si vencio el periodo.
    if (new Date(current.resetAt).getTime() < Date.now()) {
      current = { used: 0, resetAt: endOfMonth().toISOString() };
    }

    current.used += tokens;
    await storage.set(key, current, Math.ceil(ttlMs / 1000));
  } catch (err) {
    // Si KV falla, logueamos pero NO bloqueamos la response al usuario.
    console.warn('[usage] No se pudo registrar el uso:', err);
    current = { used: 0, resetAt: endOfMonth().toISOString() };
  }

  return snapshotFromStored(opts.userId, current);
}

export async function getUsage(userId: string): Promise<UsageSnapshot> {
  try {
    const stored = await storage.get<{ used: number; resetAt: string }>(usageKey(userId));
    if (!stored) {
      return snapshotFromStored(userId, {
        used: 0,
        resetAt: endOfMonth().toISOString(),
      });
    }
    return snapshotFromStored(userId, stored);
  } catch (err) {
    console.warn('[usage] No se pudo leer el uso:', err);
    return snapshotFromStored(userId, { used: 0, resetAt: endOfMonth().toISOString() });
  }
}

function snapshotFromStored(
  userId: string,
  stored: { used: number; resetAt: string }
): UsageSnapshot {
  const limit = QUOTA_FREE_TOKENS;
  const remaining = Math.max(0, limit - stored.used);
  const remainingPct = Math.round((remaining / limit) * 1000) / 10;
  // 1 presupuesto promedio ~ 5500 tokens (medido en el plan).
  const estimatedPresupuestos = Math.floor(remaining / 5500);
  return {
    userId,
    used: stored.used,
    limit,
    resetAt: stored.resetAt,
    remainingPct,
    estimatedPresupuestos,
  };
}

export function usageResponseHeaders(s: UsageSnapshot): Record<string, string> {
  return {
    'X-Usage-Used': String(s.used),
    'X-Usage-Limit': String(s.limit),
    'X-Usage-Remaining-Pct': String(s.remainingPct),
    'X-Usage-Reset': s.resetAt,
  };
}
