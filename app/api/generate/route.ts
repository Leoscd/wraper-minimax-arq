/**
 * Endpoint principal: /api/generate
 *
 * Orquesta MiniMax M3 con function calling para generar la presentación.
 *
 * Flow:
 *   1. Recibe el input del usuario (proyecto, branding, archivos)
 *   2. Construye el system prompt con la metodología
 *   3. Llama a M3 con las tools disponibles
 *   4. Si M3 invoca una tool, la ejecuta y le devuelve el resultado
 *   5. Itera hasta que M3 devuelve el HTML final
 *   6. Devuelve el HTML al cliente
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createMessage,
  MODELS,
  type MessageParams,
} from '@/lib/minimax';
import { allTools, allTools as tools } from '@/lib/tools/registry';
import { SISTEMA_PRESENTADOR } from '@/lib/prompts/system';
import {
  calcularHormigon,
  calcularHierroLongitudinal,
  calcularEstribos,
  calcularMorteroRevoque,
  calcularMamposteria,
  buscarPrecio,
  calcularManoObra,
  aplicarDesperdicio,
} from '@/lib/tools';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface GenerateRequest {
  proyecto: {
    nombre: string;
    subtitulo?: string;
    descripcion: string;
    arquitecto: string;
    estudio?: string;
    ubicacion: string;
    año: string;
    sistema?: string;
    email: string;
    telefono?: string;
    web?: string;
    instagram?: string;
  };
  archivos?: {
    video_hero?: string;
    imagen_principal?: string;
    galeria?: Array<{ nombre: string; url: string }>;
  };
  branding: {
    empresa_nombre: string;
    logo_url?: string;
    color_primario?: string;
    estilo?: 'premium' | 'moderno' | 'minimalista' | 'tecnico';
  };
  opciones?: {
    modo?: 'presentacion' | 'presupuesto_tecnico';
  };
}

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
    default:
      return { error: `Tool no encontrada: ${nombre}` };
  }
}

function construirMensajeInicial(req: GenerateRequest): string {
  const { proyecto, archivos, branding } = req;

  let msg = `# Proyecto a presentar

**Nombre**: ${proyecto.nombre}
**Subtítulo**: ${proyecto.subtitulo ?? '(no especificado)'}
**Descripción**: ${proyecto.descripcion}
**Arquitecto**: ${proyecto.arquitecto}
**Estudio**: ${proyecto.estudio ?? branding.empresa_nombre}
**Ubicación**: ${proyecto.ubicacion}
**Año**: ${proyecto.año}
**Sistema constructivo**: ${proyecto.sistema ?? 'No especificado'}
**Email**: ${proyecto.email}
**Web**: ${proyecto.web ?? 'No especificada'}
**Instagram**: ${proyecto.instagram ?? 'No especificado'}

## Branding de la empresa
- **Nombre de la empresa**: ${branding.empresa_nombre}
- **Color primario**: ${branding.color_primario ?? '#C9A84C (Dark Gold default)'}
- **Estilo**: ${branding.estilo ?? 'premium'}
- **Logo**: ${branding.logo_url ? 'cargado' : 'no cargado'}

## Archivos
- **Video hero**: ${archivos?.video_hero ? 'sí' : 'no'}
- **Imagen principal**: ${archivos?.imagen_principal ? 'sí' : 'no'}
- **Galería**: ${archivos?.galeria?.length ?? 0} imágenes`;

  if (archivos?.galeria && archivos.galeria.length > 0) {
    msg += '\n\n### Imágenes de la galería\n';
    archivos.galeria.forEach((img) => {
      msg += `- ${img.nombre}: ${img.url}\n`;
    });
  }

  msg += `

## Tarea

Generá la presentación HTML premium "Dark Gold" del proyecto. Recordá:
- Usá las tools disponibles si necesitás hacer cálculos
- Si falta información esencial, preguntá al usuario
- Devolvé el HTML completo en un bloque de código markdown
- Aplicá la metodología SoyLeo AI en 5 fases
`;

  return msg;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateRequest;

    if (!body.proyecto || !body.branding) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: proyecto, branding' },
        { status: 400 }
      );
    }

    const mensajeUsuario = construirMensajeInicial(body);

    const messages: MessageParams['messages'] = [
      {
        role: 'user',
        content: mensajeUsuario,
      },
    ];

    let html = '';
    let toolsInvocadas: string[] = [];
    let iteraciones = 0;
    const MAX_ITERACIONES = 10;

    while (iteraciones < MAX_ITERACIONES) {
      iteraciones++;

      const response = await createMessage({
        model: MODELS.flagship,
        max_tokens: 16000,
        system: SISTEMA_PRESENTADOR,
        messages,
        tools: allTools(),
      });

      const assistantContent = (response as any).content as any[];

      messages.push({
        role: 'assistant',
        content: assistantContent as any,
      });

      const toolUseBlocks = assistantContent.filter(
        (b: any) => b.type === 'tool_use'
      );

      if (toolUseBlocks.length === 0) {
        const textBlocks = assistantContent.filter(
          (b: any) => b.type === 'text'
        );
        const fullText = textBlocks
          .map((b: any) => b.text)
          .join('\n\n');

        const htmlMatch = fullText.match(/```html\n([\s\S]*?)\n```/);
        if (htmlMatch) {
          html = htmlMatch[1];
        } else {
          html = fullText;
        }
        break;
      }

      const toolResults: any[] = [];
      for (const block of toolUseBlocks) {
        const toolName = block.name;
        const toolInput = block.input;
        toolsInvocadas.push(toolName);

        try {
          const result = ejecutarTool(toolName, toolInput);
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

      messages.push({
        role: 'user',
        content: toolResults as any,
      });
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
        tokens_entrada: messages.length,
      },
    });
  } catch (err) {
    console.error('[/api/generate] Error:', err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
