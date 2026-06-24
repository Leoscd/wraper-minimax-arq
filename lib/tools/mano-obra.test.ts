import { describe, it, expect } from 'vitest';
import { calcularManoObra } from './mano-obra';

describe('calcularManoObra', () => {
  it('ejemplo del SKILL: excavación 5m³', () => {
    const r = calcularManoObra({
      tarea: 'Excavación para bases',
      cantidad: 5,
      horas_oficial_por_unidad: 0.8,
      horas_ayudante_por_unidad: 4.0,
      tarifa_oficial_por_hora: 4500,
      tarifa_ayudante_por_hora: 3500,
      asig_no_remunerativa_oficial_por_hora: 500,
      asig_no_remunerativa_ayudante_por_hora: 400,
      porcentaje_cargas_sociales: 125.21,
    });

    expect(r.horas_oficial_total).toBe(4);
    expect(r.horas_ayudante_total).toBe(20);
    expect(r.costo_base_oficial).toBe(18000);
    expect(r.costo_base_ayudante).toBe(70000);
    expect(r.costo_base_total).toBe(88000);
    expect(r.cargas_sociales_monto).toBeCloseTo(110184.8, 1);
    expect(r.asignaciones_monto).toBe(10000);
    expect(r.costo_total).toBeCloseTo(208184.8, 1);
  });

  it('excluye cargas sociales si se pide', () => {
    const r = calcularManoObra({
      tarea: 'Test',
      cantidad: 1,
      horas_oficial_por_unidad: 1,
      horas_ayudante_por_unidad: 0,
      tarifa_oficial_por_hora: 1000,
      tarifa_ayudante_por_hora: 0,
      porcentaje_cargas_sociales: 100,
      incluir_cargas_sociales: false,
    });

    expect(r.cargas_sociales_monto).toBe(0);
    expect(r.costo_total).toBe(1000);
  });

  it('rechaza cantidad <= 0', () => {
    expect(() =>
      calcularManoObra({
        tarea: 'Test',
        cantidad: 0,
        horas_oficial_por_unidad: 1,
        horas_ayudante_por_unidad: 0,
        tarifa_oficial_por_hora: 1000,
        tarifa_ayudante_por_hora: 0,
        porcentaje_cargas_sociales: 100,
      })
    ).toThrow(/cantidad debe ser > 0/);
  });
});
