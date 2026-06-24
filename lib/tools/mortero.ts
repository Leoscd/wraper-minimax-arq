/**
 * Tool: calcular_mortero_revoque
 *
 * Calcula la cantidad de bolsas de mortero Plasticor (25kg) necesarias
 * para revoques gruesos y finos, según:
 *   - Espesor del revoque grueso (1cm, 1.5cm, 2cm, 2.5cm)
 *   - Sustrato del revoque fino (sobre grueso bien nivelado, irregular,
 *     o mampostería directa)
 *
 * Basado en la tabla de rendimientos de SoyLeo AI skill original.
 */

import type Anthropic from '@anthropic-ai/sdk';
import type { Tool, MorteroInput, MorteroOutput } from './types';

const BOLSA_KG = 25;
const DESPERDICIO_MORTERO = 1.12;

const RENDIMIENTOS_GRUESO: Record<number, number> = {
  1.0: 6,
  1.5: 4,
  2.0: 3,
  2.5: 2.5,
};

const RENDIMIENTOS_FINO: Record<string, number> = {
  sobre_grueso_nivelado: 10,
  sobre_grueso_irregular: 8,
  sobre_mamposteria_directa: 6.5,
};

function calcular(input: MorteroInput): MorteroOutput {
  if (input.area_m2 <= 0) throw new Error('area_m2 debe ser > 0');

  const tipo = input.tipo;
  const detalles: MorteroOutput['detalles'] = {};
  let bolsas = 0;
  let kgTotales = 0;

  if (tipo === 'revoque_grueso' || tipo === 'revoque_completo') {
    const espesor = input.espesor_grueso_cm ?? 1.5;
    const rendimiento = RENDIMIENTOS_GRUESO[espesor];
    if (!rendimiento) {
      throw new Error(
        `Espesor inválido: ${espesor}cm. Válidos: ${Object.keys(RENDIMIENTOS_GRUESO).join(', ')}cm`
      );
    }
    const bolsasGr = Math.ceil((input.area_m2 / rendimiento) * DESPERDICIO_MORTERO - 1e-9);
    detalles.revoque_grueso = {
      espesor_cm: espesor,
      rendimiento_m2_por_bolsa: rendimiento,
      bolsas: bolsasGr,
      kg: bolsasGr * BOLSA_KG,
    };
    bolsas += bolsasGr;
    kgTotales += bolsasGr * BOLSA_KG;
  }

  if (tipo === 'revoque_fino' || tipo === 'revoque_completo') {
    const sustrato =
      input.sustrato_fino ?? 'sobre_grueso_irregular';
    const rendimiento = RENDIMIENTOS_FINO[sustrato];
    if (!rendimiento) {
      throw new Error(`Sustrato inválido: ${sustrato}`);
    }
    const bolsasFi = Math.ceil((input.area_m2 / rendimiento) * DESPERDICIO_MORTERO - 1e-9);
    detalles.revoque_fino = {
      sustrato,
      rendimiento_m2_por_bolsa: rendimiento,
      bolsas: bolsasFi,
      kg: bolsasFi * BOLSA_KG,
    };
    bolsas += bolsasFi;
    kgTotales += bolsasFi * BOLSA_KG;
  }

  if (tipo === 'contrapiso') {
    if (!input.espesor_contrapiso_cm) {
      throw new Error('espesor_contrapiso_cm requerido para contrapiso');
    }
    const bolsasM3 = 0.25;
    const m3 = input.area_m2 * (input.espesor_contrapiso_cm / 100);
    const bolsasCn = Math.ceil((m3 / bolsasM3) * DESPERDICIO_MORTERO - 1e-9);
    detalles.contrapiso = {
      espesor_cm: input.espesor_contrapiso_cm,
      m3: Math.round(m3 * 1000) / 1000,
      bolsas: bolsasCn,
      kg: bolsasCn * BOLSA_KG,
    };
    bolsas += bolsasCn;
    kgTotales += bolsasCn * BOLSA_KG;
  }

  return {
    tipo,
    area_m2: input.area_m2,
    bolsas_total: bolsas,
    kg_total: kgTotales,
    factor_desperdicio: DESPERDICIO_MORTERO,
    detalles,
  };
}

const schema: Anthropic.Tool = {
  name: 'calcular_mortero_revoque',
  description:
    'Calcula la cantidad de bolsas de mortero Plasticor (25kg) necesarias para revoques gruesos, finos o completos. El revoque grueso depende del espesor (1-2.5cm), el fino del sustrato. Aplica factor de desperdicio 1.12 (12%).',
  input_schema: {
    type: 'object',
    properties: {
      tipo: {
        type: 'string',
        enum: ['revoque_grueso', 'revoque_fino', 'revoque_completo', 'contrapiso'],
        description: 'Tipo de mortero a calcular.',
      },
      area_m2: {
        type: 'number',
        description: 'Área en m² a revocar o contrapisar.',
        minimum: 0.01,
      },
      espesor_grueso_cm: {
        type: 'number',
        enum: [1.0, 1.5, 2.0, 2.5],
        description:
          'Espesor del revoque grueso en cm. Default 1.5cm (medida estándar). 1cm para muros bien aplomados, 2-2.5cm para muros con desplomo.',
        default: 1.5,
      },
      sustrato_fino: {
        type: 'string',
        enum: ['sobre_grueso_nivelado', 'sobre_grueso_irregular', 'sobre_mamposteria_directa'],
        description:
          'Sustrato del revoque fino. Default: sobre_grueso_irregular (caso más frecuente).',
        default: 'sobre_grueso_irregular',
      },
      espesor_contrapiso_cm: {
        type: 'number',
        description: 'Espesor del contrapiso en cm. Requerido solo si tipo=contrapiso.',
        enum: [8, 10, 12],
      },
    },
    required: ['tipo', 'area_m2'],
  },
};

export const calcularMorteroRevoqueTool: Tool<MorteroInput, MorteroOutput> = {
  name: schema.name,
  description: schema.description,
  schema,
  execute: calcular,
};

export { calcular as calcularMorteroRevoque };
