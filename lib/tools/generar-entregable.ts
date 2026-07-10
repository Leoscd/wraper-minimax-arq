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
 * Los cuatro tipos están implementados con su template propio (presupuesto,
 * cronograma-gantt, curva-inversion, documento-simple). El input de
 * 'presupuesto' se valida antes de renderizar: si falta estructura se
 * devuelve un `EntregableError` con el detalle para que el modelo corrija
 * y reintente, en vez de un throw opaco.
 */

import type Anthropic from '@anthropic-ai/sdk';
import type { Tool } from './types';
import { renderPresupuestoTecnico } from '../templates/presupuesto-tecnico';
import { renderCronogramaGantt } from '../templates/cronograma-gantt';
import { renderCurvaInversion } from '../templates/curva-inversion';
import { renderDocumentoSimple } from '../templates/documento-simple';
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

/**
 * Error estructurado cuando el input no tiene la forma que el template
 * necesita: en vez de tirar ("error interno" opaco), le decimos al modelo
 * exactamente qué falta para que corrija y reintente en la próxima iteración.
 */
export interface EntregableError {
  error: 'entregable_input_invalido';
  mensaje: string;
}

const ESTRUCTURA_RUBROS =
  '{ "rubros": [{ "numero": "01", "nombre": "...", "cantidad": n, ' +
  '"precio_unitario_mat": n, "precio_unitario_mo": n, "materiales": n, ' +
  '"mano_de_obra": n, "total": n, "incidencia": "%", "unidad"?: "m²" }], ' +
  '"totales": { "materiales": n, "mano_de_obra": n, "total_obra": n, "costo_m2"?: n } }';

/**
 * Coerción liberal a número: acepta number finito o string numérico
 * ("500000") — MiniMax suele mandar los montos como strings. Devuelve null
 * si no es convertible.
 */
