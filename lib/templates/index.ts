/**
 * Templates HTML.
 *
 * Aquí se portan los templates originales de SoyLeo AI:
 * - presentacion-darkgold: el template premium para clientes finales
 * - presupuesto-tecnico: el formato de presupuesto técnico tradicional
 *
 * Placeholders por ahora. Se completan en próximas fases.
 */

export const TEMPLATES = {
  presentacion_darkgold: 'presentacion-darkgold',
  presupuesto_tecnico: 'presupuesto-tecnico',
} as const;

export type TemplateName = (typeof TEMPLATES)[keyof typeof TEMPLATES];
