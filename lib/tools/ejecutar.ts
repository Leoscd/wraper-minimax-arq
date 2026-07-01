/**
 * Ejecutor central de tools por nombre.
 *
 * M3 (function calling) devuelve bloques `tool_use` con `{ name, input }`.
 * Este módulo traduce ese `name` a la función determinística correspondiente.
 * Lo comparten `/api/generate` y `/api/chat` para no duplicar el `switch`
 * (antes vivía inline en el endpoint de generación).
 *
 * Importante: las tools son puras/determinísticas (ver protocolo §3.2). Si M3
 * pide una tool inexistente devolvemos un objeto `{ error }` en vez de tirar,
 * así el modelo recibe el feedback y puede corregir en la próxima iteración.
 */

import {
  calcularHormigon,
  calcularHierroLongitudinal,
  calcularEstribos,
  calcularMorteroRevoque,
  calcularMamposteria,
  buscarPrecio,
  calcularManoObra,
  aplicarDesperdicio,
  calcularCronograma,
  calcularCurvaInversion,
  generarEntregable,
} from './index';

export function ejecutarTool(nombre: string, input: unknown): unknown {
  switch (nombre) {
    case 'calcular_hormigon':
      return calcularHormigon(input as Parameters<typeof calcularHormigon>[0]);
    case 'calcular_hierro_longitudinal':
      return calcularHierroLongitudinal(
        input as Parameters<typeof calcularHierroLongitudinal>[0]
      );
    case 'calcular_estribos':
      return calcularEstribos(input as Parameters<typeof calcularEstribos>[0]);
    case 'calcular_mortero_revoque':
      return calcularMorteroRevoque(
        input as Parameters<typeof calcularMorteroRevoque>[0]
      );
    case 'calcular_mamposteria':
      return calcularMamposteria(
        input as Parameters<typeof calcularMamposteria>[0]
      );
    case 'buscar_precio':
      return buscarPrecio(input as Parameters<typeof buscarPrecio>[0]);
    case 'calcular_mano_obra':
      return calcularManoObra(input as Parameters<typeof calcularManoObra>[0]);
    case 'aplicar_desperdicio':
      return aplicarDesperdicio(
        input as Parameters<typeof aplicarDesperdicio>[0]
      );
    case 'calcular_cronograma':
      return calcularCronograma(
        input as Parameters<typeof calcularCronograma>[0]
      );
    case 'calcular_curva_inversion':
      return calcularCurvaInversion(
        input as Parameters<typeof calcularCurvaInversion>[0]
      );
    case 'generar_entregable':
      return generarEntregable(
        input as Parameters<typeof generarEntregable>[0]
      );
    default:
      return { error: `Tool no encontrada: ${nombre}` };
  }
}
