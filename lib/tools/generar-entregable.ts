/**
 * Tool: generar_entregable
 *
 * Genera un entregable HTML (presupuesto, cronograma, curva de inversión, o
 * documento cualitativo) a partir de los datos provistos. Es la "puerta" entre
 * el chat y la salida visual: el modelo NO escribe HTML directamente, invoca
 * esta tool con los datos correctos y la UI muestra el resultado.
 *
 * **Invariante:** todo número que aparezca en el entregable sale de una tool
 * determinística previa (precios, hormigón, hierro, MO, etc.). Esta tool solo
 * maqueta HTML a partir de datos ya calculados.
 *
 * **Estado actual (Fase 3):** 'presupuesto' está end-to-end (usa
 * `presupuesto-tecnico.ts`). 'cronograma' y 'curva' devuelven un placeholder
 * hasta que se implemente Paso B (templates cronograma-gantt y curva-inversion).
 * 'documento' para cualitativos también se sumará en Paso D.
 */

import type Anthropic from '@anthropic-ai/sdk';
import type { Tool } from './types';
import { renderPresupuestoTecnico } from '../templates/presupuesto-tecnico';
import { renderCronogramaGantt } from '../templates/cronograma-gantt';
import { renderCurvaInversion } from '../templates/curva-inversion';
import type { RubrosInput, ProyectoInput } from '../types';

export type EntregableTipo = 'presupuesto' | 'cronograma' | 'curva' | 'documento';

export interface EntregablePresupuestoInput {
  tipo: 'presupuesto';
  proyecto: ProyectoInput;
  rubros: RubrosInput;
  numero_presupuesto: string;
  fecha: string;
  cliente?: string;
  notas_tecnicas?: string[];
}

export interface EntregableCronogramaInput {
  tipo: 'cronograma';
  proyecto: Pick<ProyectoInput, 'nombre' | 'ubicacion' | 'año'>;
  /** Salida de la tool `calcular_cronograma` (cronograma.cronograma). */
  cronograma: unknown;
  /** Salida de la tool `calcular_curva_inversion` (opcional, mismo entregable). */
  curva?: unknown;
}

export interface EntregableCurvaInput {
  tipo: 'curva';
  proyecto: Pick<ProyectoInput, 'nombre' | 'ubicacion' | 'año'>;
  /** Salida de la tool `calcular_curva_inversion` (curva.periodos, etc.). */
  curva: unknown;
}

export interface EntregableDocumentoInput {
  tipo: 'documento';
  proyecto: Pick<ProyectoInput, 'nombre' | 'ubicacion' | 'año'>;
  titulo: string;
  /** Contenido en markdown que el modelo escribió. Sin números, no aplica invariante. */
  contenido_md: string;
}

export type GenerarEntregableInput =
  | EntregablePresupuestoInput
  | EntregableCronogramaInput
  | EntregableCurvaInput
  | EntregableDocumentoInput;

export interface GenerarEntregableOutput {
  id: string;
  tipo: EntregableTipo;
  filename: string;
  html: string;
  /** Mensaje que el chat muestra al usuario. */
  message: string;
  /** URL donde la UI puede abrir/previsualizar el HTML. */
  url: string;
}

