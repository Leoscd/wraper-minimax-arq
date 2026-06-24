/**
 * Tool registry.
 *
 * Devuelve todas las tools en formato Anthropic para que M3 las pueda
 * invocar via function calling. Este es el array que se pasa a
 * `client.messages.create({ tools: allTools() })`.
 *
 * Cada tool está implementada en su propio archivo y exporta:
 *   - el schema (Anthropic.Tool)
 *   - la función execute(input) → output
 *
 * Para usar una tool desde código:
 *   import { calcularHormigon } from './tools/hormigon';
 *   const r = calcularHormigon({ volumen_m3: 7.5, clase: 'H-25', ... });
 */

import type Anthropic from '@anthropic-ai/sdk';
import { calcularHormigonTool } from './hormigon';
import { calcularHierroLongitudinalTool } from './hierro';
import { calcularEstribosTool } from './estribos';
import { calcularMorteroRevoqueTool } from './mortero';
import { calcularMamposteriaTool } from './mamposteria';
import { buscarPrecioTool } from './precios';
import { calcularManoObraTool } from './mano-obra';
import { aplicarDesperdicioTool } from './desperdicios';

const allToolsList = [
  calcularHormigonTool,
  calcularHierroLongitudinalTool,
  calcularEstribosTool,
  calcularMorteroRevoqueTool,
  calcularMamposteriaTool,
  buscarPrecioTool,
  calcularManoObraTool,
  aplicarDesperdicioTool,
];

/**
 * Devuelve todas las tools en formato Anthropic.Tool para M3.
 * Usar en: client.messages.create({ tools: allTools() })
 */
export function allTools(): Anthropic.Tool[] {
  return allToolsList.map((t) => t.schema);
}

export const toolNames = allToolsList.map((t) => t.name);

export {
  calcularHormigonTool,
  calcularHierroLongitudinalTool,
  calcularEstribosTool,
  calcularMorteroRevoqueTool,
  calcularMamposteriaTool,
  buscarPrecioTool,
  calcularManoObraTool,
  aplicarDesperdicioTool,
};
