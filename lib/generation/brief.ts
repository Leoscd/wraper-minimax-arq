/**
 * Armado del "brief" para la generación one-shot.
 *
 * Separa lo ESTÁTICO (metodología + design tokens + ejemplo few-shot) — que se
 * marca como cacheable para abaratar y acelerar el arranque entre llamadas — de
 * lo DINÁMICO (datos del proyecto + presupuesto ya calculado), que va en el
 * mensaje de usuario.
 */

import type Anthropic from '@anthropic-ai/sdk';
import { staticBlock } from '../minimax';
import {
  METODOLOGIA_PRESENTADOR,
  DESIGN_TOKENS_DARKGOLD,
  EJEMPLO_HTML,
} from '../skills/presentador';
import { resumenPresupuesto } from './presupuesto';
import type { GenerationRequest } from '../types';

export interface Brief {
  system: Anthropic.TextBlockParam[];
  userMessage: string;
}

/** Bloques de system estáticos y cacheables (no dependen del proyecto). */
function systemBlocks(): Anthropic.TextBlockParam[] {
  return [
    staticBlock(METODOLOGIA_PRESENTADOR),
    staticBlock(DESIGN_TOKENS_DARKGOLD),
    staticBlock(
      `## Ejemplo de referencia (calidad y estructura esperadas)

A continuación, un HTML "Dark Gold" de ejemplo. NO lo copies literal: usalo como referencia de nivel, estructura y lenguaje visual. Adaptá todo al proyecto real del brief.

\`\`\`html
${EJEMPLO_HTML}
\`\`\``
    ),
  ];
}

/** Mensaje de usuario con los datos concretos del proyecto + presupuesto. */
function userMessage(req: GenerationRequest): string {
  const { proyecto, archivos, branding, opciones } = req;

  let msg = `# Proyecto a presentar

**Nombre**: ${proyecto.nombre}
**Subtítulo**: ${proyecto.subtitulo ?? '(no especificado)'}
**Tagline**: ${proyecto.tagline ?? '(no especificado)'}
**Descripción**: ${proyecto.descripcion}
**Arquitecto**: ${proyecto.arquitecto}
**Estudio**: ${proyecto.estudio ?? branding.empresa_nombre}
**Ubicación**: ${proyecto.ubicacion}
**Año**: ${proyecto.año}
**Estado**: ${proyecto.estado ?? '(no especificado)'}
**Sistema constructivo**: ${proyecto.sistema ?? 'No especificado'}
**Superficies**: total ${proyecto.superficie_total ?? '-'} · cubierta ${proyecto.superficie_cubierta ?? '-'} · descubierta ${proyecto.superficie_descubierta ?? '-'} · unidades ${proyecto.unidades ?? '-'}
**Email**: ${proyecto.email}
**Teléfono**: ${proyecto.telefono ?? '(no especificado)'}
**Dirección**: ${proyecto.direccion ?? '(no especificada)'}
**Web**: ${proyecto.web ?? 'No especificada'}
**Redes**: Instagram ${proyecto.instagram ?? '-'} · LinkedIn ${proyecto.linkedin ?? '-'} · Twitter ${proyecto.twitter ?? '-'} · Facebook ${proyecto.facebook ?? '-'}

## Branding
- **Empresa**: ${branding.empresa_nombre}
- **Color primario**: ${branding.color_primario ?? '#C9A84C (Dark Gold default)'}
- **Colores custom**: secundario ${branding.color_secundario ?? '-'} · acento ${branding.color_acento ?? '-'} · fondo ${branding.color_fondo ?? '-'} · texto ${branding.color_texto ?? '-'}
- **Estilo**: ${branding.estilo ?? 'premium'}
- **Logo**: ${branding.logo_url ? branding.logo_url : 'no cargado'}

## Archivos
- **Video hero**: ${archivos?.video_hero ? archivos.video_hero : 'no'}
- **Imagen principal**: ${archivos?.imagen_principal ? archivos.imagen_principal : 'no'}
- **Galería**: ${archivos?.galeria?.length ?? 0} imágenes`;

  if (archivos?.galeria && archivos.galeria.length > 0) {
    msg += '\n';
    archivos.galeria.forEach((img) => {
      msg += `\n- ${img.nombre}: ${img.url}`;
    });
  }

  const presupuesto = resumenPresupuesto(req.rubros);
  if (presupuesto) {
    msg += `\n\n${presupuesto}`;
  } else {
    msg += `\n\n_(El proyecto no incluye presupuesto: generá una presentación editorial SIN sección de presupuesto. No inventes números.)_`;
  }

  if (opciones?.incluir_honorarios && typeof opciones.honorarios === 'number') {
    msg += `\n\n**Honorarios profesionales** (ítem separado): ${opciones.honorarios}`;
  }

  msg += `\n\n## Tarea

Generá AHORA la presentación HTML premium "Dark Gold" de este proyecto, en una sola respuesta.
- Devolvé el HTML completo dentro de un único bloque \`\`\`html ... \`\`\`. Nada de texto antes o después.
- Si hay colores custom en el branding, usalos; si no, aplicá los design tokens Dark Gold.
- Respetá EXACTAMENTE los números del presupuesto provisto (no recalcules).`;

  return msg;
}

export function construirBrief(req: GenerationRequest): Brief {
  return {
    system: systemBlocks(),
    userMessage: userMessage(req),
  };
}
