/**
 * Tipos compartidos para tools (function calling).
 *
 * Cada tool tiene:
 * - schema: la definición JSON Schema que se manda a M3 (Anthropic format)
 * - execute: la función que efectivamente calcula
 * - description: descripción legible para humanos
 */

import type Anthropic from '@anthropic-ai/sdk';

export interface Tool<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  schema: Anthropic.Tool;
  execute: (input: TInput) => TOutput;
}

export interface HormigonInput {
  volumen_m3: number;
  clase: 'H-13' | 'H-17' | 'H-21' | 'H-25' | 'H-30';
  elaborado: boolean;
  con_bomba: boolean;
  humedad_aridos: 'secos' | 'normales' | 'humedos';
}

export interface HormigonOutput {
  clase: string;
  volumen_m3: number;
  materiales: {
    cemento_kg: number;
    cemento_bolsas_50kg: number;
    arena_gruesa_m3: number;
    ripio_m3: number;
    agua_litros: number;
  };
  volumen_real_m3: number;
  factor_desperdicio: number;
  notas: string[];
}
