/**
 * Tests de integración del endpoint /api/chat.
 *
 * Probamos el handler POST con `createMessage` (M3) y `ejecutarTool` MOCKEADOS:
 * no se le pega a MiniMax ni se ejecutan las tools reales (esas tienen sus
 * propios tests). Acá el foco es la LÓGICA DEL LOOP del endpoint:
 *   tool_use → ejecutar → reinyectar tool_result → repetir hasta texto final.
 *
 * El rate-limit usa el fallback in-memory (sin KV), así que corre tal cual.
 * Para aislar el contador entre tests, cada uno usa una IP distinta.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextRequest } from 'next/server';

// --- Mocks ---
const createMessage = vi.fn();
const ejecutarTool = vi.fn();

const streamMessage = vi.fn();

vi.mock('@/lib/minimax', () => ({
  createMessage: (...args: unknown[]) => createMessage(...args),
  streamMessage: (...args: unknown[]) => streamMessage(...args),
  MODELS: { flagship: 'MiniMax-M3', fast: 'MiniMax-M2.7-highspeed' },
  staticBlock: (text: string) => ({ type: 'text', text }),
}));

vi.mock('@/lib/tools/ejecutar', () => ({
  ejecutarTool: (...args: unknown[]) => ejecutarTool(...args),
}));

import { POST } from './route';

// --- Helpers ---

/** Respuesta de M3 que pide una (o varias) tool(s). */
function toolUseResponse(
  tools: Array<{ id: string; name: string; input?: unknown }>
) {
  return {
    content: tools.map((t) => ({
      type: 'tool_use',
      id: t.id,
      name: t.name,
      input: t.input ?? {},
    })),
    usage: { input_tokens: 10, output_tokens: 5 },
  };
}

/** Respuesta final de M3 (texto, sin tools). */
function textResponse(text: string) {
  return {
    content: [{ type: 'text', text }],
    usage: {
      input_tokens: 8,
      output_tokens: 12,
      cache_read_input_tokens: 4,
      cache_creation_input_tokens: 2,
    },
  };
}

let ipCounter = 0;
function makeReq(body: unknown, opts: { raw?: string; ip?: string } = {}): NextRequest {
  const ip = opts.ip ?? `10.0.0.${++ipCounter}`;
  const init: RequestInit = {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: opts.raw ?? JSON.stringify(body),
  };
  return new Request('http://localhost/api/chat', init) as unknown as NextRequest;
}

const historial = { messages: [{ role: 'user', content: 'Hola' }] };

beforeEach(() => {
  createMessage.mockReset();
  ejecutarTool.mockReset();
});

