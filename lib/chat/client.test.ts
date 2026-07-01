/**
 * Tests del cliente de chat (helper puro).
 *
 * Cubren: parsing de eventos SSE, manejo de status codes, timeout,
 * corte de señal externa, errores de red y JSON malformado.
 *
 * Mocks de fetch con vi.fn() para evitar pegarle a M3 real.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { enviarChatStream, crearErrorCliente, type ChatEvent } from './client';

function sseBody(events: ChatEvent[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const chunks = events.map((e) => `data: ${JSON.stringify(e)}\n\n`);
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i < chunks.length) {
        controller.enqueue(encoder.encode(chunks[i]));
        i++;
      } else {
        controller.close();
      }
    },
  });
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function streamResponse(status: number, events: ChatEvent[]): Response {
  return new Response(sseBody(events), {
    status,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

describe('crearErrorCliente', () => {
  it('crea un Error tipado con extras', () => {
    const e = crearErrorCliente('test', 'rate_limit', { resetAt: '2026-01-01', status: 429 });
    expect(e).toBeInstanceOf(Error);
    expect(e.message).toBe('test');
    expect(e.tipo).toBe('rate_limit');
    expect(e.resetAt).toBe('2026-01-01');
    expect(e.status).toBe(429);
  });
});

describe('enviarChatStream - errores HTTP', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rate_limit (429) devuelve error con resetAt y tipo', async () => {
    (fetch as any).mockResolvedValue(
      jsonResponse(429, {
        error: 'Rate limit excedido',
        message: 'Demasiadas consultas.',
        resetAt: '2026-12-31T23:59:59Z',
      })
    );

    await expect(enviarChatStream({ messages: [], onEvent: () => {} })).rejects.toMatchObject({
      tipo: 'rate_limit',
      status: 429,
      resetAt: '2026-12-31T23:59:59Z',
    });
  });

  it('validation (400) devuelve error de tipo validation', async () => {
    (fetch as any).mockResolvedValue(
      jsonResponse(400, {
        message: 'Body inválido',
        issues: [{ path: 'messages', message: 'requerido' }],
      })
    );

    await expect(enviarChatStream({ messages: [], onEvent: () => {} })).rejects.toMatchObject({
      tipo: 'validation',
      status: 400,
    });
  });

  it('server (500) devuelve error generico', async () => {
    (fetch as any).mockResolvedValue(jsonResponse(500, { error: 'boom' }));

    await expect(enviarChatStream({ messages: [], onEvent: () => {} })).rejects.toMatchObject({
      tipo: 'server',
      status: 500,
    });
  });

  it('fallo de red (fetch rechaza) devuelve error tipo network', async () => {
    (fetch as any).mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(enviarChatStream({ messages: [], onEvent: () => {} })).rejects.toMatchObject({
      tipo: 'network',
    });
  });

  it('timeout via AbortController devuelve error tipo timeout', async () => {
    (fetch as any).mockImplementation((_url: string, opts: any) => {
      // Devuelve una promise que rechaza con AbortError cuando se aborta.
      return new Promise((_, reject) => {
        const signal: AbortSignal | undefined = opts?.signal;
        if (signal) {
          if (signal.aborted) {
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
            return;
          }
          signal.addEventListener('abort', () => {
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
          });
        }
        // Si nunca se aborta, la promise queda pendiente — el test tiene
        // un timeoutMs chico que dispara el abort.
      });
    });

    await expect(
      enviarChatStream({ messages: [], onEvent: () => {}, timeoutMs: 20 })
    ).rejects.toMatchObject({ tipo: 'timeout' });
  });

  it('AbortSignal externo cancela el fetch', async () => {
    (fetch as any).mockImplementation((_url: string, opts: any) => {
      return new Promise((_, reject) => {
        const signal: AbortSignal | undefined = opts?.signal;
        if (signal) {
          if (signal.aborted) {
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
            return;
          }
          signal.addEventListener('abort', () => {
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
          });
        }
      });
    });

    const controller = new AbortController();
    setTimeout(() => controller.abort(), 10);

    await expect(
      enviarChatStream({ messages: [], onEvent: () => {}, signal: controller.signal })
    ).rejects.toMatchObject({ tipo: 'timeout' });
  });
});

describe('enviarChatStream - parseo de eventos SSE', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('emite eventos text, tool, done en orden', async () => {
    (fetch as any).mockResolvedValue(
      streamResponse(200, [
        { type: 'text', delta: 'Hola ' },
        { type: 'tool', name: 'calcular_hormigon' },
        { type: 'text', delta: 'mundo' },
        { type: 'done', tools_invocadas: ['calcular_hormigon'] },
      ])
    );

    const events: ChatEvent[] = [];
    await enviarChatStream({
      messages: [{ role: 'user', content: 'test' }],
      onEvent: (e) => events.push(e),
    });

    expect(events.map((e) => e.type)).toEqual(['text', 'tool', 'text', 'done']);
    const done = events[3] as Extract<ChatEvent, { type: 'done' }>;
    expect(done.tools_invocadas).toEqual(['calcular_hormigon']);
  });

  it('ignora chunks con JSON malformado sin tirar el stream', async () => {
    const encoder = new TextEncoder();
    (fetch as any).mockResolvedValue(
      new Response(
        encoder.encode(
          'data: {"type":"text","delta":"ok"}\n\ndata: {invalid json\n\ndata: {"type":"done","tools_invocadas":[]}\n\n'
        ),
        { status: 200, headers: { 'Content-Type': 'text/event-stream' } }
      )
    );

    const events: ChatEvent[] = [];
    await enviarChatStream({ messages: [], onEvent: (e) => events.push(e) });

    expect(events.map((e) => e.type)).toEqual(['text', 'done']);
  });
});
