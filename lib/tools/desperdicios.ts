/**
 * Tool: aplicar_desperdicio
 *
 * Devuelve el factor de desperdicio DIFERENCIADO para un material
 * específico. Aplica la cantidad calculada y devuelve la cantidad final
 * a comprar.
 *
 * NO usar 10% genérico. Cada material tiene su factor específico.
 */

import type Anthropic from '@anthropic-ai/sdk';
import type { Tool, DesperdicioInput, DesperdicioOutput } from './types';
import desperdiciosData from '../../data/desperdicios.json';

const FACTORES: Record<string, { factor: number; pct: string; motivo: string }> =
  desperdiciosData.factores as Record<
    string,
    { factor: number; pct: string; motivo: string }
  >;

const ALIAS: Record<string, string> = {
  hormigon: 'hormigon_elaborado',
  hormigon_elaborado: 'hormigon_elaborado',
  hormigon_in_situ: 'hormigon_in_situ',
  hormigon_in_sito: 'hormigon_in_situ',
  acero: 'acero_barras',
  hierro: 'acero_barras',
  barras: 'acero_barras',
  cemento: 'cemento_bolsas',
  arena: 'arena_ripio',
  ripio: 'arena_ripio',
  ladrillo: 'ladrillos_huecos',
  ladrillos: 'ladrillos_huecos',
  ladrillo_hueco: 'ladrillos_huecos',
  ladrillo_comun: 'ladrillos_comunes',
  bloque: 'bloques_hormigon',
  bloques: 'bloques_hormigon',
  mortero: 'mortero_plasticor',
  plasticor: 'mortero_plasticor',
  ceramico: 'ceramicos_porcellanato',
  ceramicos: 'ceramicos_porcellanato',
  porcellanato: 'ceramicos_porcellanato',
  pintura: 'pintura',
  membrana: 'membrana_asfaltica',
  aislacion: 'aislacion_termica_eps',
  chapa: 'chapas',
  chapas: 'chapas',
  teja: 'tejas',
  tejas: 'tejas',
  caneria: 'canerias_pvc_ppf',
  cañeria: 'canerias_pvc_ppf',
  cable: 'cables_electricos',
  cables: 'cables_electricos',
  pastina: 'pastina_junta',
};

function resolver(material: string): string {
  const key = material.toLowerCase().trim();
  if (FACTORES[key]) return key;
  if (ALIAS[key]) return ALIAS[key];

  for (const k of Object.keys(FACTORES)) {
    if (k.includes(key) || key.includes(k)) return k;
  }

  throw new Error(
    `Material no encontrado: "${material}". Materiales válidos: ${Object.keys(FACTORES).join(', ')}`
  );
}

function calcular(input: DesperdicioInput): DesperdicioOutput {
  if (input.cantidad_calculada < 0) {
    throw new Error('cantidad_calculada debe ser >= 0');
  }

  const key = resolver(input.material);
  const info = FACTORES[key];
  const cantidadFinal = Math.ceil(input.cantidad_calculada * info.factor - 1e-9);

  return {
    material: key,
    factor: info.factor,
    cantidad_final: cantidadFinal,
    desperdicio_pct: info.pct,
    motivo: info.motivo,
  };
}

const MATERIALES_VALIDOS = Array.from(
  new Set([...Object.keys(FACTORES), ...Object.keys(ALIAS)])
).sort();

const schema: Anthropic.Tool = {
  name: 'aplicar_desperdicio',
  description:
    'Aplica el factor de desperdicio DIFERENCIADO para un material específico. NO usar 10% genérico. Cada material tiene su factor propio (cemento 5%, ladrillos 7%, mortero 12%, cerámico 12%, etc).',
  input_schema: {
    type: 'object',
    properties: {
      material: {
        type: 'string',
        description: `Material a aplicar desperdicio. Válidos: ${MATERIALES_VALIDOS.join(', ')}.`,
      },
      cantidad_calculada: {
        type: 'number',
        description: 'Cantidad calculada antes de aplicar desperdicio.',
        minimum: 0,
      },
    },
    required: ['material', 'cantidad_calculada'],
  },
};

export const aplicarDesperdicioTool: Tool<DesperdicioInput, DesperdicioOutput> = {
  name: schema.name,
  description: schema.description,
  schema,
  execute: calcular,
};

export { calcular as aplicarDesperdicio, MATERIALES_VALIDOS };
