/**
 * Tool: calcular_estribos
 *
 * Calcula la cantidad de estribos necesarios para un elemento
 * estructural (columna, viga), usando la fórmula CIRSOC corregida:
 *   - Cantidad = (altura / separación) + 1
 *   - Dimensiones INTERIORES descontando recubrimiento
 *   - Perímetro = 2*base_int + 2*altura_int + 2*ganchos
 *   - Ganchos CIRSOC: 10 × diámetro del estribo
 *
 * Devuelve también el peso en kg (para cálculo de MO).
 */

import type Anthropic from '@anthropic-ai/sdk';
import type { Tool, EstribosInput, EstribosOutput } from './types';

const LONGITUD_BARRA_ESTRIBOS = 6;
const FACTOR_DESPERDICIO_ACERO = 1.08;

const PESOS_POR_METRO: Record<number, number> = {
  6: 0.222,
  8: 0.395,
};

function pesoPorMetro(diametro_mm: number): number {
  const peso = PESOS_POR_METRO[diametro_mm];
  if (!peso) {
    throw new Error(`Estribo solo acepta Ø6 u Ø8. Recibido: ${diametro_mm}`);
  }
  return peso;
}

function calcular(input: EstribosInput): EstribosOutput {
  if (input.longitud_elemento_m <= 0) {
    throw new Error('longitud_elemento_m debe ser > 0');
  }
  if (input.seccion_base_m <= 0) {
    throw new Error('seccion_base_m debe ser > 0');
  }
  if (input.seccion_altura_m <= 0) {
    throw new Error('seccion_altura_m debe ser > 0');
  }
  if (input.separacion_m <= 0) throw new Error('separacion_m debe ser > 0');
  if (input.recubrimiento_m < 0) {
    throw new Error('recubrimiento_m debe ser >= 0');
  }
  if (input.diametro_estribo_mm !== 6 && input.diametro_estribo_mm !== 8) {
    throw new Error('diametro_estribo_mm debe ser 6 u 8');
  }

  const cantidadEstribos =
    Math.floor(input.longitud_elemento_m / input.separacion_m) + 1;

  const baseInt = input.seccion_base_m - 2 * input.recubrimiento_m;
  const alturaInt = input.seccion_altura_m - 2 * input.recubrimiento_m;

  if (baseInt <= 0 || alturaInt <= 0) {
    throw new Error(
      `Dimensiones interiores inválidas. Verificar que el recubrimiento (${input.recubrimiento_m}m) sea menor que la mitad de las dimensiones de la sección.`
    );
  }

  const ganchosPorEstribo = (2 * (10 * input.diametro_estribo_mm)) / 1000;

  const perimetroPorEstribo =
    2 * baseInt + 2 * alturaInt + ganchosPorEstribo;

  const longitudTotalMl = cantidadEstribos * perimetroPorEstribo;

  const barrasSinDesperdicio = Math.ceil(
    longitudTotalMl / LONGITUD_BARRA_ESTRIBOS
  );
  const barrasConDesperdicio = Math.ceil(
    barrasSinDesperdicio * FACTOR_DESPERDICIO_ACERO
  );

  const pesoPorBarra =
    pesoPorMetro(input.diametro_estribo_mm) * LONGITUD_BARRA_ESTRIBOS;
  const pesoTotalKg =
    Math.round(barrasConDesperdicio * pesoPorBarra * 100) / 100;

  const notas: string[] = [];
  notas.push(
    `Cantidad de estribos: (${input.longitud_elemento_m}m / ${input.separacion_m}m) + 1 = ${cantidadEstribos}`
  );
  notas.push(
    `Sección ${(input.seccion_base_m * 100).toFixed(0)}×${(input.seccion_altura_m * 100).toFixed(0)}cm, dimensiones interiores (rec ${(input.recubrimiento_m * 100).toFixed(1)}cm): ${(baseInt * 100).toFixed(1)}×${(alturaInt * 100).toFixed(1)}cm`
  );
  notas.push(
    `Ganchos CIRSOC: 2 × (10 × ${input.diametro_estribo_mm}mm) = ${(ganchosPorEstribo * 100).toFixed(1)}cm`
  );
  notas.push(
    `Perímetro por estribo: ${(perimetroPorEstribo * 100).toFixed(2)}cm = ${perimetroPorEstribo.toFixed(3)}m`
  );
  notas.push(
    `Longitud total: ${cantidadEstribos} × ${perimetroPorEstribo.toFixed(3)}m = ${longitudTotalMl.toFixed(2)} ml`
  );
  notas.push(
    `Barras necesarias: ${longitudTotalMl.toFixed(2)}m / ${LONGITUD_BARRA_ESTRIBOS}m = ${barrasSinDesperdicio} → ${barrasConDesperdicio} con desperdicio`
  );
  notas.push(`Peso total: ${pesoTotalKg} kg (para MO)`);

  return {
    cantidad_estribos: cantidadEstribos,
    perimetro_por_estribo_m: Math.round(perimetroPorEstribo * 1000) / 1000,
    longitud_total_ml: Math.round(longitudTotalMl * 100) / 100,
    barras_6m_necesarias: barrasSinDesperdicio,
    barras_con_desperdicio: barrasConDesperdicio,
    factor_desperdicio: FACTOR_DESPERDICIO_ACERO,
    peso_total_kg: pesoTotalKg,
    ganchos_por_estribo_m: Math.round(ganchosPorEstribo * 1000) / 1000,
    notas,
  };
}

const schema: Anthropic.Tool = {
  name: 'calcular_estribos',
  description:
    'Calcula la cantidad de estribos necesarios para un elemento estructural (columna, viga, base). Usa la fórmula CIRSOC corregida: descuenta el recubrimiento de las dimensiones interiores, incluye ganchos (10 × diámetro), y calcula el peso en kg para mano de obra. Barras de estribos son de 6m.',
  input_schema: {
    type: 'object',
    properties: {
      longitud_elemento_m: {
        type: 'number',
        description:
          'Longitud total del elemento (altura de columna, largo de viga) en metros. Usado para calcular la cantidad de estribos.',
        minimum: 0.1,
      },
      seccion_base_m: {
        type: 'number',
        description:
          'Base de la sección transversal del elemento en metros. Ej: columna 20×20 → 0.20.',
        minimum: 0.05,
      },
      seccion_altura_m: {
        type: 'number',
        description:
          'Altura (profundidad) de la sección transversal en metros. Ej: viga 30×40 → 0.40.',
        minimum: 0.05,
      },
      diametro_estribo_mm: {
        type: 'number',
        enum: [6, 8],
        description:
          'Diámetro del estribo en mm. Típicamente 6 (vivienda) u 8 (cargas pesadas).',
      },
      separacion_m: {
        type: 'number',
        description:
          'Separación entre estribos en metros. Ej: c/15cm = 0.15, c/20cm = 0.20.',
        minimum: 0.05,
        maximum: 0.5,
      },
      recubrimiento_m: {
        type: 'number',
        description:
          'Recubrimiento de hormigón en metros. Default: 0.025 (2.5cm) para columnas/vigas interiores. 0.03 para exteriores. 0.05 para fundaciones.',
        default: 0.025,
        minimum: 0.01,
        maximum: 0.1,
      },
    },
    required: [
      'longitud_elemento_m',
      'seccion_base_m',
      'seccion_altura_m',
      'diametro_estribo_mm',
      'separacion_m',
    ],
  },
};

export const calcularEstribosTool: Tool<EstribosInput, EstribosOutput> = {
  name: schema.name,
  description: schema.description,
  schema,
  execute: calcular,
};

export { calcular as calcularEstribos };