function aNumero(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/**
 * Repara las variantes de forma que el modelo manda en la práctica antes de
 * validar (ser liberales en lo que aceptamos):
 * - `totales` al nivel raíz del input en vez de adentro de `rubros`
 *   (MiniMax aplana el anidamiento sistemáticamente).
 * - `rubros` directamente como array en vez de `{ rubros: [...] }`.
 */
function repararShapePresupuesto(
  input: EntregablePresupuestoInput
): EntregablePresupuestoInput {
  const crudo = input.rubros as unknown;
  const rubrosObj: Record<string, unknown> = Array.isArray(crudo)
    ? { rubros: crudo }
    : { ...((crudo as Record<string, unknown>) ?? {}) };
  const totalesRaiz = (input as unknown as Record<string, unknown>).totales;
  if (rubrosObj.totales == null && totalesRaiz != null) {
    rubrosObj.totales = totalesRaiz;
  }
  return { ...input, rubros: rubrosObj as unknown as RubrosInput };
}

/** Valida lo que el template de presupuesto realmente dereferencia. */
function validarPresupuesto(input: EntregablePresupuestoInput): string[] {
  const problemas: string[] = [];
  const p = input.proyecto as Partial<ProyectoInput> | undefined;
  if (!p || typeof p !== 'object') {
    problemas.push('falta "proyecto" (objeto)');
  } else {
    for (const campo of ['nombre', 'arquitecto', 'ubicacion'] as const) {
      if (typeof p[campo] !== 'string' || !p[campo]) {
        problemas.push(`falta proyecto.${campo} (string)`);
      }
    }
  }
  if (typeof input.numero_presupuesto !== 'string' || !input.numero_presupuesto) {
    problemas.push('falta numero_presupuesto (string, ej. "PRES-001")');
  }
  if (typeof input.fecha !== 'string' || !input.fecha) {
    problemas.push('falta fecha (string)');
  }

  const r = input.rubros as Partial<RubrosInput> | undefined;
  if (!r || typeof r !== 'object' || !Array.isArray(r.rubros) || r.rubros.length === 0) {
    problemas.push('rubros.rubros debe ser un array no vacío');
  } else {
    r.rubros.forEach((item, i) => {
      if (item.numero == null || item.nombre == null) {
        problemas.push(`rubros.rubros[${i}] necesita numero y nombre`);
      }
      for (const campo of ['cantidad', 'precio_unitario_mat', 'precio_unitario_mo', 'total'] as const) {
        if (aNumero(item[campo]) === null) {
          problemas.push(`rubros.rubros[${i}].${campo} debe ser numérico`);
        }
      }
    });
  }
  const t = r?.totales;
  if (!t || typeof t !== 'object') {
    problemas.push('falta rubros.totales (objeto)');
  } else {
    for (const campo of ['materiales', 'mano_de_obra', 'total_obra'] as const) {
      if (aNumero(t[campo]) === null) {
        problemas.push(`rubros.totales.${campo} debe ser numérico`);
      }
    }
  }
  return problemas;
}

/**
 * Normaliza el input validado a la forma exacta del template: numero puede
 * llegar como number (String()), y los campos que el template no usa en las
 * filas (materiales, mano_de_obra, incidencia) se completan con defaults.
 */
function normalizarRubros(r: RubrosInput): RubrosInput {
  return {
    rubros: r.rubros.map((item) => ({
      ...item,
      numero: String(item.numero),
      nombre: String(item.nombre),
      unidad: item.unidad != null ? String(item.unidad) : undefined,
      cantidad: aNumero(item.cantidad)!,
      precio_unitario_mat: aNumero(item.precio_unitario_mat)!,
      precio_unitario_mo: aNumero(item.precio_unitario_mo)!,
      total: aNumero(item.total)!,
      materiales: aNumero(item.materiales) ?? 0,
      mano_de_obra: aNumero(item.mano_de_obra) ?? 0,
      incidencia: item.incidencia != null ? String(item.incidencia) : '',
    })),
    totales: {
      materiales: aNumero(r.totales.materiales)!,
      mano_de_obra: aNumero(r.totales.mano_de_obra)!,
      total_obra: aNumero(r.totales.total_obra)!,
      ...(aNumero(r.totales.costo_m2) !== null
        ? { costo_m2: aNumero(r.totales.costo_m2)! }
        : {}),
    },
    nota: r.nota,
  };
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

function calcular(
  input: GenerarEntregableInput
): GenerarEntregableOutput | EntregableError {
  if (input.tipo === 'presupuesto') {
    input = repararShapePresupuesto(input);
    const problemas = validarPresupuesto(input);
    if (problemas.length > 0) {
      return {
        error: 'entregable_input_invalido',
        mensaje:
          `No se generó el presupuesto: ${problemas.join('; ')}. ` +
          `Estructura esperada de rubros: ${ESTRUCTURA_RUBROS}. ` +
          'Corregí el input con esos campos y volvé a invocar generar_entregable.',
      };
    }
    // Defaults para campos que el template referencia pero no son esenciales
    // (el tipo los declara obligatorios; en runtime el modelo puede omitirlos).
    const proyecto: ProyectoInput = {
      ...input.proyecto,
      descripcion: input.proyecto.descripcion ?? '',
      email: input.proyecto.email ?? '',
    };
    const rubros = normalizarRubros(input.rubros);
    const html = renderPresupuestoTecnico({
      proyecto,
      rubros,
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
      message: `Presupuesto "${input.proyecto.nombre}" generado (${rubros.rubros.length} rubros, total ${rubros.totales.total_obra}).`,
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

  // 'documento' → cualitativo (Paso D done)
  const d = input as unknown as Parameters<typeof renderDocumentoSimple>[0];
  const html = renderDocumentoSimple(d);
  const id = generarId();
  const filename = nombreArchivo('documento', { nombre: d.proyecto.nombre });
  const out: GenerarEntregableOutput = {
    id,
    tipo: 'documento',
    filename,
    html,
    message: `Documento "${d.titulo}" generado.`,
    url: `/preview/${id}`,
  };
  memoEntregables.set(id, out);
  return out;
}

const schema: Anthropic.Tool = {
  name: 'generar_entregable',
  description:
    'Genera un entregable HTML (presupuesto, cronograma, curva de inversión, o documento cualitativo) a partir de los datos del proyecto. Devuelve un id y url (/preview/[id]) que la UI usa para abrir el HTML. Los números del entregable deben venir de las otras tools (calcular_*, buscar_precio); esta tool solo maqueta. Si el input está incompleto devuelve error "entregable_input_invalido" detallando qué corregir: corregilo y reintentá.',
  input_schema: {
    type: 'object',
    properties: {
      tipo: {
        type: 'string',
        enum: ['presupuesto', 'cronograma', 'curva', 'documento'],
        description: 'Tipo de entregable a generar.',
      },
      proyecto: {
        type: 'object',
        description:
          'Datos del proyecto. Para "presupuesto" son obligatorios nombre, arquitecto y ubicacion.',
        properties: {
          nombre: { type: 'string', description: 'Nombre del proyecto/obra.' },
          arquitecto: { type: 'string', description: 'Nombre del arquitecto o profesional.' },
          ubicacion: { type: 'string', description: 'Ciudad/provincia de la obra.' },
          año: { type: 'string' },
          sistema: { type: 'string', description: 'Sistema constructivo. Ej: "Obra nueva".' },
          superficie_total: { type: 'string', description: 'Ej: "120 m²".' },
          email: { type: 'string' },
          web: { type: 'string' },
        },
        required: ['nombre'],
      },
      numero_presupuesto: {
        type: 'string',
        description: 'Solo tipo "presupuesto". Ej: "PRES-2026-001".',
      },
      fecha: {
        type: 'string',
        description: 'Solo tipo "presupuesto". Fecha del documento. Ej: "10/07/2026".',
      },
      cliente: { type: 'string', description: 'Solo tipo "presupuesto". Opcional.' },
      notas_tecnicas: {
        type: 'array',
        items: { type: 'string' },
        description: 'Solo tipo "presupuesto". Opcional.',
      },
      rubros: {
        type: 'object',
        description:
          'Solo tipo "presupuesto". Los montos salen de las tools de cálculo previas, NUNCA inventados.',
        properties: {
          rubros: {
            type: 'array',
            description: 'Un item por rubro. "numero" con formato "01", "01.1" agrupa por prefijo.',
            items: {
              type: 'object',
              properties: {
                numero: { type: 'string', description: 'Ej: "01", "02.1".' },
                nombre: { type: 'string', description: 'Ej: "Hormigón H-21 en losa".' },
                cantidad: { type: 'number' },
                unidad: { type: 'string', description: 'Ej: "m³", "m²", "gl".' },
                precio_unitario_mat: { type: 'number', description: 'ARS por unidad, materiales.' },
                precio_unitario_mo: { type: 'number', description: 'ARS por unidad, mano de obra.' },
                materiales: { type: 'number', description: 'Subtotal materiales del rubro (ARS).' },
                mano_de_obra: { type: 'number', description: 'Subtotal mano de obra del rubro (ARS).' },
                total: { type: 'number', description: 'Total del rubro (ARS).' },
                incidencia: { type: 'string', description: 'Porcentaje sobre el total. Ej: "35%".' },
              },
              required: [
                'numero',
                'nombre',
                'cantidad',
                'precio_unitario_mat',
                'precio_unitario_mo',
                'total',
              ],
            },
          },
          totales: {
            type: 'object',
            properties: {
              materiales: { type: 'number', description: 'Total materiales de la obra (ARS).' },
              mano_de_obra: { type: 'number', description: 'Total mano de obra de la obra (ARS).' },
              total_obra: { type: 'number', description: 'Total general (ARS).' },
              costo_m2: { type: 'number', description: 'Opcional. ARS por m².' },
            },
            required: ['materiales', 'mano_de_obra', 'total_obra'],
          },
          nota: { type: 'string' },
        },
        required: ['rubros', 'totales'],
      },
      cronograma: {
        type: 'object',
        description:
          'Solo tipo "cronograma". Pasar tal cual el campo "cronograma" de la salida de calcular_cronograma.',
      },
      curva: {
        type: 'object',
        description:
          'Tipos "curva" (obligatorio) y "cronograma" (opcional). Pasar tal cual la salida de calcular_curva_inversion.',
      },
      titulo: { type: 'string', description: 'Solo tipo "documento".' },
      contenido_md: {
        type: 'string',
        description: 'Solo tipo "documento". Contenido en markdown, sin números inventados.',
      },
    },
    required: ['tipo', 'proyecto'],
  },
};

export const generarEntregableTool: Tool<
  GenerarEntregableInput,
  GenerarEntregableOutput | EntregableError
> = {
  name: schema.name!,
  description: schema.description!,
  schema,
  execute: calcular,
};

export { calcular as generarEntregable };
