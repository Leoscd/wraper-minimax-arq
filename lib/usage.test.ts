import { describe, it, expect, beforeEach } from 'vitest';
import {
  tokensContados,
  QUOTA_FREE_TOKENS,
  PDF_LIMIT_FREE,
  getPdfCounter,
  recordPdf,
} from './usage';

describe('tokensContados', () => {
  it('cuenta output + (input - cache_read)', () => {
    const used = tokensContados({
      input_tokens: 1000,
      output_tokens: 500,
      cache_read_input_tokens: 800,
    });
    expect(used).toBe(1000 - 800 + 500); // 200 + 500 = 700
  });

  it('no da negativo si cache_read > input_tokens', () => {
    const used = tokensContados({
      input_tokens: 100,
      output_tokens: 50,
      cache_read_input_tokens: 500,
    });
    expect(used).toBe(0 + 50); // cache_read > input => input_no_cacheado = 0
  });

  it('cuenta todo el input + output si no hay cache', () => {
    const used = tokensContados({
      input_tokens: 2000,
      output_tokens: 1000,
      cache_read_input_tokens: 0,
    });
    expect(used).toBe(2000 + 1000);
  });

  it('ignora cache_read (no se cobra)', () => {
    const usedCached = tokensContados({
      input_tokens: 1000,
      output_tokens: 500,
      cache_read_input_tokens: 1000,
    });
    const usedNoCache = tokensContados({
      input_tokens: 1000,
      output_tokens: 500,
      cache_read_input_tokens: 0,
    });
    expect(usedCached).toBe(500);
    expect(usedNoCache).toBe(1500);
  });
});

describe('constants', () => {
  it('cuota free es 100.000 tokens', () => {
    expect(QUOTA_FREE_TOKENS).toBe(100_000);
  });

  it('PDF limit free es 3', () => {
    expect(PDF_LIMIT_FREE).toBe(3);
  });
});

describe('PDF counter (in-memory fallback)', () => {
  it('arranca en 0 usados para un userId nuevo', async () => {
    const s = await getPdfCounter('user-nuevo');
    expect(s.used).toBe(0);
    expect(s.limit).toBe(3);
    expect(s.remaining).toBe(3);
    expect(s.agotado).toBe(false);
  });

  it('incrementa con cada recordPdf', async () => {
    const userId = `user-inc-${Date.now()}`;
    await recordPdf(userId);
    await recordPdf(userId);
    const after = await getPdfCounter(userId);
    expect(after.used).toBe(2);
    expect(after.remaining).toBe(1);
    expect(after.agotado).toBe(false);
  });

  it('marca agotado=true al llegar al limite', async () => {
    const userId = `user-agot-${Date.now()}`;
    await recordPdf(userId);
    await recordPdf(userId);
    await recordPdf(userId);
    const after = await getPdfCounter(userId);
    expect(after.used).toBe(3);
    expect(after.remaining).toBe(0);
    expect(after.agotado).toBe(true);
  });

  it('counters son independientes por userId', async () => {
    const u1 = `user-a-${Date.now()}`;
    const u2 = `user-b-${Date.now()}`;
    await recordPdf(u1);
    await recordPdf(u2);
    await recordPdf(u2);
    expect((await getPdfCounter(u1)).used).toBe(1);
    expect((await getPdfCounter(u2)).used).toBe(2);
  });
});
