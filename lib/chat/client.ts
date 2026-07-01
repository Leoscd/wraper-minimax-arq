/**
 * Cliente del chat: hace POST a /api/chat?stream=1, parsea el SSE y delega
 * cada evento a un callback. Lógica pura, testeable sin React ni DOM.
 *
 * Eventos que emite el server (text/event-stream):
 *   - `text`     { type, delta }        -> texto a concatenar
 *   - `tool`     { type, name }         -> herramienta invocada (acumulable)
 *   - `done`     { type, tools_invocadas, tokens } -> fin del stream
 *   - `error`    { type, error }        -> error del server
 *
 * Si la respuesta HTTP no es 2xx, intenta parsear JSON de error y devuelve
 * un `Error` con tipo discriminado (rate_limit | validation | server | network).
 * El fetch usa AbortController con timeout para no colgarse si el server
 * no responde.
 */

export type ChatEvent =
  | { type: 'text'; delta: string }
  | { type: 'tool'; name: string }
  | {
      type: 'entregable';
      id: string;
      tipo: string;
      filename: string;
      url: string;
      message: string;
    }
  | { type: 'done'; tools_invocadas: string[]; tokens?: { input: number; output: number; cache_read: number } }
  | { type: 'error'; error: string };

export interface ChatClientOptions {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  onEvent: (event: ChatEvent) => void;
  /** Timeout total del fetch+stream en ms. Default 60_000. */
  timeoutMs?: number;
  /** AbortSignal externo (p.ej. para que un componente cancele al desmontar). */
  signal?: AbortSignal;
}

export interface ChatClientError extends Error {
  tipo: 'rate_limit' | 'validation' | 'network' | 'timeout' | 'server';
  resetAt?: string;
  status?: number;
}

export function crearErrorCliente(
  mensaje: string,
  tipo: ChatClientError['tipo'],
  extras: { resetAt?: string; status?: number } = {}
): ChatClientError {
  const e = new Error(mensaje) as ChatClientError;
  e.tipo = tipo;
  e.status = extras.status;
  e.resetAt = extras.resetAt;
  return e;
}

export async function enviarChatStream(
  options: ChatClientOptions
): Promise<void> {
  const { messages, onEvent, timeoutMs = 60_000, signal: externalSignal } = options;

  // Combinar el AbortSignal externo con el timeout interno.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs);
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort(externalSignal.reason);
    else externalSignal.addEventListener('abort', () => controller.abort(externalSignal.reason), { once: true });
  }

  let res: Response;
  try {
    res = await fetch('/api/chat?stream=1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if ((err as Error).name === 'AbortError') {
      throw crearErrorCliente(
        'La consulta tardó demasiado y se cortó. Probá de nuevo.',
        'timeout'
      );
    }
    throw crearErrorCliente(
      'No se pudo conectar con el servidor. Revisá tu conexión.',
      'network'
    );
  }
  clearTimeout(timeoutId);

  if (!res.ok || !res.body) {
    let detalle = '';
    let resetAt: string | undefined;
    try {
      const data = await res.json();
      detalle = data.message ?? data.error ?? '';
      resetAt = data.resetAt;
    } catch {
      /* cuerpo no JSON */
    }

    if (res.status === 429) {
      throw crearErrorCliente(
        detalle || 'Hiciste demasiadas consultas. Probá más tarde.',
        'rate_limit',
        { resetAt, status: 429 }
      );
    }
    if (res.status === 400) {
      throw crearErrorCliente(
        detalle || 'La consulta no es válida.',
        'validation',
        { status: 400 }
      );
    }
    throw crearErrorCliente(
      detalle || `Error del servidor (${res.status}).`,
      'server',
      { status: res.status }
    );
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const partes = buffer.split('\n\n');
      buffer = partes.pop() ?? '';

      for (const parte of partes) {
        const linea = parte.trim();
        if (!linea.startsWith('data:')) continue;
        const raw = linea.slice(5).trim();
        if (!raw) continue;

        let evento: ChatEvent;
        try {
          evento = JSON.parse(raw);
        } catch {
          // JSON malformado. Lo ignoramos en vez de tirar el stream entero.
          continue;
        }
        onEvent(evento);
      }
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw crearErrorCliente(
        'La consulta se interrumpió.',
        'timeout'
      );
    }
    throw err;
  }
}
