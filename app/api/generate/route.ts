/**
 * Endpoint principal: /api/generate
 *
 * Genera la presentación HTML "Dark Gold" con MiniMax M3 en modo ONE-SHOT.
 *
 * Flujo:
 *   1. Recibe el input del usuario (proyecto, branding, archivos, presupuesto)
 *   2. Pre-computa/normaliza el presupuesto y arma un "brief":
 *        - bloques estáticos cacheables (metodología + design tokens + ejemplo)
 *        - mensaje dinámico con los datos del proyecto
 *   3. Hace UNA llamada a M3 con prompt caching → recibe el HTML completo
 *   4. Las tools quedan como fallback por si el modelo decide invocarlas
 *   5. Devuelve el HTML al cliente
 */

import { NextRequest, NextResponse } from 'next/server';
import { createMessage, streamMessage, MODELS } from '@/lib/minimax';
import { allTools } from '@/lib/tools/registry';
import { construirBrief } from '@/lib/generation/brief';
import type { GenerationRequest } from '@/lib/types';
import {
  calcularHormigon,
  calcularHierroLongitudinal,
  calcularEstribos,
  calcularMorteroRevoque,
  calcularMamposteria,
  buscarPrecio,
  calcularManoObra,
  aplicarDesperdicio,
  calcularCronograma,
  calcularCurvaInversion,
} from '@/lib/tools';

export const runtime = 'nodejs';
export const maxDuration = 60;

function ejecutarTool(nombre: string, input: unknown): unknown {
  switch (nombre) {
    case 'calcular_hormigon':
      return calcularHormigon(input as Parameters<typeof calcularHormigon>[0]);
    case 'calcular_hierro_longitudinal':
      return calcularHierroLongitudinal(
        input as Parameters<typeof calcularHierroLongitudinal>[0]
      );
    case 'calcular_estribos':
      return calcularEstribos(input as Parameters<typeof calcularEstribos>[0]);
    case 'calcular_mortero_revoque':
      return calcularMorteroRevoque(
        input as Parameters<typeof calcularMorteroRevoque>[0]
      );
    case 'calcular_mamposteria':
      return calcularMamposteria(
        input as Parameters<typeof calcularMamposteria>[0]
      );
    case 'buscar_precio':
      return buscarPrecio(input as Parameters<typeof buscarPrecio>[0]);
    case 'calcular_mano_obra':
      return calcularManoObra(input as Parameters<typeof calcularManoObra>[0]);
    case 'aplicar_desperdicio':
      return aplicarDesperdicio(
        input as Parameters<typeof aplicarDesperdicio>[0]
      );
    case 'calcular_cronograma':
      return calcularCronograma(input as Parameters<typeof calcularCronograma>[0]);
    case 'calcular_curva_inversion':
      return calcularCurvaInversion(
        input as Parameters<typeof calcularCurvaInversion>[0]
      );
    default:
      return { error: `Tool no encontrada: ${nombre}` };
  }
}

function extraerHtml(texto: string): string {
  const match = texto.match(/```html\n([\s\S]*?)\n```/);
  return match ? match[1] : texto;
}

/**
 * Path de streaming: arma un ReadableStream que va emitiendo el texto crudo del
 * modelo (deltas de tipo `text_delta`) tal cual llega. Al final del stream emite
 * una línea de metadata con un sentinel (`__META__{...}`) para que el cliente
 * pueda recuperar tokens/usage sin parsear todo el cuerpo. El cliente es quien
 * recorta el bloque ```html``` del texto acumulado.
 *
 * Headers anti-buffering: `no-cache` + `X-Accel-Buffering: no` para que proxies
 * (nginx/Vercel) no retengan los chunks.
 */
