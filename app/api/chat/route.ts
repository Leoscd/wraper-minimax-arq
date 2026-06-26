/**
 * Endpoint del Asistente: /api/chat
 *
 * Chat multi-turno especializado en arquitectura/construcción. A diferencia de
 * /api/generate (one-shot que produce HTML), acá M3 conversa y llama a las
 * tools determinísticas para responder consultas (precios, cómputos, MO, etc.).
 *
 * Flujo:
 *   1. Recibe el historial de mensajes (role/content) del cliente.
 *   2. Llama a M3 con el system del asistente + todas las tools.
 *   3. Si M3 pide tools, las ejecuta y reinyecta los resultados (loop).
 *   4. Cuando M3 responde texto sin pedir tools, eso es la respuesta final.
 *
 * Fase 1: respuesta NO streaming (JSON). Las consultas son cortas, así que el
 * costo de no streamear es bajo; el streaming queda como mejora futura.
 */

import { NextRequest, NextResponse } from 'next/server';
import type Anthropic from '@anthropic-ai/sdk';
import { createMessage, MODELS } from '@/lib/minimax';
import { allTools } from '@/lib/tools/registry';
import { ejecutarTool } from '@/lib/tools/ejecutar';
import { chatSystemBlocks } from '@/lib/chat/system';
import { ChatRequestSchema, formatZodError } from '@/lib/schemas';
import {
  checkRateLimit,
  getIpFromRequest,
  rateLimitResponseHeaders,
} from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_ITERACIONES = 6;
const MAX_TOKENS = 4000;

export async function POST(req: NextRequest) {
  try {
    const ip = getIpFromRequest(req);
    const rl = await checkRateLimit({ action: 'chat', ip });
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit excedido',
          message: `Demasiadas consultas. Probá de nuevo después de ${rl.resetAt}.`,
          resetAt: rl.resetAt,
          limit: rl.limit,
        },
        { status: 429, headers: rateLimitResponseHeaders(rl) }
      );
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Body inválido: se esperaba JSON' },
        { status: 400 }
      );
    }

    const parsed = ChatRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(formatZodError(parsed.error), {
        status: 400,
        headers: rateLimitResponseHeaders(rl),
      });
    }

    // El historial del cliente (texto plano) inicia el array de mensajes. El
    // loop le va agregando los turnos de assistant (con tool_use) y los
    // tool_result hasta obtener la respuesta final.
    const messages: Anthropic.MessageParam[] = parsed.data.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const system = chatSystemBlocks();

    let reply = '';
    const toolsInvocadas: string[] = [];
    let iteraciones = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    let cacheRead = 0;
    let cacheCreation = 0;

    while (iteraciones < MAX_ITERACIONES) {
      iteraciones++;

      const response = await createMessage({
        model: MODELS.flagship,
        max_tokens: MAX_TOKENS,
        system,
        messages,
        tools: allTools(),
      });

      const usage = (response as any).usage ?? {};
      inputTokens += usage.input_tokens ?? 0;
      outputTokens += usage.output_tokens ?? 0;
      cacheRead += usage.cache_read_input_tokens ?? 0;
      cacheCreation += usage.cache_creation_input_tokens ?? 0;

      const assistantContent = (response as any).content as any[];
      messages.push({ role: 'assistant', content: assistantContent as any });

      const toolUseBlocks = assistantContent.filter(
        (b: any) => b.type === 'tool_use'
      );

      if (toolUseBlocks.length === 0) {
        reply = assistantContent
          .filter((b: any) => b.type === 'text')
          .map((b: any) => b.text)
          .join('\n\n')
          .trim();
        break;
      }

      const toolResults: any[] = [];
      for (const block of toolUseBlocks) {
        toolsInvocadas.push(block.name);
        try {
          const result = ejecutarTool(block.name, block.input);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result, null, 2),
          });
        } catch (err) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify({
              error: err instanceof Error ? err.message : 'Error desconocido',
            }),
            is_error: true,
          });
        }
      }

      messages.push({ role: 'user', content: toolResults as any });
    }

    if (!reply) {
      reply =
        'No pude completar la respuesta (demasiados pasos). Reformulá la consulta, por favor.';
    }

    return NextResponse.json(
      {
        reply,
        tools_invocadas: [...new Set(toolsInvocadas)],
        iteraciones,
        tokens: {
          input: inputTokens,
          output: outputTokens,
          cache_read: cacheRead,
          cache_creation: cacheCreation,
        },
      },
      { headers: rateLimitResponseHeaders(rl) }
    );
  } catch (err) {
    console.error('[/api/chat] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}
