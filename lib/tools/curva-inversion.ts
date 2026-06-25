/**
 * Tool: calcular_curva_inversion
 *
 * Genera la curva S de inversión del proyecto: tabla por periodo (semanal
 * por defecto) con distribución de costos y avance acumulado.
 *
 * Distribución estándar (la que recomienda el cuadernillo de SoyLeo AI):
 *   - Materiales: se acopian al inicio → 100% en semana 1 si la tarea dura
 *     1 semana, sino 80% semana 1 + 20% semana 2.
 *   - Mano de obra: lineal por toda la duración de la tarea.
 *   - Equipos: lineal (alquiler diario/semanal, asume uso continuo).
 *
 * Si el usuario quiere otra distribución puede mandar
 * `distribucion_materiales='manual'` y un mapa `id_tarea → % por periodo`
 * (suma 100). En ese modo MO y equipos siguen siendo lineales.
 *
 * Referencia: SKILL.md original, sección 'FASE 4: CURVA DE INVERSIÓN'.
 */

import type Anthropic from '@anthropic-ai/sdk';
import type { Tool, CurvaInversionInput, CurvaInversionOutput, CurvaInversionPeriodo } from './types';

interface Distribucion {
  periodos: number[];
}

function distribucionEstandar(duracionPeriodos: number): Distribucion {
  if (duracionPeriodos === 1) {
    return { periodos: [1] };
  }
  const pcts: number[] = [0.8];
  const resto = 0.2 / (duracionPeriodos - 1);
  for (let i = 1; i < duracionPeriodos - 1; i++) pcts.push(0);
  pcts.push(0.2);
  let suma = pcts.reduce((a, b) => a + b, 0);
  const correccion = (1 - suma) / pcts.length;
  return { periodos: pcts.map((p) => p + correccion) };
}

function distribucionUniforme(duracionPeriodos: number): Distribucion {
  const p = 1 / duracionPeriodos;
  return { periodos: Array(duracionPeriodos).fill(p) };
}