function streamGeneracion(
  brief: ReturnType<typeof construirBrief>,
  messages: import('@anthropic-ai/sdk').default.MessageParam[],
  body: GenerationRequest
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let outputTokens = 0;
      let inputTokens = 0;
      try {
        const sdkStream = streamMessage({
          model: MODELS.flagship,
          max_tokens: 16000,
          system: brief.system,
          messages,
          tools: allTools(),
        });

        for await (const event of sdkStream as AsyncIterable<any>) {
          if (
            event.type === 'content_block_delta' &&
            event.delta?.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          } else if (event.type === 'message_delta' && event.usage) {
            // El usage final llega en el evento message_delta.
            outputTokens = event.usage.output_tokens ?? outputTokens;
          } else if (event.type === 'message_start' && event.message?.usage) {
            inputTokens = event.message.usage.input_tokens ?? inputTokens;
          }
        }

        // Línea final con metadata. El sentinel va precedido de un \n para que el
        // cliente lo aísle fácilmente del HTML acumulado.
        const meta = JSON.stringify({
          proyecto: body.proyecto.nombre,
          timestamp: new Date().toISOString(),
          tools_invocadas: [],
          iteraciones: 1,
          tokens: {
            input: inputTokens,
            output: outputTokens,
            cache_read: 0,
            cache_creation: 0,
          },
        });
        controller.enqueue(encoder.encode(`\n__META__${meta}`));
        controller.close();
      } catch (err) {
        console.error('[/api/generate?stream=1] Error:', err);
        // Si ya empezamos a streamear no podemos cambiar el status; emitimos un
        // sentinel de error para que el cliente lo detecte.
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        controller.enqueue(encoder.encode(`\n__ERROR__${msg}`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerationRequest;

    if (!body.proyecto || !body.branding) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: proyecto, branding' },
        { status: 400 }
      );
    }

    const brief = construirBrief(body);

    const messages: import('@anthropic-ai/sdk').default.MessageParam[] = [
      { role: 'user', content: brief.userMessage },
    ];

    // Modo streaming (?stream=1): devolvemos el texto del modelo a medida que llega
    // para mejorar la latencia percibida. El cliente acumula el HTML y lo muestra en
    // vivo. Asumimos el caso one-shot de puro texto; si el modelo decidiera invocar
    // tools, el path no-stream (sin ?stream=1) lo cubre.
    if (req.nextUrl.searchParams.get('stream') === '1') {
      return streamGeneracion(brief, messages, body);
    }

    let html = '';
    const toolsInvocadas: string[] = [];
    let iteraciones = 0;
    // One-shot esperado; el loop sólo cubre el fallback de que el modelo invoque tools.
    const MAX_ITERACIONES = 4;
    let cacheRead = 0;
    let cacheCreation = 0;
    let inputTokens = 0;
    let outputTokens = 0;

    while (iteraciones < MAX_ITERACIONES) {
      iteraciones++;

      const response = await createMessage({
        model: MODELS.flagship,
        max_tokens: 16000,
        system: brief.system,
        messages,
        tools: allTools(),
      });

      const usage = (response as any).usage ?? {};
      cacheRead += usage.cache_read_input_tokens ?? 0;
      cacheCreation += usage.cache_creation_input_tokens ?? 0;
      inputTokens += usage.input_tokens ?? 0;
      outputTokens += usage.output_tokens ?? 0;

      const assistantContent = (response as any).content as any[];
      messages.push({ role: 'assistant', content: assistantContent as any });

      const toolUseBlocks = assistantContent.filter(
        (b: any) => b.type === 'tool_use'
      );

      if (toolUseBlocks.length === 0) {
        const fullText = assistantContent
          .filter((b: any) => b.type === 'text')
          .map((b: any) => b.text)
          .join('\n\n');
        html = extraerHtml(fullText);
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

    if (!html) {
      return NextResponse.json(
        { error: 'M3 no devolvió HTML después de las iteraciones' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      html,
      metadata: {
        proyecto: body.proyecto.nombre,
        timestamp: new Date().toISOString(),
        tools_invocadas: [...new Set(toolsInvocadas)],
        iteraciones,
        tokens: {
          input: inputTokens,
          output: outputTokens,
          cache_read: cacheRead,
          cache_creation: cacheCreation,
        },
      },
    });
  } catch (err) {
    console.error('[/api/generate] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}
