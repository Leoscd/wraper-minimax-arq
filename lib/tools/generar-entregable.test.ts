import { describe, it, expect } from 'vitest';
import {
  generarEntregable,
  getEntregablePorId,
  type GenerarEntregableInput,
} from './generar-entregable';
import type { ProyectoInput, RubrosInput } from '../types';

const baseProyecto: ProyectoInput = {
  nombre: 'Casa Test',
  subtitulo: 'Subtítulo',
  descripcion: 'Descripcion del proyecto de prueba para tests de generar entregable.',
  arquitecto: 'Arq. Test',
  estudio: 'Estudio Test',
  ubicacion: 'Tucumán, Argentina',
  año: '2026',
  estado: 'Proyecto ejecutivo',
  email: 'test@example.com',
};

const baseRubros: RubrosInput = {
  rubros: [
    {
      numero: '01',
      nombre: 'Hormigón H-21',
      cantidad: 10,
      precio_unitario_mat: 150000,
      precio_unitario_mo: 50000,
      materiales: 1500000,
      mano_de_obra: 500000,
      total: 2000000,
      incidencia: '50%',
    },
    {
      numero: '02',
      nombre: 'Acero Ø12',
      cantidad: 50,
      precio_unitario_mat: 30000,
      precio_unitario_mo: 10000,
      materiales: 1500000,
      mano_de_obra: 500000,
      total: 2000000,
      incidencia: '50%',
    },
  ],
  totales: {
    materiales: 3000000,
    mano_de_obra: 1000000,
    total_obra: 4000000,
  },
};

describe('generarEntregable - presupuesto', () => {
  it('genera HTML con id, filename y url', () => {
    const input: GenerarEntregableInput = {
      tipo: 'presupuesto',
      proyecto: baseProyecto,
      rubros: baseRubros,
      numero_presupuesto: '2026-001',
      fecha: 'Julio 2026',
      cliente: 'Cliente Test',
    };

    const r = generarEntregable(input);

    expect(r.id).toMatch(/^ent_/);
    expect(r.tipo).toBe('presupuesto');
    expect(r.filename).toMatch(/^casa-test-presupuesto-\d{4}-\d{2}-\d{2}\.html$/);
    expect(r.url).toBe(`/preview/${r.id}`);
    expect(r.html).toContain('<!DOCTYPE html>');
    expect(r.html).toContain('Casa Test');
    expect(r.html).toContain('2026-001');
    expect(r.html).toContain('Hormigón H-21');
    expect(r.html).toContain('Julio 2026');
  });

  it('incluye notas técnicas si se pasan', () => {
    const r = generarEntregable({
      tipo: 'presupuesto',
      proyecto: baseProyecto,
      rubros: baseRubros,
      numero_presupuesto: '2026-001',
      fecha: 'Julio 2026',
      notas_tecnicas: ['Hormigón elaborado H-21', 'Acero ADN-420'],
    });

    expect(r.html).toContain('Hormigón elaborado H-21');
    expect(r.html).toContain('Acero ADN-420');
  });

  it('guarda el entregable en el store y se recupera por id', () => {
    const r = generarEntregable({
      tipo: 'presupuesto',
      proyecto: baseProyecto,
      rubros: baseRubros,
      numero_presupuesto: '2026-001',
      fecha: 'Julio 2026',
    });

    const retrieved = getEntregablePorId(r.id);
    expect(retrieved).toEqual(r);
  });

  it('devuelve null si el id no existe en el store', () => {
    expect(getEntregablePorId('id-inexistente')).toBeNull();
  });

  it('el message menciona el nombre del proyecto y la cantidad de rubros', () => {
    const r = generarEntregable({
      tipo: 'presupuesto',
      proyecto: baseProyecto,
      rubros: baseRubros,
      numero_presupuesto: '2026-001',
      fecha: 'Julio 2026',
    });

    expect(r.message).toContain('Casa Test');
    expect(r.message).toContain('2 rubros');
  });
});

describe('generarEntregable - tipos pendientes (Pasos B y D)', () => {
  const cronogramaOutput = {
    duracion_total_dias: 18,
    fin_proyecto_dia: 18,
    camino_critico: ['T1', 'T2', 'T3'],
    tareas: [
      {
        id: 'T1', nombre: 'T1', duracion_dias: 3, inicio_dia: 1, fin_dia: 3,
        holgura_dias: 0, critica: true, predecesoras: [],
      },
    ],
  };
  const curvaOutput = {
    granularidad: 'semanal' as const,
    duracion_total_dias: 14,
    costo_total_materiales: 700000,
    costo_total_mano_obra: 300000,
    costo_total_equipos: 0,
    costo_total_obra: 1000000,
    periodos: [
      {
        periodo: 1, inicio_dia: 1, fin_dia: 7, tareas_activas: ['T1'],
        costo_materiales: 100000, costo_mano_obra: 50000, costo_equipos: 0,
        costo_total: 150000, costo_acumulado: 150000, porcentaje_avance: 15,
      },
    ],
  };

  it('cronograma genera HTML real con Gantt (Paso B done)', () => {
    const r = generarEntregable({
      tipo: 'cronograma',
      proyecto: { nombre: 'Casa X', ubicacion: 'Tucumán', año: '2026' },
      cronograma: cronogramaOutput,
    } as unknown as GenerarEntregableInput);

    expect(r.tipo).toBe('cronograma');
    expect(r.id).toMatch(/^ent_/);
    expect(r.id).not.toBe('pending');
    expect(r.html).toContain('Casa X');
    expect(r.html).toContain('gantt-row');
    expect(r.html).toContain('T1');
    expect(r.message).toMatch(/18 días/);
  });

  it('curva genera HTML real con curva S (Paso B done)', () => {
    const r = generarEntregable({
      tipo: 'curva',
      proyecto: { nombre: 'Casa X', ubicacion: 'Tucumán', año: '2026' },
      curva: curvaOutput,
    } as unknown as GenerarEntregableInput);

    expect(r.tipo).toBe('curva');
    expect(r.id).toMatch(/^ent_/);
    expect(r.id).not.toBe('pending');
    expect(r.html).toContain('Casa X');
    expect(r.html).toContain('<svg');
    expect(r.html).toContain('P1');
  });

  it('documento devuelve placeholder hasta Paso D', () => {
    const r = generarEntregable({
      tipo: 'documento',
      proyecto: { nombre: 'X', ubicacion: 'Y', año: '2026' },
      titulo: 'Memoria',
      contenido_md: 'texto',
    } as unknown as GenerarEntregableInput);

    expect(r.tipo).toBe('documento');
    expect(r.id).toBe('pending');
    expect(r.message).toMatch(/Paso D/i);
  });
});
