/**
 * Export a Excel (.xlsx) de los datos estructurados del entregable.
 *
 * C2 del PLAN-LANZAMIENTO.md: el tier pago puede exportar Excel. Se
 * exportan los datos YA VALIDADOS del template (no se parsea el HTML),
 * porque la invariante del proyecto es: "todo numero sale de tools".
 * Parsear el HTML seria fragil y contrario al diseño.
 *
 * Cada tipo de entregable genera un workbook con una hoja por seccion:
 *   - presupuesto: rubros, totales, materiales por rubro
 *   - cronograma: tareas, camino critico, duraciones
 *   - curva: periodos, distribucion de gastos
 *   - documento: no se exporta (es cualitativo) — se devuelve error
 */

import ExcelJS from 'exceljs';
import type { RubrosInput } from '../types';

export type EntregableParaXlsx =
  | { tipo: 'presupuesto'; rubros: RubrosInput }
  | { tipo: 'cronograma'; cronograma: any }
  | { tipo: 'curva'; curva: any }
  | { tipo: 'documento' };

export async function generarXlsx(input: EntregableParaXlsx): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SoyLeo AI';
  wb.created = new Date();

  if (input.tipo === 'presupuesto') {
    await sheetPresupuesto(wb, input.rubros);
  } else if (input.tipo === 'cronograma') {
    await sheetCronograma(wb, input.cronograma);
  } else if (input.tipo === 'curva') {
    await sheetCurva(wb, input.curva);
  } else {
    // 'documento' no se exporta a Excel (es cualitativo).
    throw new Error(
      'Los documentos cualitativos no se exportan a Excel. Usa el HTML.'
    );
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

async function sheetPresupuesto(wb: ExcelJS.Workbook, r: RubrosInput): Promise<void> {
  const ws = wb.addWorksheet('Rubros');
  ws.columns = [
    { header: 'N°', key: 'numero', width: 8 },
    { header: 'Rubro', key: 'nombre', width: 40 },
    { header: 'Cantidad', key: 'cantidad', width: 12 },
    { header: 'Unidad', key: 'unidad', width: 10 },
    { header: 'P. unit. materiales', key: 'pum', width: 18 },
    { header: 'P. unit. MO', key: 'pumo', width: 18 },
    { header: 'Materiales', key: 'mat', width: 18 },
    { header: 'Mano de obra', key: 'mo', width: 18 },
    { header: 'Total', key: 'total', width: 18 },
    { header: 'Incidencia', key: 'incidencia', width: 12 },
  ];
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1B3A6B' },
  };

  r.rubros.forEach((r) => {
    ws.addRow({
      numero: r.numero,
      nombre: r.nombre,
      cantidad: r.cantidad,
      unidad: r.unidad ?? '',
      pum: r.precio_unitario_mat,
      pumo: r.precio_unitario_mo,
      mat: r.materiales,
      mo: r.mano_de_obra,
      total: r.total,
      incidencia: r.incidencia,
    });
  });

  // Total general.
  const totalRow = ws.addRow({
    nombre: 'TOTAL',
    mat: r.totales.materiales,
    mo: r.totales.mano_de_obra,
    total: r.totales.total_obra,
  });
  totalRow.font = { bold: true };
  totalRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFF2C4' },
  };

  // Hoja de totales.
  const wsTot = wb.addWorksheet('Totales');
  wsTot.columns = [
    { header: 'Concepto', key: 'k', width: 30 },
    { header: 'Valor', key: 'v', width: 22 },
  ];
  wsTot.addRow({ k: 'Materiales', v: r.totales.materiales });
  wsTot.addRow({ k: 'Mano de obra', v: r.totales.mano_de_obra });
  wsTot.addRow({ k: 'Total obra', v: r.totales.total_obra });
  if (r.totales.costo_m2) {
    wsTot.addRow({ k: 'Costo por m²', v: r.totales.costo_m2 });
  }
  wsTot.getRow(1).font = { bold: true };
}

