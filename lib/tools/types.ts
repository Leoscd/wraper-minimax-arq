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

export interface HierroInput {
  cantidad_barras: number;
  longitud_elemento_m: number;
  diametro_mm: number;
}

export interface HierroOutput {
  diametro_mm: number;
  longitud_elemento_m: number;
  cantidad_barras: number;
  longitud_comercial_m: number;
  requiere_empalme: boolean;
  empalme_m: number;
  longitud_efectiva_por_barra_m: number;
  barras_por_posicion: number;
  barras_totales_sin_desperdicio: number;
  barras_totales_con_desperdicio: number;
  factor_desperdicio: number;
  peso_por_barra_kg: number;
  peso_total_kg: number;
  notas: string[];
}

export interface EstribosInput {
  longitud_elemento_m: number;
  seccion_base_m: number;
  seccion_altura_m: number;
  diametro_estribo_mm: 6 | 8;
  separacion_m: number;
  recubrimiento_m: number;
}

export interface EstribosOutput {
  cantidad_estribos: number;
  perimetro_por_estribo_m: number;
  longitud_total_ml: number;
  barras_6m_necesarias: number;
  barras_con_desperdicio: number;
  factor_desperdicio: number;
  peso_total_kg: number;
  ganchos_por_estribo_m: number;
  notas: string[];
}

export interface MorteroInput {
  tipo: 'revoque_grueso' | 'revoque_fino' | 'revoque_completo' | 'contrapiso';
  area_m2: number;
  espesor_grueso_cm?: 1.0 | 1.5 | 2.0 | 2.5;
  sustrato_fino?:
    | 'sobre_grueso_nivelado'
    | 'sobre_grueso_irregular'
    | 'sobre_mamposteria_directa';
  espesor_contrapiso_cm?: 8 | 10 | 12;
}

export interface MorteroOutput {
  tipo: string;
  area_m2: number;
  bolsas_total: number;
  kg_total: number;
  factor_desperdicio: number;
  detalles: {
    revoque_grueso?: {
      espesor_cm: number;
      rendimiento_m2_por_bolsa: number;
      bolsas: number;
      kg: number;
    };
    revoque_fino?: {
      sustrato: string;
      rendimiento_m2_por_bolsa: number;
      bolsas: number;
      kg: number;
    };
    contrapiso?: {
      espesor_cm: number;
      m3: number;
      bolsas: number;
      kg: number;
    };
  };
}

export interface MamposteriaInput {
  tipo_ladrillo:
    | 'ladrillo_hueco_12'
    | 'ladrillo_hueco_18'
    | 'ladrillo_comun_15'
    | 'ladrillo_comun_30'
    | 'bloque_hormigon_20';
  area_m2: number;
}

export interface MamposteriaOutput {
  tipo_ladrillo: string;
  area_m2: number;
  ladrillos_por_m2: number;
  ladrillos_sin_desperdicio: number;
  ladrillos_totales: number;
  factor_desperdicio: number;
  unidad: string;
}

export interface BuscarPrecioInput {
  termino: string;
  categoria?: string;
  limit?: number;
  /** Región del dataset de precios a usar. Default: 'NOA'. */
  region?: string;
}

export interface PrecioEncontrado {
  id: string;
  descripcion: string;
  categoria: string;
  proveedor: string;
  precio: number;
  codigo: string;
}

export interface BuscarPrecioOutput {
  termino: string;
  total_encontrados: number;
  resultados: PrecioEncontrado[];
  /** Región efectivamente usada para la búsqueda (puede diferir si hubo fallback). */
  region_usada: string;
}

export interface ManoObraInput {
  tarea: string;
  cantidad: number;
  horas_oficial_por_unidad: number;
  horas_ayudante_por_unidad: number;
  tarifa_oficial_por_hora: number;
  tarifa_ayudante_por_hora: number;
  asig_no_remunerativa_oficial_por_hora?: number;
  asig_no_remunerativa_ayudante_por_hora?: number;
  porcentaje_cargas_sociales: number;
  incluir_cargas_sociales?: boolean;
  incluir_asignaciones?: boolean;
}

export interface ManoObraOutput {
  tarea: string;
  cantidad: number;
  horas_oficial_total: number;
  horas_ayudante_total: number;
  costo_base_oficial: number;
  costo_base_ayudante: number;
  costo_base_total: number;
  cargas_sociales_monto: number;
  asignaciones_monto: number;
  costo_total: number;
  detalle: {
    componente: string;
    horas: number;
    tarifa: number;
    subtotal: number;
  }[];
}

export interface DesperdicioInput {
  material: string;
  cantidad_calculada: number;
}

export interface DesperdicioOutput {
  material: string;
  factor: number;
  cantidad_final: number;
  desperdicio_pct: string;
  motivo: string;
}
