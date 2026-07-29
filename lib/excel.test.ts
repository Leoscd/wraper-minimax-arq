import { describe, it, expect } from 'vitest';
import { generarXlsx } from './excel';
import ExcelJS from 'exceljs';

async function readSheet(buffer: Buffer, sheetName: string) {
  const wb = new ExcelJS.Workbook();
  // exceljs 4.x: xlsx.load() espera Buffer, writeBuffer() devuelve
  // Buffer<ArrayBufferLike>. Usamos @ts-expect-error para destrabar.
  // @ts-expect-error exceljs 4.x Buffer mismatch
  await (wb.xlsx as { load: (b: Buffer) => unknown }).load(buffer);
  const ws = wb.getWorksheet(sheetName);
  if (!ws) return null;
  const rows: any[] = [];
  ws.eachRow((row) => {
    // exceljs 4.x: row.values es un array 1-indexed; slice(1) ignora el
    // placeholder inicial. Lo casteamos a unknown para destrabar typecheck.
    const values = (row?.values ?? []) as unknown[];
    rows.push(values.slice(1));
  });
  return rows;
}

describe('generarXlsx', () => {
  it('genera presupuesto con hoja Rubros y hoja Totales', async () => {
    const buffer = await generarXlsx({
      tipo: 'presupuesto',
      rubros: {
        rubros: [
          {
            numero: '01',
            nombre: 'Hormigon',
            unidad: 'm3',
            cantidad: 10,
            precio_unitario_mat: 100000,
            precio_unitario_mo: 50000,
            materiales: 1000000,
            mano_de_obra: 500000,
            total: 1500000,
            incidencia: '50%',
          },
        ],
        totales: {
          materiales: 1000000,
          mano_de_obra: 500000,
          total_obra: 1500000,
          costo_m2: 75000,
        },
      },
    });

    expect(buffer.length).toBeGreaterThan(0);

    const rubros = await readSheet(buffer, 'Rubros');
    expect(rubros).not.toBeNull();
    // Header (slice(1) dropea el <1 empty item> de ExcelJS)
    expect(rubros![0]).toEqual([
      'N°', 'Rubro', 'Cantidad', 'Unidad', 'P. unit. materiales',
      'P. unit. MO', 'Materiales', 'Mano de obra', 'Total', 'Incidencia',
    ]);
    // Fila 1: rubro
    expect(rubros![1]).toEqual([
      '01', 'Hormigon', 10, 'm3', 100000, 50000, 1000000, 500000, 1500000, '50%',
    ]);
    // Fila 2: TOTAL. El campo 'nombre' (columna 'Rubro') tiene 'TOTAL'.
    expect(rubros![2][1]).toBe('TOTAL');
    expect(rubros![2][6]).toBe(1000000); // mat
    expect(rubros![2][8]).toBe(1500000); // total

    const totales = await readSheet(buffer, 'Totales');
    expect(totales).not.toBeNull();
    // header + 4 filas (materiales, MO, total, costo_m2)
    expect(totales!.length).toBe(5);
  });

  it('genera cronograma con hoja Tareas y hoja Resumen', async () => {
    const buffer = await generarXlsx({
      tipo: 'cronograma',
      cronograma: {
        duracion_total_dias: 18,
        fin_proyecto_dia: 18,
        camino_critico: ['T1', 'T2'],
        tareas: [
          { id: 'T1', nombre: 'Excavacion', duracion_dias: 3, inicio_dia: 1, fin_dia: 3, holgura_dias: 0, critica: true, predecesoras: [] },
          { id: 'T2', nombre: 'Fundaciones', duracion_dias: 5, inicio_dia: 4, fin_dia: 8, holgura_dias: 0, critica: true, predecesoras: ['T1'] },
        ],
      },
    });

    const tareas = await readSheet(buffer, 'Tareas');
    expect(tareas).not.toBeNull();
    expect(tareas![1]).toEqual(['T1', 'Excavacion', 3, 1, 3, 0, 'SI', '']);
    expect(tareas![2]).toEqual(['T2', 'Fundaciones', 5, 4, 8, 0, 'SI', 'T1']);
    expect(tareas!.length).toBe(3); // header + 2 tareas

    const resumen = await readSheet(buffer, 'Resumen');
    expect(resumen).not.toBeNull();
    // header + duracion + inicio + fin + camino_critico = 5 filas
    expect(resumen!.length).toBe(5);
  });

  it('genera curva con hoja Periodos y hoja Resumen', async () => {
    const buffer = await generarXlsx({
      tipo: 'curva',
      curva: {
        granularidad: 'semanal',
        duracion_total_dias: 14,
        costo_total_materiales: 700000,
        costo_total_mano_obra: 300000,
        costo_total_equipos: 0,
        costo_total_obra: 1000000,
        periodos: [
          {
            periodo: 1, inicio_dia: 1, fin_dia: 7, tareas_activas: ['T1'],
            costo_materiales: 100000, costo_mano_obra: 50000, costo_equipos: 0,
            costo_total: 150000, costo_acumulado: 150000, porcentaje_avance: 0,
          },
        ],
      },
    });

    const periodos = await readSheet(buffer, 'Periodos');
    expect(periodos).not.toBeNull();
    expect(periodos![1][0]).toBe(1); // periodo
    expect(periodos![1][2]).toBe('T1'); // tareas (despues de slice(1): Periodo=0, Dias=1, Tareas=2)
  });

  it('documento tira error (no se exporta)', async () => {
    await expect(
      generarXlsx({ tipo: 'documento' } as any)
    ).rejects.toThrow(/no se exporta/i);
  });
});

