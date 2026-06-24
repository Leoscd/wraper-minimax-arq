/**
 * Tool: calcular_hierro_longitudinal
 *
 * Calcula la cantidad de barras longitudinales de hierro necesarias
 * para un elemento estructural, considerando:
 *   - Cantidad de barras por sección
 *   - Longitud del elemento
 *   - Longitud comercial (12m para Ø8+; 6m para estribos Ø6)
 *   - Empalmes si el elemento > longitud comercial (long = 40 × diámetro)
 *   - Factor de desperdicio (1.08 = 8% para acero)
 *
 * Devuelve también el peso total en kg (para cálculo de mano de obra).
 */

import type Anthropic from '@anthropic-ai/sdk';
import type { Tool } from './types';
import type { HierroInput, HierroOutput } from './types';

const LONGITUD_COMERCIAL = 12;
const FACTOR_DESPERDICIO_ACERO = 1.08;

const PESOS_POR_METRO: Record<number, number> = {
  6: 0.222,
  8: 0.395,
  10: 0.617,
  12: 0.888,
  16: 1.578,
  20: 2.466,
  25: 3.853,
};

function pesoPorMetro(diametro_mm: number): number {
  const peso = PESOS_POR_METRO[diametro_mm];
  if (!peso) {
    throw new Error(
      `Diámetro ${diametro_mm}mm no soportado. Válidos: ${Object.keys(PESOS_POR_METRO).join(', ')}`
    );
  }
  return peso;
}

function calcular(input: HierroInput): HierroOutput {
  if (input.cantidad_barras <= 0) {
    throw new Error('cantidad_barras debe ser > 0');
  }
  if (input.longitud_elemento_m <= 0) {
    throw new Error('longitud_elemento_m debe ser > 0');
  }
  if (input.diametro_mm <= 0) {
    throw new Error('diametro_mm debe ser > 0');
  }

  const diam = input.diametro_mm;
  const longitud = input.longitud_elemento_m;
  const cantPorSeccion = input.cantidad_barras;

  let empalme_m = 0;
  let longitudEfectivaPorBarra = LONGITUD_COMERCIAL;
  let barrasPorPosicion: number;
  let requiereEmpalme = false;

  if (longitud > LONGITUD_COMERCIAL) {
    requiereEmpalme = true;
    empalme_m = 40 * (diam / 1000);
    longitudEfectivaPorBarra = LONGITUD_COMERCIAL - empalme_m;
    barrasPorPosicion = Math.ceil(longitud / longitudEfectivaPorBarra);
  } else {
    barrasPorPosicion = Math.ceil(longitud / LONGITUD_COMERCIAL);
  }

  const barrasTotalesSinDesperdicio = cantPorSeccion * barrasPorPosicion;
  const barrasTotalesConDesperdicio = Math.ceil(
    barrasTotalesSinDesperdicio * FACTOR_DESPERDICIO_ACERO
  );

  const pesoUnitKg = pesoPorMetro(diam) * LONGITUD_COMERCIAL;
  const pesoTotalKg =
    Math.round(barrasTotalesConDesperdicio * pesoUnitKg * 100) / 100;

  const notas: string[] = [];
  notas.push(
    `Barras por posición: ${barrasPorPosicion} (longitud efectiva: ${longitudEfectivaPorBarra.toFixed(2)}m)`
  );
  notas.push(
    `Total sin desperdicio: ${barrasTotalesSinDesperdicio} barras`
  );
  notas.push(
    `Total con desperdicio (×${FACTOR_DESPERDICIO_ACERO}): ${barrasTotalesConDesperdicio} barras`
  );
  notas.push(
    `Peso por barra ${diam}mm × 12m: ${pesoUnitKg.toFixed(2)} kg`
  );
  notas.push(`Peso total: ${pesoTotalKg} kg (para cálculo de MO)`);
  if (requiereEmpalme) {
    notas.push(
      `⚠️ Empalme necesario: elemento > 12m. Longitud de empalme = 40 × Ø = ${empalme_m.toFixed(2)}m`
    );
  }

  return {
    diametro_mm: diam,
    longitud_elemento_m: longitud,
    cantidad_barras: cantPorSeccion,
    longitud_comercial_m: LONGITUD_COMERCIAL,
    requiere_empalme: requiereEmpalme,
    empalme_m: requiereEmpalme ? Math.round(empalme_m * 1000) / 1000 : 0,
    longitud_efectiva_por_barra_m:
      Math.round(longitudEfectivaPorBarra * 1000) / 1000,
    barras_por_posicion: barrasPorPosicion,
    barras_totales_sin_desperdicio: barrasTotalesSinDesperdicio,
    barras_totales_con_desperdicio: barrasTotalesConDesperdicio,
    factor_desperdicio: FACTOR_DESPERDICIO_ACERO,
    peso_por_barra_kg: Math.round(pesoUnitKg * 100) / 100,
    peso_total_kg: pesoTotalKg,
    notas,
  };
}

const schema: Anthropic.Tool = {
  name: 'calcular_hierro_longitudinal',
  description:
    'Calcula la cantidad de barras longitudinales de hierro necesarias para un elemento estructural (columna, viga, base, losa). Considera empalmes cuando el elemento supera la longitud comercial de 12m. Devuelve también el peso total en kg para el cálculo de mano de obra de armado.',
  input_schema: {
    type: 'object',
    properties: {
      cantidad_barras: {
        type: 'number',
        description:
          'Cantidad de barras longitudinales por sección. Ejemplo: columna 4Ø12 → 4.',
        minimum: 1,
      },
      longitud_elemento_m: {
        type: 'number',
        description: 'Longitud del elemento en metros.',
        minimum: 0.1,
      },
      diametro_mm: {
        type: 'number',
        enum: [6, 8, 10, 12, 16, 20, 25],
        description:
          'Diámetro de la barra en milímetros. Válidos: 6, 8, 10, 12, 16, 20, 25.',
      },
    },
    required: ['cantidad_barras', 'longitud_elemento_m', 'diametro_mm'],
  },
};

export const calcularHierroLongitudinalTool: Tool<HierroInput, HierroOutput> = {
  name: schema.name!,
  description: schema.description!,
  schema,
  execute: calcular,
};

export { calcular as calcularHierroLongitudinal };
