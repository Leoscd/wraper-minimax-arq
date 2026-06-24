import Anthropic from '@anthropic-ai/sdk';

const apiKey = process.env.ANTHROPIC_API_KEY;
const baseURL = process.env.ANTHROPIC_BASE_URL || 'https://api.minimaxi.com/anthropic';

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

export interface MessageParams {
  model?: ModelName;
  max_tokens: number;
  system: string;
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
