import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, getIpFromRequest, rateLimitResponseHeaders } from './rate-limit';

describe('checkRateLimit (in-memory)', () => {
  beforeEach(() => {
    process.env.KV_REST_API_URL = '';
    process.env.KV_REST_API_TOKEN = '';
  });

  it('permite hasta N requests y bloquea el N+1', async () => {
    const r1 = await checkRateLimit({ action: 'test1', ip: '1.1.1.1', max: 3 });
    const r2 = await checkRateLimit({ action: 'test1', ip: '1.1.1.1', max: 3 });
    const r3 = await checkRateLimit({ action: 'test1', ip: '1.1.1.1', max: 3 });
    const r4 = await checkRateLimit({ action: 'test1', ip: '1.1.1.1', max: 3 });

    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);
    expect(r2.remaining).toBe(1);
    expect(r3.remaining).toBe(0);
    expect(r4.allowed).toBe(false);
    expect(r4.remaining).toBe(0);
  });

  it('contadores separados por IP', async () => {
    await checkRateLimit({ action: 'test2', ip: '1.1.1.1', max: 1 });
    await checkRateLimit({ action: 'test2', ip: '1.1.1.1', max: 1 });
    const otra = await checkRateLimit({ action: 'test2', ip: '2.2.2.2', max: 1 });

    expect(otra.allowed).toBe(true);
    expect(otra.remaining).toBe(0);
  });

  it('contadores separados por acción', async () => {
    await checkRateLimit({ action: 'A', ip: '1.1.1.1', max: 1 });
    const otraAccion = await checkRateLimit({ action: 'B', ip: '1.1.1.1', max: 1 });
    expect(otraAccion.allowed).toBe(true);
  });

  it('resetAt es un ISO string futuro', async () => {
    const r = await checkRateLimit({ action: 'test3', ip: '1.1.1.1', max: 5 });
    expect(typeof r.resetAt).toBe('string');
    expect(new Date(r.resetAt).getTime()).toBeGreaterThan(Date.now());
  });
});

describe('getIpFromRequest', () => {
  it('lee x-forwarded-for (primera IP de la lista)', () => {
    const req = {
      headers: new Headers({
        'x-forwarded-for': '203.0.113.5, 10.0.0.1, 10.0.0.2',
      }),
    };
    expect(getIpFromRequest(req)).toBe('203.0.113.5');
  });

  it('fallback a x-real-ip', () => {
    const req = { headers: new Headers({ 'x-real-ip': '198.51.100.1' }) };
    expect(getIpFromRequest(req)).toBe('198.51.100.1');
  });

  it('fallback a unknown si no hay headers', () => {
    const req = { headers: new Headers() };
    expect(getIpFromRequest(req)).toBe('unknown');
  });
});

describe('rateLimitResponseHeaders', () => {
  it('devuelve headers con formato correcto', () => {
    const h = rateLimitResponseHeaders({
      allowed: true,
      remaining: 3,
      resetAt: '2026-12-31T23:59:59.000Z',
      limit: 5,
    });
    expect(h['X-RateLimit-Limit']).toBe('5');
    expect(h['X-RateLimit-Remaining']).toBe('3');
    expect(h['X-RateLimit-Reset']).toBe('2026-12-31T23:59:59.000Z');
  });
});
