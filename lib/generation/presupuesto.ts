/**
 * Pre-cómputo / formateo determinístico del presupuesto para el brief.
 *
 * El objetivo es que el modelo reciba los números YA resueltos y sin ambigüedad,
 * para que no los recalcule ni los redondee distinto (fidelidad numérica) y para
 * ahorrarle round-trips de tools.
 *
 * Hoy el request trae el presupuesto pre-armado en `rubros` (RubrosInput). Esta
 * función lo normaliza a un texto compacto. Las tools determinísticas de
 * `lib/tools/*` quedan disponibles para un futuro path con inputs de cómputo
 * estructurados (volúmenes, hierros, etc.).
 */

import type { RubrosInput } from '../types';

function ars(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Devuelve un resumen en markdown del presupuesto, o `null` si no hay rubros.
 * Pensado para inyectarse en el brief como datos no-recalculables.
 */
export function resumenPresupuesto(rubros?: RubrosInput): string | null {
  if (!rubros || !rubros.rubros || rubros.rubros.length === 0) {
    return null;
  }

  const filas = rubros.rubros
    .map((r) => {
      const cant = r.unidad ? `${r.cantidad} ${r.unidad}` : `${r.cantidad}`;
      return `| ${r.numero} | ${r.nombre} | ${cant} | ${ars(r.materiales)} | ${ars(r.mano_de_obra)} | ${ars(r.total)} | ${r.incidencia} |`;
    })
    .join('\n');

  const t = rubros.totales;
  const lineasTotales = [
    `- Materiales: ${ars(t.materiales)}`,
    `- Mano de obra: ${ars(t.mano_de_obra)}`,
    `- **TOTAL OBRA: ${ars(t.total_obra)}**`,
  ];
  if (typeof t.costo_m2 === 'number') {
    lineasTotales.push(`- Costo por m²: ${ars(t.costo_m2)}`);
  }

  return `### Presupuesto (YA CALCULADO — usá estos números tal cual, no los recalcules)

| N° | Rubro | Cantidad | Materiales | Mano de obra | Total | Incidencia |
|----|-------|----------|------------|--------------|-------|------------|
${filas}

**Totales:**
${lineasTotales.join('\n')}
${rubros.nota ? `\n> ${rubros.nota}` : ''}`;
}