function distribucionLineal(duracionPeriodos: number): Distribucion {
  return distribucionUniforme(duracionPeriodos);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function calcular(input: CurvaInversionInput): CurvaInversionOutput {
  if (!input.tareas || input.tareas.length === 0) {
    throw new Error('Se requiere al menos una tarea con costos.');
  }

  const granularidad: 'semanal' | 'mensual' = input.granularidad ?? 'semanal';
  const diasPorPeriodo = granularidad === 'semanal' ? 7 : 30;

  for (const t of input.tareas) {
    if (t.duracion_dias <= 0) {
      throw new Error(`La tarea "${t.id}" debe tener duracion_dias > 0.`);
    }
    if (t.inicio_dia < 1) {
      throw new Error(`La tarea "${t.id}" debe tener inicio_dia >= 1.`);
    }
    if (t.costo_materiales < 0 || t.costo_mano_obra < 0 || t.costo_equipos < 0) {
      throw new Error(`La tarea "${t.id}" tiene costos negativos.`);
    }
  }

  let diaFinProyecto = 0;
  for (const t of input.tareas) {
    const fin = t.inicio_dia + t.duracion_dias - 1;
    if (fin > diaFinProyecto) diaFinProyecto = fin;
  }
  const totalPeriodos = Math.ceil(diaFinProyecto / diasPorPeriodo);

  const periodos: CurvaInversionPeriodo[] = [];
  for (let p = 1; p <= totalPeriodos; p++) {
    periodos.push({
      periodo: p,
      inicio_dia: (p - 1) * diasPorPeriodo + 1,
      fin_dia: Math.min(p * diasPorPeriodo, diaFinProyecto),
      tareas_activas: [],
      costo_materiales: 0,
      costo_mano_obra: 0,
      costo_equipos: 0,
      costo_total: 0,
      costo_acumulado: 0,
      porcentaje_avance: 0,
    });
  }

  let totalMateriales = 0;
  let totalMO = 0;
  let totalEquipos = 0;

  for (const t of input.tareas) {
    totalMateriales += t.costo_materiales;
    totalMO += t.costo_mano_obra;
    totalEquipos += t.costo_equipos;

    const inicioPeriodo = Math.ceil(t.inicio_dia / diasPorPeriodo);
    const finPeriodo = Math.ceil((t.inicio_dia + t.duracion_dias - 1) / diasPorPeriodo);
    const numPeriodos = finPeriodo - inicioPeriodo + 1;

    let distMat: Distribucion;
    if (input.distribucion_materiales === 'manual') {
      const manual = input.distribucion_materiales_manual?.[t.id];
      if (!manual || manual.length !== numPeriodos) {
        throw new Error(
          `distribucion_materiales_manual["${t.id}"] debe tener ${numPeriodos} valores (uno por periodo).`
        );
      }
      const suma = manual.reduce((a, b) => a + b, 0);
      if (Math.abs(suma - 100) > 0.01) {
        throw new Error(
          `distribucion_materiales_manual["${t.id}"] suma ${suma}, debe sumar 100.`
        );
      }
      distMat = { periodos: manual.map((p) => p / 100) };
    } else if (input.distribucion_materiales === 'uniforme') {
      distMat = distribucionUniforme(numPeriodos);
    } else {
      distMat = distribucionEstandar(numPeriodos);
    }

    const distMO = distribucionLineal(numPeriodos);
    const distEq = distribucionLineal(numPeriodos);

    for (let i = 0; i < numPeriodos; i++) {
      const periodoIdx = inicioPeriodo - 1 + i;
      const periodo = periodos[periodoIdx];
      periodo.tareas_activas.push(t.id);
      periodo.costo_materiales += t.costo_materiales * distMat.periodos[i];
      periodo.costo_mano_obra += t.costo_mano_obra * distMO.periodos[i];
      periodo.costo_equipos += t.costo_equipos * distEq.periodos[i];
    }
  }

  const totalObra = totalMateriales + totalMO + totalEquipos;
  let acumulado = 0;
  for (const p of periodos) {
    p.costo_materiales = round2(p.costo_materiales);
    p.costo_mano_obra = round2(p.costo_mano_obra);
    p.costo_equipos = round2(p.costo_equipos);
    p.costo_total = round2(
      p.costo_materiales + p.costo_mano_obra + p.costo_equipos
    );
    acumulado += p.costo_total;
    p.costo_acumulado = round2(acumulado);
    p.porcentaje_avance =
      totalObra > 0 ? Math.round((p.costo_acumulado / totalObra) * 1000) / 10 : 0;
  }

  return {
    granularidad,
    duracion_total_dias: diaFinProyecto,
    costo_total_materiales: round2(totalMateriales),
    costo_total_mano_obra: round2(totalMO),
    costo_total_equipos: round2(totalEquipos),
    costo_total_obra: round2(totalObra),
    periodos,
  };
}

const schema: Anthropic.Tool = {
  name: 'calcular_curva_inversion',
  description:
    'Calcula la curva S de inversión del proyecto: tabla por periodo (semanal o mensual) con materiales, mano de obra, equipos y acumulado. Distribución estándar: materiales al inicio (80% semana 1, 20% semana 2), MO y equipos lineales. Se puede customizar la distribución de materiales con distribucion_materiales="manual".',
  input_schema: {
    type: 'object',
    properties: {
      tareas: {
        type: 'array',
        description: 'Tareas con sus costos e inicio.',
        minItems: 1,
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID único de la tarea.' },
            nombre: { type: 'string', description: 'Nombre legible.' },
            duracion_dias: { type: 'number', minimum: 1 },
            inicio_dia: {
              type: 'number',
              description: 'Día de inicio (1-indexado).',
              minimum: 1,
            },
            costo_materiales: {
              type: 'number',
              description: 'Costo total de materiales en ARS (moneda local).',
              minimum: 0,
            },
            costo_mano_obra: {
              type: 'number',
              description: 'Costo total de mano de obra en ARS.',
              minimum: 0,
            },
            costo_equipos: {
              type: 'number',
              description: 'Costo de equipos/alquileres en ARS.',
              minimum: 0,
            },
          },
          required: [
            'id',
            'nombre',
            'duracion_dias',
            'inicio_dia',
            'costo_materiales',
            'costo_mano_obra',
            'costo_equipos',
          ],
        },
      },
      granularidad: {
        type: 'string',
        enum: ['semanal', 'mensual'],
        description: 'Granularidad de la tabla. Default: semanal.',
        default: 'semanal',
      },
      distribucion_materiales: {
        type: 'string',
        enum: ['estandar', 'uniforme', 'manual'],
        description: 'Cómo distribuir los materiales en los periodos.',
        default: 'estandar',
      },
      distribucion_materiales_manual: {
        type: 'object',
        description:
          'Si distribucion_materiales="manual", mapa id_tarea → array de % por periodo (suma 100).',
        additionalProperties: {
          type: 'array',
          items: { type: 'number' },
        },
      },
    },
    required: ['tareas'],
  },
};

export const calcularCurvaInversionTool: Tool<CurvaInversionInput, CurvaInversionOutput> = {
  name: schema.name!,
  description: schema.description!,
  schema,
  execute: calcular,
};

export { calcular as calcularCurvaInversion };
