import { describe, it, expect, beforeEach, vi } from 'vitest';

const authMock = vi.fn();
const getPdfCounterMock = vi.fn();
const recordPdfMock = vi.fn();
const getEntregablePorIdMock = vi.fn();

vi.mock('@/lib/auth', () => ({
  auth: (...args: unknown[]) => authMock(...args),
}));

vi.mock('@/lib/usage', () => ({
  getPdfCounter: (...args: unknown[]) => getPdfCounterMock(...args),
  recordPdf: (...args: unknown[]) => recordPdfMock(...args),
}));

vi.mock('@/lib/tools/generar-entregable', () => ({
  getEntregablePorId: (...args: unknown[]) => getEntregablePorIdMock(...args),
}));

import { POST } from './route';

beforeEach(() => {
  authMock.mockReset();
  getPdfCounterMock.mockReset();
  recordPdfMock.mockReset();
  getEntregablePorIdMock.mockReset();
});

function makeParams(id: string) {
  return { params: { id } };
}

describe('POST /api/entregable/[id]/pdf', () => {
  it('401 si no hay sesion', async () => {
    authMock.mockResolvedValue(null);
    const res = await POST({} as any, makeParams('ent_1'));
    expect(res.status).toBe(401);
  });

  it('404 si el id no existe en el store', async () => {
    authMock.mockResolvedValue({ user: { id: 'u1' } });
    getEntregablePorIdMock.mockReturnValue(null);
    const res = await POST({} as any, makeParams('ent_404'));
    expect(res.status).toBe(404);
  });

  it('429 si el usuario agoto los 3 PDFs', async () => {
    authMock.mockResolvedValue({ user: { id: 'u1' } });
    getEntregablePorIdMock.mockReturnValue({
      id: 'ent_1',
      filename: 'test.pdf',
      url: '/preview/ent_1',
    });
    getPdfCounterMock.mockResolvedValue({
      userId: 'u1',
      used: 3,
      limit: 3,
      remaining: 0,
      resetAt: '2026-12-31',
      agotado: true,
    });
    const res = await POST({} as any, makeParams('ent_1'));
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error).toMatch(/agotados/i);
    expect(data.limit).toBe(3);
    expect(recordPdfMock).not.toHaveBeenCalled();
  });

  it('200 y registra cuando todo OK', async () => {
    authMock.mockResolvedValue({ user: { id: 'u1' } });
    getEntregablePorIdMock.mockReturnValue({
      id: 'ent_1',
      filename: 'test.pdf',
      url: '/preview/ent_1',
    });
    getPdfCounterMock.mockResolvedValue({
      userId: 'u1',
      used: 1,
      limit: 3,
      remaining: 2,
      resetAt: '2026-12-31',
      agotado: false,
    });
    recordPdfMock.mockResolvedValue({
      userId: 'u1',
      used: 2,
      limit: 3,
      remaining: 1,
      resetAt: '2026-12-31',
      agotado: false,
    });
    const res = await POST({} as any, makeParams('ent_1'));
    expect(res.status).toBe(200);
    expect(recordPdfMock).toHaveBeenCalledWith('u1');
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.pdf.used).toBe(2);
  });
});
