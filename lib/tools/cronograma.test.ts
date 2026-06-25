import { describe, it, expect } from 'vitest';
import { calcularCronograma } from './cronograma';

describe('calcularCronograma', () => {
  it('caso simple: 3 tareas en serie', () => {
    const r = calcularCronograma({
      tareas: [
        { id: 'T1', nombre: 'Excavación', duracion_dias: 3 },
        { id: 'T2', nombre: 'Fundaciones', duracion_dias: 5, predecesoras: ['T1'] },
        { id: 'T3', nombre: 'Estructura', duracion_dias: 10, predecesoras: ['T2'] },
      ],
    });

    expect(r.duracion_total_dias).toBe(18);
    expect(r.inicio_proyecto_dia).toBe(1);
    expect(r.fin_proyecto_dia).toBe(18);
    expect(r.tareas[0].inicio_dia).toBe(1);
    expect(r.tareas[0].fin_dia).toBe(3);
    expect(r.tareas[1].inicio_dia).toBe(4);
    expect(r.tareas[1].fin_dia).toBe(8);
    expect(r.tareas[2].inicio_dia).toBe(9);
    expect(r.tareas[2].fin_dia).toBe(18);

    r.tareas.forEach((t) => expect(t.critica).toBe(true));
    expect(r.camino_critico).toEqual(['T1', 'T2', 'T3']);
  });

  it('caso paralelo: tareas con y sin holgura', () => {
    const r = calcularCronograma({
      tareas: [
        { id: 'A', nombre: 'Tarea A', duracion_dias: 5 },
        { id: 'B', nombre: 'Tarea B', duracion_dias: 3, predecesoras: ['A'] },
        { id: 'C', nombre: 'Tarea C (paralela)', duracion_dias: 8, predecesoras: ['A'] },
        { id: 'D', nombre: 'Tarea D', duracion_dias: 4, predecesoras: ['B', 'C'] },
      ],
    });

    expect(r.duracion_total_dias).toBe(17);
    expect(r.fin_proyecto_dia).toBe(17);

    const tareaB = r.tareas.find((t) => t.id === 'B')!;
    const tareaC = r.tareas.find((t) => t.id === 'C')!;
    expect(tareaB.inicio_dia).toBe(6);
    expect(tareaB.fin_dia).toBe(8);
    expect(tareaC.inicio_dia).toBe(6);
    expect(tareaC.fin_dia).toBe(13);

    expect(tareaB.holgura_dias).toBeGreaterThan(0);
    expect(tareaB.critica).toBe(false);

    expect(tareaC.holgura_dias).toBe(0);
    expect(tareaC.critica).toBe(true);

    const tareaD = r.tareas.find((t) => t.id === 'D')!;
    expect(tareaD.inicio_dia).toBe(14);
    expect(tareaD.critica).toBe(true);
  });

  it('rechaza IDs duplicados', () => {
    expect(() =>
      calcularCronograma({
        tareas: [
          { id: 'T1', nombre: 'A', duracion_dias: 1 },
          { id: 'T1', nombre: 'B', duracion_dias: 2 },
        ],
      })
    ).toThrow(/ID de tarea duplicado/);
  });

  it('rechaza predecesora inexistente', () => {
    expect(() =>
      calcularCronograma({
        tareas: [
          { id: 'T1', nombre: 'A', duracion_dias: 1, predecesoras: ['NOEXISTE'] },
        ],
      })
    ).toThrow(/predecesora "NOEXISTE" que no existe/);
  });

  it('rechaza dependencias circulares', () => {
    expect(() =>
      calcularCronograma({
        tareas: [
          { id: 'A', nombre: 'A', duracion_dias: 1, predecesoras: ['B'] },
          { id: 'B', nombre: 'B', duracion_dias: 1, predecesoras: ['A'] },
        ],
      })
    ).toThrow(/Dependencia circular/);
  });

  it('rechaza lista vacía de tareas', () => {
    expect(() => calcularCronograma({ tareas: [] })).toThrow(/al menos una tarea/);
  });

  it('rechaza duracion <= 0', () => {
    expect(() =>
      calcularCronograma({
        tareas: [{ id: 'A', nombre: 'A', duracion_dias: 0 }],
      })
    ).toThrow(/duracion_dias > 0/);
  });

  it('respeta inicio_proyecto_dia custom', () => {
    const r = calcularCronograma({
      tareas: [{ id: 'A', nombre: 'A', duracion_dias: 5 }],
      inicio_proyecto_dia: 10,
    });
    expect(r.inicio_proyecto_dia).toBe(10);
    expect(r.tareas[0].inicio_dia).toBe(10);
    expect(r.tareas[0].fin_dia).toBe(14);
  });
});