describe('POST /api/chat', () => {
  it('happy path: ejecuta la tool pedida y devuelve el texto final', async () => {
    createMessage
      .mockResolvedValueOnce(
        toolUseResponse([{ id: 't1', name: 'buscar_precio', input: { termino: 'cemento' } }])
      )
      .mockResolvedValueOnce(textResponse('El cemento cuesta $X.'));
    ejecutarTool.mockReturnValue({ precio: 1000 });

    const res = await POST(makeReq(historial));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(ejecutarTool).toHaveBeenCalledWith('buscar_precio', { termino: 'cemento' });
    expect(data.reply).toBe('El cemento cuesta $X.');
    expect(data.tools_invocadas).toEqual(['buscar_precio']);
    expect(data.iteraciones).toBe(2);
    // Acumula tokens de ambas llamadas (incluido cache).
    expect(data.tokens.cache_read).toBe(4);
    expect(data.tokens.cache_creation).toBe(2);
  });

  it('deduplica tools_invocadas cuando la misma tool se llama varias veces', async () => {
    createMessage
      .mockResolvedValueOnce(
        toolUseResponse([
          { id: 't1', name: 'buscar_precio', input: { termino: 'a' } },
          { id: 't2', name: 'buscar_precio', input: { termino: 'b' } },
        ])
      )
      .mockResolvedValueOnce(textResponse('Listo.'));
    ejecutarTool.mockReturnValue({ ok: true });

    const res = await POST(makeReq(historial));
    const data = await res.json();

    expect(ejecutarTool).toHaveBeenCalledTimes(2);
    expect(data.tools_invocadas).toEqual(['buscar_precio']);
  });

  it('respuesta directa sin tools: una sola iteración', async () => {
    createMessage.mockResolvedValueOnce(textResponse('No necesito calcular nada.'));

    const res = await POST(makeReq(historial));
    const data = await res.json();

    expect(ejecutarTool).not.toHaveBeenCalled();
    expect(data.reply).toBe('No necesito calcular nada.');
    expect(data.iteraciones).toBe(1);
  });

  it('si una tool tira error, reinyecta el error y sigue (no 500)', async () => {
    createMessage
      .mockResolvedValueOnce(toolUseResponse([{ id: 't1', name: 'calcular_hormigon' }]))
      .mockResolvedValueOnce(textResponse('No pude calcular, faltan dimensiones.'));
    ejecutarTool.mockImplementation(() => {
      throw new Error('dimensiones inválidas');
    });

    const res = await POST(makeReq(historial));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.reply).toBe('No pude calcular, faltan dimensiones.');
    // Se reinyectó un tool_result con is_error en algún turno de usuario.
    // (messages es la misma referencia mutada en todas las llamadas, así que
    // inspeccionamos el array final acumulado.)
    const mensajesFinales = createMessage.mock.calls.at(-1)![0].messages;
    const huboToolResultError = mensajesFinales.some(
      (m: any) =>
        m.role === 'user' &&
        Array.isArray(m.content) &&
        m.content.some((b: any) => b.type === 'tool_result' && b.is_error === true)
    );
    expect(huboToolResultError).toBe(true);
  });

  it('corta en MAX_ITERACIONES y devuelve el fallback si M3 nunca para de pedir tools', async () => {
    createMessage.mockResolvedValue(
      toolUseResponse([{ id: 't1', name: 'buscar_precio' }])
    );
    ejecutarTool.mockReturnValue({ ok: true });

    const res = await POST(makeReq(historial));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.iteraciones).toBe(6); // MAX_ITERACIONES
    expect(data.reply).toMatch(/demasiados pasos/i);
  });

  it('400 si el body no es JSON válido', async () => {
    const res = await POST(makeReq(null, { raw: 'esto no es json' }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/Body inválido/i);
    expect(createMessage).not.toHaveBeenCalled();
  });

  it('400 si el body no pasa el schema (messages vacío)', async () => {
    const res = await POST(makeReq({ messages: [] }));

    expect(res.status).toBe(400);
    expect(createMessage).not.toHaveBeenCalled();
  });

  it('429 al exceder el rate limit (40/h por IP)', async () => {
    createMessage.mockResolvedValue(textResponse('ok'));
    const ip = '203.0.113.77'; // IP fija para acumular en el mismo contador

    let last: Response | undefined;
    for (let i = 0; i < 41; i++) {
      last = await POST(makeReq(historial, { ip }));
    }

    expect(last!.status).toBe(429);
    expect(last!.headers.get('X-RateLimit-Limit')).toBe('40');
    const data = await last!.json();
    expect(data.error).toMatch(/Rate limit/i);
  });

  /**
   * Invariante: tools_invocadas siempre es un array (puede ser vacío) y
   * SIEMPRE refleja las tools reales que M3 pidió. Esto es lo que la UI usa
   * para mostrar los badges de tools → los números que ve el usuario salen
   * de aca, no del modelo.
   */
  it('invariante: tools_invocadas siempre es array y refleja lo que M3 pidió', async () => {
    // Caso A: M3 NO pide tools -> array vacío, NUNCA null/undefined.
    createMessage.mockResolvedValueOnce(textResponse('Sin números.'));
    const resA = await POST(makeReq(historial));
    const dataA = await resA.json();
    expect(Array.isArray(dataA.tools_invocadas)).toBe(true);
    expect(dataA.tools_invocadas).toEqual([]);

    // Caso B: M3 pide calcular_hormigon -> la tool aparece en la lista.
    createMessage
      .mockReset()
      .mockResolvedValueOnce(
        toolUseResponse([{ id: 'h1', name: 'calcular_hormigon', input: { volumen_m3: 5, clase: 'H-21' } }])
      )
      .mockResolvedValueOnce(textResponse('Necesitás 8 bolsas de cemento.'));
    ejecutarTool.mockReturnValue({ cemento_bolsas_50kg: 8 });

    const resB = await POST(makeReq(historial));
    const dataB = await resB.json();
    expect(dataB.tools_invocadas).toContain('calcular_hormigon');
    expect(ejecutarTool).toHaveBeenCalledWith('calcular_hormigon', {
      volumen_m3: 5,
      clase: 'H-21',
    });
  });
});
