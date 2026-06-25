import Anthropic from '@anthropic-ai/sdk';

const apiKey = process.env.ANTHROPIC_API_KEY;
const baseURL = process.env.ANTHROPIC_BASE_URL || 'https://api.minimax.io/anthropic';

if (!apiKey) {
  console.warn(
    '[minimax] ANTHROPIC_API_KEY no está configurada. Las llamadas a M3 fallarán.'
  );
}

export const minimax = new Anthropic({
  apiKey: apiKey || 'placeholder',
  baseURL,
});

export const MODELS = {
  flagship: 'MiniMax-M3',
  fast: 'MiniMax-M2.7-highspeed',
} as const;

export type ModelName = (typeof MODELS)[keyof typeof MODELS];

export const DEFAULT_MODEL: ModelName = MODELS.flagship;

/**
 * `system` puede ser un string simple o un array de bloques de texto. Usar el
 * array permite marcar bloques estáticos (metodología, design tokens, ejemplo
 * few-shot) con `cache_control` para que MiniMax los cachee entre llamadas.
 */
export interface MessageParams {
  model?: ModelName;
  max_tokens: number;
  system: string | Anthropic.TextBlockParam[];
  messages: Anthropic.MessageParam[];
  tools?: Anthropic.Tool[];
  stream?: boolean;
  temperature?: number;
}

export async function createMessage(params: MessageParams) {
  return minimax.messages.create({
    model: params.model || DEFAULT_MODEL,
    max_tokens: params.max_tokens,
    system: params.system,
    messages: params.messages,
    tools: params.tools,
    stream: params.stream ?? false,
    temperature: params.temperature ?? 1.0,
  });
}

/**
 * Variante streaming de `createMessage`. Devuelve el `MessageStream` del SDK
 * (`minimax.messages.stream(...)`), que es async-iterable sobre los eventos
 * (`content_block_delta`, `message_delta`, etc.). Lo usamos en el endpoint para
 * reemitir el texto del modelo a medida que llega y bajar la latencia percibida.
 */
export function streamMessage(params: Omit<MessageParams, 'stream'>) {
  return minimax.messages.stream({
    model: params.model || DEFAULT_MODEL,
    max_tokens: params.max_tokens,
    system: params.system,
    messages: params.messages,
    tools: params.tools,
    temperature: params.temperature ?? 1.0,
  });
}

/**
 * Helper para construir un bloque de system estático.
 *
 * MiniMax cachea automáticamente el prefijo del request (en pruebas devuelve
 * `cache_read_input_tokens > 0` sin enviar `cache_control`), así que sólo hace
 * falta mantener estos bloques idénticos entre llamadas para aprovechar el cache.
 * (En el SDK 0.32.1 `cache_control` vive en la API beta; no lo usamos.)
 */
export function staticBlock(text: string): Anthropic.TextBlockParam {
  return { type: 'text', text };
}
