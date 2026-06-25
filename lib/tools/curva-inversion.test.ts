import { describe, it, expect } from 'vitest';
import { calcularCurvaInversion } from './curva-inversion';

describe('calcularCurvaInversion', () => {
  it('caso simple: 1 tarea de 1 semana', () => {
    const r = calcularCurvaInversion({
      tareas: [
        {
          id: 'T1',
          nombre: 'Tarea',
          duracion_dias: 5,
          inicio_dia: 1,
          costo_materiales: 1000,
          costo_mano_obra: 500,
          costo_equipos: 0,
        },
      ],
    });

    expect(r.costo_total_materiales).toBe(1000);
    expect(r.costo_total_mano_obra).toBe(500);
    expect(r.costo_total_equipos).toBe(0);
    expect(r.costo_total_obra).toBe(1500);
    expect(r.duracion_total_dias).toBe(5);

    expect(r.periodos).toHaveLength(1);
    expect(r.periodos[0].costo_materiales).toBe(1000);
    expect(r.periodos[0].costo_mano_obra).toBe(500);
    expect(r.periodos[0].costo_total).toBe(1500);
    expect(r.periodos[0].costo_acumulado).toBe(1500);
    expect(r.periodos[0].porcentaje_avance).toBe(100);
  });

  it('caso 2 semanas: distribución estándar de materiales', () => {
    const r = calcularCurvaInversion({
      tareas: [
        {
          id: 'T1',
          nombre: 'Tarea 2 semanas',
          duracion_dias: 14,
          inicio_dia: 1,
          costo_materiales: 1000,
          costo_mano_obra: 1400,
          costo_equipos: 700,
        },
      ],
    });

    expect(r.periodos).toHaveLength(2);
    expect(r.periodos[0].costo_materiales).toBe(800);
    expect(r.periodos[1].costo_materiales).toBe(200);
    expect(r.periodos[0].costo_mano_obra).toBe(700);
    expect(r.periodos[1].costo_mano_obra).toBe(700);
    expect(r.periodos[0].costo_equipos).toBe(350);
    expect(r.periodos[1].costo_equipos).toBe(350);
    expect(r.periodos[0].porcentaje_avance).toBeCloseTo(59.7, 1);
    expect(r.periodos[1].porcentaje_avance).toBe(100);
  });

  it('múltiples tareas paralelas en el mismo periodo', () => {
    const r = calcularCurvaInversion({
      tareas: [
        {
          id: 'A',
          nombre: 'A',
          duracion_dias: 5,
          inicio_dia: 1,
          costo_materiales: 1000,
          costo_mano_obra: 500,
          costo_equipos: 0,
        },
        {
          id: 'B',
          nombre: 'B',
          duracion_dias: 3,
          inicio_dia: 1,
          costo_materiales: 600,
          costo_mano_obra: 300,
          costo_equipos: 0,
        },
      ],
    });

    expect(r.periodos).toHaveLength(1);
    expect(r.periodos[0].costo_materiales).toBe(1600);
    expect(r.periodos[0].costo_mano_obra).toBe(800);
    expect(r.periodos[0].tareas_activas).toEqual(['A', 'B']);
    expect(r.costo_total_obra).toBe(2400);
  });

  it('granularidad mensual agrupa correctamente', () => {
    const r = calcularCurvaInversion({
      tareas: [
        {
          id: 'T1',
          nombre: 'Tarea 45 días',
          duracion_dias: 45,
          inicio_dia: 1,
          costo_materiales: 3000,
          costo_mano_obra: 4500,
          costo_equipos: 0,
        },
      ],
      granularidad: 'mensual',
    });

    expect(r.granularidad).toBe('mensual');
    expect(r.periodos).toHaveLength(2);
    expect(r.periodos[0].inicio_dia).toBe(1);
    expect(r.periodos[0].fin_dia).toBe(30);
    expect(r.periodos[1].inicio_dia).toBe(31);
    expect(r.periodos[1].fin_dia).toBe(45);
    expect(r.costo_total_obra).toBe(7500);
  });

  it('distribución manual custom', () => {
    const r = calcularCurvaInversion({
      tareas: [
        {
          id: 'T1',
          nombre: 'Custom',
          duracion_dias: 14,
          inicio_dia: 1,
          costo_materiales: 1000,
          costo_mano_obra: 1000,
          costo_equipos: 0,
        },
      ],
      distribucion_materiales: 'manual',
      distribucion_materiales_manual: {
        T1: [50, 50],
      },
    });

    expect(r.periodos[0].costo_materiales).toBe(500);
    expect(r.periodos[1].costo_materiales).toBe(500);
    expect(r.periodos[0].costo_mano_obra).toBe(500);
    expect(r.periodos[1].costo_mano_obra).toBe(500);
  });

  it('rechaza distribución manual que no suma 100', () => {
    expect(() =>
      calcularCurvaInversion({
        tareas: [
          {
            id: 'T1',
            nombre: 'Custom',
            duracion_dias: 14,
            inicio_dia: 1,
            costo_materiales: 1000,
            costo_mano_obra: 0,
            costo_equipos: 0,
          },
        ],
        distribucion_materiales: 'manual',
        distribucion_materiales_manual: {
          T1: [60, 30],
        },
      })
    ).toThrow(/suma 90, debe sumar 100/);
  });

  it('rechaza lista vacía', () => {
    expect(() => calcularCurvaInversion({ tareas: [] })).toThrow(/al menos una tarea/);
  });

  it('rechaza duracion <= 0', () => {
    expect(() =>
      calcularCurvaInversion({
        tareas: [
          {
            id: 'T1',
            nombre: 'T1',
            duracion_dias: 0,
            inicio_dia: 1,
            costo_materiales: 100,
            costo_mano_obra: 100,
            costo_equipos: 0,
          },
        ],
      })
    ).toThrow(/duracion_dias > 0/);
  });

  it('rechaza costos negativos', () => {
    expect(() =>
      calcularCurvaInversion({
        tareas: [
          {
            id: 'T1',
            nombre: 'T1',
            duracion_dias: 5,
            inicio_dia: 1,
            costo_materiales: -100,
            costo_mano_obra: 100,
            costo_equipos: 0,
          },
        ],
      })
    ).toThrow(/costos negativos/);
  });
});