function generarId(): string {
  return `ent_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function nombreArchivo(tipo: EntregableTipo, proyecto: ProyectoInput | { nombre: string }): string {
  const slug = (proyecto.nombre ?? 'proyecto')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const fecha = new Date().toISOString().slice(0, 10);
  return `${slug}-${tipo}-${fecha}.html`;
}

/** Wrapper in-memory para que el endpoint /api/chat exponga el HTML
 * generado a la UI en /preview/[id]. Se pierde al reiniciar (mismo
 * trade-off que `lib/kv.ts` para proyectos). */
const memoEntregables = new Map<string, GenerarEntregableOutput>();

/** API interna para que el server recupere el HTML por id (vía /preview/[id]). */
export function getEntregablePorId(
  id: string
): GenerarEntregableOutput | null {
  return memoEntregables.get(id) ?? null;
}

function calcular(input: GenerarEntregableInput): GenerarEntregableOutput {
  if (input.tipo === 'presupuesto') {
    const html = renderPresupuestoTecnico({
      proyecto: input.proyecto,
      rubros: input.rubros,
      numero_presupuesto: input.numero_presupuesto,
      fecha: input.fecha,
      cliente: input.cliente,
      notas_tecnicas: input.notas_tecnicas,
    });
    const id = generarId();
    const filename = nombreArchivo('presupuesto', input.proyecto);
    const out: GenerarEntregableOutput = {
      id,
      tipo: 'presupuesto',
      filename,
      html,
      message: `Presupuesto "${input.proyecto.nombre}" generado (${input.rubros.rubros.length} rubros, total ${input.rubros.totales.total_obra}).`,
      url: `/preview/${id}`,
    };
    memoEntregables.set(id, out);
    return out;
  }

  if (input.tipo === 'cronograma') {
    // Cast seguro: la tool fue llamada con el output de `calcular_cronograma`
    // (CronogramaOutput) pero el discriminated union lo trata como `unknown`.
    const c = input.cronograma as Parameters<typeof renderCronogramaGantt>[0]['cronograma'];
    const p = input.proyecto as Parameters<typeof renderCronogramaGantt>[0]['proyecto'];
    const html = renderCronogramaGantt({
      proyecto: p,
      cronograma: c,
    });
    const id = generarId();
    const filename = nombreArchivo('cronograma', { nombre: p.nombre });
    const out: GenerarEntregableOutput = {
      id,
      tipo: 'cronograma',
      filename,
      html,
      message: `Cronograma "${p.nombre}" generado (${c.duracion_total_dias} días, ${c.camino_critico.length} tareas críticas).`,
      url: `/preview/${id}`,
    };
    memoEntregables.set(id, out);
    return out;
  }

  if (input.tipo === 'curva') {
    const c = input.curva as Parameters<typeof renderCurvaInversion>[0]['curva'];
    const p = input.proyecto as Parameters<typeof renderCurvaInversion>[0]['proyecto'];
    const html = renderCurvaInversion({
      proyecto: p,
      curva: c,
    });
    const id = generarId();
    const filename = nombreArchivo('curva', { nombre: p.nombre });
    const out: GenerarEntregableOutput = {
      id,
      tipo: 'curva',
      filename,
      html,
      message: `Curva de inversión "${p.nombre}" generada (${c.periodos.length} periodos, total ${c.costo_total_obra}).`,
      url: `/preview/${id}`,
    };
    memoEntregables.set(id, out);
    return out;
  }

  // 'documento' → TODO Paso D
  return {
    id: 'pending',
    tipo: 'documento',
    filename: 'pendiente.html',
    html: '<html><body><p>Template de documento cualitativo pendiente (Paso D de Fase 3).</p></body></html>',
    message: 'Los documentos cualitativos se implementan en Paso D de Fase 3.',
    url: '/preview/pending',
  };
}

const schema: Anthropic.Tool = {
  name: 'generar_entregable',
  description:
    'Genera un entregable HTML (presupuesto, cronograma, curva de inversión, o documento cualitativo) a partir de los datos del proyecto. Devuelve un id y url (/preview/[id]) que la UI usa para abrir el HTML. Los números del entregable deben venir de las otras tools (calcular_*, buscar_precio); esta tool solo maqueta. Tipos implementados: "presupuesto". Pendientes: "cronograma", "curva" (Paso B), "documento" (Paso D).',
  input_schema: {
    type: 'object',
    oneOf: [
      {
        type: 'object',
        properties: {
          tipo: { enum: ['presupuesto'] },
          proyecto: { type: 'object', description: 'Datos del proyecto (ProyectoInput completo).' },
          rubros: { type: 'object', description: 'Salida del cómputo de presupuesto (RubrosInput).' },
          numero_presupuesto: { type: 'string' },
          fecha: { type: 'string' },
          cliente: { type: 'string' },
          notas_tecnicas: { type: 'array', items: { type: 'string' } },
        },
        required: ['tipo', 'proyecto', 'rubros', 'numero_presupuesto', 'fecha'],
      },
      {
        type: 'object',
        properties: {
          tipo: { enum: ['cronograma'] },
          proyecto: { type: 'object' },
          cronograma: { type: 'object' },
          curva: { type: 'object' },
        },
        required: ['tipo', 'proyecto', 'cronograma'],
      },
      {
        type: 'object',
        properties: {
          tipo: { enum: ['curva'] },
          proyecto: { type: 'object' },
          curva: { type: 'object' },
        },
        required: ['tipo', 'proyecto', 'curva'],
      },
      {
        type: 'object',
        properties: {
          tipo: { enum: ['documento'] },
          proyecto: { type: 'object' },
          titulo: { type: 'string' },
          contenido_md: { type: 'string' },
        },
        required: ['tipo', 'proyecto', 'titulo', 'contenido_md'],
      },
    ],
  },
};

export const generarEntregableTool: Tool<
  GenerarEntregableInput,
  GenerarEntregableOutput
> = {
  name: schema.name!,
  description: schema.description!,
  schema,
  execute: calcular,
};

export { calcular as generarEntregable };
