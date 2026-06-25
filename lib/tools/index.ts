/**
 * Tools (function calling) determinísticas.
 *
 * Cada tool encapsula un cálculo de la metodología SoyLeo AI para que
 * M3 NUNCA calcule a mano. M3 las invoca via function calling.
 *
 * Tools implementadas:
 * - hormigon.ts: H-13 a H-30 con dosificación
 * - hierro.ts: barras longitudinales + empalmes
 * - estribos.ts: fórmula CIRSOC corregida con ganchos
 * - mortero.ts: Plasticor para revoques y contrapisos
 * - mamposteria.ts: ladrillos por m² (5 tipos)
 * - precios.ts: búsqueda en CSV de NOA (825 items)
 * - mano-obra.ts: oficial + ayudante + cargas sociales
 * - desperdicios.ts: factores DIFERENCIADOS por material
 * - cronograma.ts: CPM con camino crítico
 * - curva-inversion.ts: curva S de inversión
 */

export * from './types';
export * from './registry';
export {
  calcularHormigon,
  calcularHormigonTool,
} from './hormigon';
export {
  calcularHierroLongitudinal,
  calcularHierroLongitudinalTool,
} from './hierro';
export {
  calcularEstribos,
  calcularEstribosTool,
} from './estribos';
export {
  calcularMorteroRevoque,
  calcularMorteroRevoqueTool,
} from './mortero';
export {
  calcularMamposteria,
  calcularMamposteriaTool,
} from './mamposteria';
export {
  buscarPrecio,
  buscarPrecioTool,
} from './precios';
export {
  calcularManoObra,
  calcularManoObraTool,
  CARGAS_SOCIALES_REFERENCIA,
} from './mano-obra';
export {
  aplicarDesperdicio,
  aplicarDesperdicioTool,
  MATERIALES_VALIDOS,
} from './desperdicios';
export {
  calcularCronograma,
  calcularCronogramaTool,
} from './cronograma';
export {
  calcularCurvaInversion,
  calcularCurvaInversionTool,
} from './curva-inversion';
