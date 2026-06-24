/**
 * Tool: calcular_mamposteria
 *
 * Calcula la cantidad de ladrillos necesarios para una mampostería,
 * considerando el tipo de ladrillo y el tipo de junta.
 *
 * Tipos soportados:
 *   - ladrillo_hueco_12: ladrillo hueco 12×18×33
 *   - ladrillo_hueco_18: ladrillo hueco 18×18×33
 *   - ladrillo_comun_15: ladrillo común pared 15cm
 *   - ladrillo_comun_30: ladrillo común pared 30cm
 *   - bloque_hormigon_20: bloque hormigón 20×20×40
 *
 * Basado en la tabla de rendimientos de SoyLeo AI skill original.
 */

import type Anthropic from '@anthropic-ai/sdk';
import type { Tool, MamposteriaInput, MamposteriaOutput } from './types';

const LADRILLOS_POR_M2: Record<string, number> = {
  ladrillo_hueco_12: 13,
  ladrillo_hueco_18: 13,
  ladrillo_comun_15: 60,
  ladrillo_comun_30: 120,
  bloque_hormigon_20: 12.5,
};

const DESPERDICIO_LADRILLOS = 1.07;

function calcular(input: MamposteriaInput): MamposteriaOutput {
  if (input.area_m2 <= 0) throw new Error('area_m2 debe ser > 0');

  const ladrillosPorM2 = LADRILLOS_POR_M2[input.tipo_ladrillo];
  if (!ladrillosPorM2) {
    throw new Error(
      `Tipo de ladrillo no soportado: ${input.tipo_ladrillo}. Válidos: ${Object.keys(LADRILLOS_POR_M2).join(', ')}`
    );
  }

  const ladrillosSinDesperdicio = input.area_m2 * ladrillosPorM2;
  const ladrillosTotales = Math.ceil(ladrillosSinDesperdicio * DESPERDICIO_LADRILLOS);

  return {
    tipo_ladrillo: input.tipo_ladrillo,
    area_m2: input.area_m2,
    ladrillos_por_m2: ladrillosPorM2,
    ladrillos_sin_desperdicio: ladrillosSinDesperdicio,
    ladrillos_totales: ladrillosTotales,
    factor_desperdicio: DESPERDICIO_LADRILLOS,
    unidad: input.tipo_ladrillo.startsWith('ladrillo_comun') ? 'unidades (pedir por millar)' : 'unidades',
  };
}

const schema: Anthropic.Tool = {
  name: 'calcular_mamposteria',
  description:
    'Calcula la cantidad de ladrillos necesarios para una mampostería. Aplica factor de desperdicio 1.07 (7%). Ladrillos comunes se piden por millar.',
  input_schema: {
    type: 'object',
    properties: {
      tipo_ladrillo: {
        type: 'string',
        enum: [
          'ladrillo_hueco_12',
          'ladrillo_hueco_18',
          'ladrillo_comun_15',
          'ladrillo_comun_30',
          'bloque_hormigon_20',
        ],
        description:
          'Tipo de ladrillo/bloque. hueco_12 y hueco_18 son ladrillos cerámicos huecos. comun_15 y comun_30 son ladrillos comunes macizos. bloque_hormigon_20 es bloque de hormigón 20×20×40.',
      },
      area_m2: {
        type: 'number',
        description: 'Área de mampostería en m².',
        minimum: 0.01,
      },
    },
    required: ['tipo_ladrillo', 'area_m2'],
  },
};

export const calcularMamposteriaTool: Tool<MamposteriaInput, MamposteriaOutput> = {
  name: schema.name!,
  description: schema.description!,
  schema,
  execute: calcular,
};

export { calcular as calcularMamposteria };
