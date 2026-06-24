/**
 * Tool: calcular_mano_obra
 *
 * Calcula el costo total de mano de obra para una tarea de construcción,
 * considerando:
 *   - Horas de Oficial y Ayudante por unidad
 *   - Tarifas por hora
 *   - Asignaciones no remunerativas por hora
 *   - Cargas sociales (porcentaje configurable, default referencia 125.21%)
 *
 * Fórmula: Costo Total = (Horas × Tarifa) + Cargas Sociales + Asignaciones
 *
 * Basado en la metodología de SoyLeo AI skill original.
 */

import type Anthropic from '@anthropic-ai/sdk';
import type { Tool, ManoObraInput, ManoObraOutput } from './types';

const CARGAS_SOCIALES_REFERENCIA = 125.21;

function calcular(input: ManoObraInput): ManoObraOutput {
  if (input.cantidad <= 0) throw new Error('cantidad debe ser > 0');
  if (input.horas_oficial_por_unidad < 0) {
    throw new Error('horas_oficial_por_unidad debe ser >= 0');
  }
  if (input.horas_ayudante_por_unidad < 0) {
    throw new Error('horas_ayudante_por_unidad debe ser >= 0');
  }
  if (input.tarifa_oficial_por_hora < 0 || input.tarifa_ayudante_por_hora < 0) {
    throw new Error('Tarifas deben ser >= 0');
  }
  if (input.porcentaje_cargas_sociales < 0) {
    throw new Error('porcentaje_cargas_sociales debe ser >= 0');
  }

  const incluirCargas = input.incluir_cargas_sociales ?? true;
  const incluirAsig = input.incluir_asignaciones ?? true;

  const horasOficialTotal = input.horas_oficial_por_unidad * input.cantidad;
  const horasAyudanteTotal = input.horas_ayudante_por_unidad * input.cantidad;

  const costoBaseOficial = horasOficialTotal * input.tarifa_oficial_por_hora;
  const costoBaseAyudante = horasAyudanteTotal * input.tarifa_ayudante_por_hora;
  const costoBaseTotal = costoBaseOficial + costoBaseAyudante;

  const cargasSocialesMonto = incluirCargas
    ? costoBaseTotal * (input.porcentaje_cargas_sociales / 100)
    : 0;

  const asigOficial =
    (input.asig_no_remunerativa_oficial_por_hora ?? 0) * horasOficialTotal;
  const asigAyudante =
    (input.asig_no_remunerativa_ayudante_por_hora ?? 0) * horasAyudanteTotal;
  const asignacionesMonto = incluirAsig ? asigOficial + asigAyudante : 0;

  const costoTotal = costoBaseTotal + cargasSocialesMonto + asignacionesMonto;

  const detalle: ManoObraOutput['detalle'] = [
    {
      componente: 'Oficial',
      horas: horasOficialTotal,
      tarifa: input.tarifa_oficial_por_hora,
      subtotal: Math.round(costoBaseOficial * 100) / 100,
    },
    {
      componente: 'Ayudante',
      horas: horasAyudanteTotal,
      tarifa: input.tarifa_ayudante_por_hora,
      subtotal: Math.round(costoBaseAyudante * 100) / 100,
    },
  ];

  if (incluirCargas) {
    detalle.push({
      componente: `Cargas sociales (${input.porcentaje_cargas_sociales}%)`,
      horas: 0,
      tarifa: 0,
      subtotal: Math.round(cargasSocialesMonto * 100) / 100,
    });
  }
  if (incluirAsig && (asigOficial > 0 || asigAyudante > 0)) {
    detalle.push({
      componente: 'Asignaciones no remunerativas',
      horas: 0,
      tarifa: 0,
      subtotal: Math.round(asignacionesMonto * 100) / 100,
    });
  }

  return {
    tarea: input.tarea,
    cantidad: input.cantidad,
    horas_oficial_total: horasOficialTotal,
    horas_ayudante_total: horasAyudanteTotal,
    costo_base_oficial: Math.round(costoBaseOficial * 100) / 100,
    costo_base_ayudante: Math.round(costoBaseAyudante * 100) / 100,
    costo_base_total: Math.round(costoBaseTotal * 100) / 100,
    cargas_sociales_monto: Math.round(cargasSocialesMonto * 100) / 100,
    asignaciones_monto: Math.round(asignacionesMonto * 100) / 100,
    costo_total: Math.round(costoTotal * 100) / 100,
    detalle,
  };
}

const schema: Anthropic.Tool = {
  name: 'calcular_mano_obra',
  description:
    'Calcula el costo total de mano de obra para una tarea de construcción. Considera horas de Oficial y Ayudante, tarifas, asignaciones no remunerativas y cargas sociales. Cargas sociales por defecto referencia 125.21% (verificar vigente con el usuario).',
  input_schema: {
    type: 'object',
    properties: {
      tarea: {
        type: 'string',
        description: 'Nombre de la tarea. Ej: "Bases de H°A°", "Mampostería ladrillo hueco 12cm".',
      },
      cantidad: {
        type: 'number',
        description: 'Cantidad de unidades. La unidad depende de la tarea (m3, m2, kg, etc).',
        minimum: 0.001,
      },
      horas_oficial_por_unidad: {
        type: 'number',
        description: 'Horas de Oficial por unidad.',
        minimum: 0,
      },
      horas_ayudante_por_unidad: {
        type: 'number',
        description: 'Horas de Ayudante por unidad.',
        minimum: 0,
      },
      tarifa_oficial_por_hora: {
        type: 'number',
        description: 'Tarifa por hora del Oficial en ARS.',
        minimum: 0,
      },
      tarifa_ayudante_por_hora: {
        type: 'number',
        description: 'Tarifa por hora del Ayudante en ARS.',
        minimum: 0,
      },
      asig_no_remunerativa_oficial_por_hora: {
        type: 'number',
        description: 'Asignación no remunerativa por hora del Oficial en ARS.',
        minimum: 0,
        default: 0,
      },
      asig_no_remunerativa_ayudante_por_hora: {
        type: 'number',
        description: 'Asignación no remunerativa por hora del Ayudante en ARS.',
        minimum: 0,
        default: 0,
      },
      porcentaje_cargas_sociales: {
        type: 'number',
        description:
          'Porcentaje de cargas sociales vigente. Default: 125.21 (referencia NOA). Confirmar con el usuario antes de usar.',
        default: CARGAS_SOCIALES_REFERENCIA,
        minimum: 0,
      },
      incluir_cargas_sociales: {
        type: 'boolean',
        description: 'Si se suman las cargas sociales al costo total. Default: true.',
        default: true,
      },
      incluir_asignaciones: {
        type: 'boolean',
        description:
          'Si se suman las asignaciones no remunerativas. Default: true (si los valores son > 0).',
        default: true,
      },
    },
    required: [
      'tarea',
      'cantidad',
      'horas_oficial_por_unidad',
      'horas_ayudante_por_unidad',
      'tarifa_oficial_por_hora',
      'tarifa_ayudante_por_hora',
    ],
  },
};

export const calcularManoObraTool: Tool<ManoObraInput, ManoObraOutput> = {
  name: schema.name!,
  description: schema.description!,
  schema,
  execute: calcular,
};

export { calcular as calcularManoObra, CARGAS_SOCIALES_REFERENCIA };
