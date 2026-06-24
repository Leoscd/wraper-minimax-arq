/**
 * Tool: calcular_hormigon
 *
 * Calcula los materiales necesarios (cemento, arena, ripio, agua)
 * para un volumen dado de hormigón armado, considerando:
 *   - Clase del hormigón (H-13, H-17, H-21, H-25, H-30)
 *   - Si es elaborado o in situ (cambia factor de desperdicio)
 *   - Si se usa bomba (suma 10% de cemento)
 *   - Humedad de los áridos (ajusta agua ±10 l/m³)
 *
 * Basado en la metodología de SoyLeo AI skill original.
 */

import type Anthropic from '@anthropic-ai/sdk';
import type { Tool, HormigonInput, HormigonOutput } from './types';
import hormigonData from '../../data/hormigon.json';

const HORMIGON_DEFAULT = 'H-21';

interface ClaseHormigon {
  clase: string;
  cemento_kg_m3: number;
  arena_gruesa_m3_m3: number;
  ripio_m3_m3: number;
  agua_litros_m3: number;
  factor_desperdicio_default: number;
  apto_bomba: boolean;
}

function findClase(clase: string): ClaseHormigon {
  const found = hormigonData.clases.find((c) => c.clase === clase);
  if (!found) {
    throw new Error(
      `Clase de hormigón inválida: ${clase}. Válidas: ${hormigonData.clases.map((c) => c.clase).join(', ')}`
    );
  }
  return found as ClaseHormigon;
}

function calcular(input: HormigonInput): HormigonOutput {
  if (input.volumen_m3 <= 0) {
    throw new Error('volumen_m3 debe ser > 0');
  }
  if (input.clase === 'H-13' && input.con_bomba) {
    throw new Error('H-13 no es apto para bomba (no tiene suficiente cemento).');
  }

  const clase = findClase(input.clase);

  const factorDesperdicio = input.elaborado
    ? clase.factor_desperdicio_default
    : 1.08;

  const volumenReal = input.volumen_m3 * factorDesperdicio;

  let cementoFactor = 1.0;
  if (input.con_bomba && clase.apto_bomba) {
    cementoFactor = 1.1;
  }

  let aguaAjuste = 0;
  if (input.humedad_aridos === 'secos') aguaAjuste = 10;
  if (input.humedad_aridos === 'humedos') aguaAjuste = -10;

  const cementoKg =
    clase.cemento_kg_m3 * input.volumen_m3 * cementoFactor * factorDesperdicio;
  const cementoBolsas = Math.ceil(cementoKg / 50);

  const arenaM3 = clase.arena_gruesa_m3_m3 * input.volumen_m3 * 1.08;
  const ripioM3 = clase.ripio_m3_m3 * input.volumen_m3 * 1.08;

  const arenaM3Round = Math.round(arenaM3 * 10000) / 10000;
  const ripioM3Round = Math.round(ripioM3 * 10000) / 10000;

  const aguaLitros =
    (clase.agua_litros_m3 + aguaAjuste) * input.volumen_m3;

  const notas: string[] = [];
  notas.push(
    `Volumen real con desperdicio: ${volumenReal.toFixed(3)} m³ (factor ${factorDesperdicio})`
  );
  if (input.con_bomba) {
    notas.push('Bomba: +10% cemento aplicado');
  }
  if (input.humedad_aridos !== 'normales') {
    notas.push(
      `Agua ajustada por áridos ${input.humedad_aridos}: ${aguaAjuste > 0 ? '+' : ''}${aguaAjuste} l/m³`
    );
  }

  return {
    clase: clase.clase,
    volumen_m3: input.volumen_m3,
    materiales: {
      cemento_kg: Math.round(cementoKg * 100) / 100,
      cemento_bolsas_50kg: cementoBolsas,
      arena_gruesa_m3: arenaM3Round,
      ripio_m3: ripioM3Round,
      agua_litros: Math.round(aguaLitros * 10) / 10,
    },
    volumen_real_m3: Math.round(volumenReal * 1000) / 1000,
    factor_desperdicio: factorDesperdicio,
    notas,
  };
}

const schema: Anthropic.Tool = {
  name: 'calcular_hormigon',
  description:
    'Calcula los materiales necesarios (cemento, arena gruesa, ripio 1:3, agua) para un volumen dado de hormigón armado. Considera la clase del hormigón (H-13, H-17, H-21, H-25, H-30), si es elaborado o in situ, si se usa bomba, y la humedad de los áridos. Por defecto usa H-21.',
  input_schema: {
    type: 'object',
    properties: {
      volumen_m3: {
        type: 'number',
        description: 'Volumen de hormigón necesario en metros cúbicos (m³).',
        minimum: 0.001,
      },
      clase: {
        type: 'string',
        enum: ['H-13', 'H-17', 'H-21', 'H-25', 'H-30'],
        description:
          'Clase de hormigón según indicación del calculista estructural. Default: H-21.',
        default: HORMIGON_DEFAULT,
      },
      elaborado: {
        type: 'boolean',
        description:
          'true si es hormigón elaborado (llega en mixer), false si es in situ (mezclado en obra). Hormigón in situ tiene mayor desperdicio.',
        default: true,
      },
      con_bomba: {
        type: 'boolean',
        description:
          'true si se usa bomba para el colado. Suma 10% de cemento y usa árido máximo 19mm. No disponible para H-13.',
        default: false,
      },
      humedad_aridos: {
        type: 'string',
        enum: ['secos', 'normales', 'humedos'],
        description:
          'Estado de humedad de los áridos (arena y ripio). secos: +10 l/m³ agua. humedos: -10 l/m³ agua.',
        default: 'normales',
      },
    },
    required: ['volumen_m3'],
  },
};

export const calcularHormigonTool: Tool<HormigonInput, HormigonOutput> = {
  name: schema.name!,
  description: schema.description!,
  schema,
  execute: calcular,
};

export { calcular as calcularHormigon };