async function sheetCronograma(wb: ExcelJS.Workbook, c: any): Promise<void> {
  const ws = wb.addWorksheet('Tareas');
  ws.columns = [
    { header: 'ID', key: 'id', width: 8 },
    { header: 'Tarea', key: 'nombre', width: 40 },
    { header: 'Duración (d)', key: 'dur', width: 12 },
    { header: 'Inicio (día)', key: 'ini', width: 12 },
    { header: 'Fin (día)', key: 'fin', width: 12 },
    { header: 'Holgura (d)', key: 'holg', width: 12 },
    { header: 'Crítica', key: 'crit', width: 10 },
    { header: 'Predecesoras', key: 'pred', width: 24 },
  ];
  ws.getRow(1).font = { bold: true };
  c.tareas.forEach((t: any) => {
    ws.addRow({
      id: t.id,
      nombre: t.nombre,
      dur: t.duracion_dias,
      ini: t.inicio_dia,
      fin: t.fin_dia,
      holg: t.holgura_dias,
      crit: t.critica ? 'SI' : '',
      pred: (t.predecesoras ?? []).join(', '),
    });
  });

  // Resumen.
  const wsRes = wb.addWorksheet('Resumen');
  wsRes.columns = [
    { header: 'Concepto', key: 'k', width: 30 },
    { header: 'Valor', key: 'v', width: 22 },
  ];
  wsRes.addRow({ k: 'Duración total', v: c.duracion_total_dias });
  wsRes.addRow({ k: 'Inicio proyecto', v: c.tareas[0]?.inicio_dia ?? 1 });
  wsRes.addRow({ k: 'Fin proyecto', v: c.fin_proyecto_dia });
  wsRes.addRow({
    k: 'Tareas críticas',
    v: (c.camino_critico ?? []).join(', '),
  });
  wsRes.getRow(1).font = { bold: true };
}

async function sheetCurva(wb: ExcelJS.Workbook, c: any): Promise<void> {
  const ws = wb.addWorksheet('Periodos');
  ws.columns = [
    { header: 'Periodo', key: 'periodo', width: 10 },
    { header: 'Días', key: 'dias', width: 14 },
    { header: 'Tareas', key: 'tareas', width: 30 },
    { header: 'Materiales', key: 'mat', width: 16 },
    { header: 'Mano de obra', key: 'mo', width: 16 },
    { header: 'Equipos', key: 'eq', width: 16 },
    { header: 'Total periodo', key: 'total', width: 16 },
    { header: 'Acumulado', key: 'acum', width: 18 },
    { header: '%', key: 'pct', width: 10 },
  ];
  ws.getRow(1).font = { bold: true };
  (c.periodos as any[]).forEach((p) => {
    ws.addRow({
      periodo: p.periodo,
      dias: `${p.inicio_dia}-${p.fin_dia}`,
      tareas: (p.tareas_activas ?? []).join(', '),
      mat: p.costo_materiales,
      mo: p.costo_mano_obra,
      eq: p.costo_equipos,
      total: p.costo_total,
      acum: p.costo_acumulado,
      pct: p.porcentaje_avance,
    });
  });

  // Resumen.
  const wsRes = wb.addWorksheet('Resumen');
  wsRes.columns = [
    { header: 'Concepto', key: 'k', width: 30 },
    { header: 'Valor', key: 'v', width: 22 },
  ];
  wsRes.addRow({ k: 'Granularidad', v: c.granularidad });
  wsRes.addRow({ k: 'Duración total', v: c.duracion_total_dias });
  wsRes.addRow({ k: 'Total obra', v: c.costo_total_obra });
  wsRes.addRow({ k: 'Materiales', v: c.costo_total_materiales });
  wsRes.addRow({ k: 'Mano de obra', v: c.costo_total_mano_obra });
  wsRes.addRow({ k: 'Equipos', v: c.costo_total_equipos });
  wsRes.getRow(1).font = { bold: true };
}
