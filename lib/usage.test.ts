import { describe, it, expect, beforeEach } from 'vitest';
import { tokensContados, QUOTA_FREE_TOKENS } from './usage';

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
});
