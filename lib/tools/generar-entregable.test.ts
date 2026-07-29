import { describe, it, expect } from 'vitest';
import {
  generarEntregable,
  getEntregablePorId,
  type GenerarEntregableInput,
  type GenerarEntregableOutput,
} from './generar-entregable';
import type { ProyectoInput, RubrosInput } from '../types';

/** Invoca la tool y narrowea el union: acá esperamos un entregable válido. */
function gen(input: GenerarEntregableInput): GenerarEntregableOutput {
  const r = generarEntregable(input);
  if ('error' in r) throw new Error(`input inválido: ${r.mensaje}`);
  return r;
}

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

    const r = gen(input);

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
    const r = gen({
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
    const r = gen({
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

  it('rubros con estructura incorrecta devuelve error estructurado, no throw', () => {
    // El caso real que falló en el chat: el modelo mandó un array plano
    // en vez de { rubros: [...], totales: {...} }.
    const r = generarEntregable({
      tipo: 'presupuesto',
      proyecto: baseProyecto,
      rubros: [{ nombre: 'Hormigón', total: 100 }],
      numero_presupuesto: '2026-001',
      fecha: 'Julio 2026',
    } as unknown as GenerarEntregableInput);

    expect('error' in r && r.error).toBe('entregable_input_invalido');
    expect('mensaje' in r && r.mensaje).toContain('rubros.rubros');
    expect('mensaje' in r && r.mensaje).toContain('totales');
  });

  it('proyecto sin campos obligatorios devuelve error que los nombra', () => {
    const r = generarEntregable({
      tipo: 'presupuesto',
      proyecto: { nombre: 'Casa X' },
      rubros: baseRubros,
      numero_presupuesto: '2026-001',
      fecha: 'Julio 2026',
    } as unknown as GenerarEntregableInput);

    expect('error' in r && r.error).toBe('entregable_input_invalido');
    expect('mensaje' in r && r.mensaje).toContain('proyecto.arquitecto');
    expect('mensaje' in r && r.mensaje).toContain('proyecto.ubicacion');
  });

  it('acepta el shape real de MiniMax: totales al nivel raíz y montos como strings', () => {
    // Input textual capturado del log del chat (2026-07-10): el modelo puso
    // "totales" fuera de "rubros" y los montos de totales como strings.
    const r = gen({
      fecha: '10/07/2026',
      numero_presupuesto: 'PRES-2026-001',
      proyecto: { arquitecto: 'Leo Díaz', nombre: 'Casa Pérez', ubicacion: 'Salta' },
      rubros: {
        rubros: [
          {
            cantidad: 10,
            incidencia: '100%',
            mano_de_obra: 500000,
            materiales: 1500000,
            nombre: 'Hormigón H-21',
            numero: '01',
            precio_unitario_mat: 150000,
            precio_unitario_mo: 50000,
            total: 2000000,
            unidad: 'm³',
          },
        ],
      },
      tipo: 'presupuesto',
      totales: {
        mano_de_obra: '500000',
        materiales: '1500000',
        total_obra: '2000000',
      },
    } as unknown as GenerarEntregableInput);

    expect(r.tipo).toBe('presupuesto');
    expect(r.html).toContain('Casa Pérez');
    expect(r.html).toContain('Hormigón H-21');
    expect(r.message).toContain('total 2000000');
  });

  it('acepta rubros como array plano con totales al nivel raíz', () => {
    const r = gen({
      tipo: 'presupuesto',
      proyecto: { nombre: 'Casa Z', arquitecto: 'Arq', ubicacion: 'Salta' },
      rubros: [
        {
          numero: '01',
          nombre: 'Mampostería',
          cantidad: 50,
          precio_unitario_mat: 10000,
          precio_unitario_mo: 8000,
          total: 900000,
        },
      ],
      totales: { materiales: 500000, mano_de_obra: 400000, total_obra: 900000 },
      numero_presupuesto: 'PRES-2026-003',
      fecha: '10/07/2026',
    } as unknown as GenerarEntregableInput);

    expect(r.html).toContain('Mampostería');
  });

  it('tolera numero como number y campos secundarios ausentes', () => {
    const r = gen({
      tipo: 'presupuesto',
      proyecto: {
        nombre: 'Casa Y',
        arquitecto: 'Arq. Test',
        ubicacion: 'Salta',
      },
      rubros: {
        rubros: [
          {
            numero: 1,
            nombre: 'Hormigón H-21',
            cantidad: 10,
            precio_unitario_mat: 150000,
            precio_unitario_mo: 50000,
            total: 2000000,
          },
        ],
        totales: { materiales: 1500000, mano_de_obra: 500000, total_obra: 2000000 },
      },
      numero_presupuesto: '2026-002',
      fecha: 'Julio 2026',
    } as unknown as GenerarEntregableInput);

    expect(r.html).toContain('Hormigón H-21');
    expect(r.html).toContain('Casa Y');
  });

  it('el message menciona el nombre del proyecto y la cantidad de rubros', () => {
    const r = gen({
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
    const r = gen({
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
    const r = gen({
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

  it('documento genera HTML real con markdown (Paso D done)', () => {
    const r = gen({
      tipo: 'documento',
      proyecto: { nombre: 'Casa X', ubicacion: 'Tucumán', año: '2026' },
      titulo: 'Memoria técnica',
      subtitulo: 'Subtítulo de prueba',
      contenido_md:
        '# Objetivo\n\nConstruir una casa en **CABA**.\n\n## Tareas\n\n- item 1\n- item 2',
    } as unknown as GenerarEntregableInput);

    expect(r.tipo).toBe('documento');
    expect(r.id).toMatch(/^ent_/);
    expect(r.id).not.toBe('pending');
    expect(r.html).toContain('Casa X');
    expect(r.html).toContain('Memoria técnica');
    expect(r.html).toContain('Subtítulo de prueba');
    expect(r.html).toContain('<h1');
    expect(r.html).toContain('<strong>CABA</strong>');
    expect(r.html).toContain('<ul');
    expect(r.message).toMatch(/Documento .* generado/);
  });
});
