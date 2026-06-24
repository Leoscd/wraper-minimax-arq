import { describe, it, expect } from 'vitest';
import { calcularMamposteria } from './mamposteria';

describe('calcularMamposteria', () => {
  it('ladrillo hueco 12cm en 100m²', () => {
    const r = calcularMamposteria({
      tipo_ladrillo: 'ladrillo_hueco_12',
      area_m2: 100,
    });

    expect(r.ladrillos_por_m2).toBe(13);
    expect(r.ladrillos_sin_desperdicio).toBe(1300);
    expect(r.ladrillos_totales).toBe(1391);
  });

  it('ladrillo común 15cm en 50m² (pedir por millar)', () => {
    const r = calcularMamposteria({
      tipo_ladrillo: 'ladrillo_comun_15',
      area_m2: 50,
    });

    expect(r.ladrillos_por_m2).toBe(60);
    expect(r.ladrillos_sin_desperdicio).toBe(3000);
    expect(r.unidad).toContain('millar');
  });

  it('bloque hormigón 20cm en 30m²', () => {
    const r = calcularMamposteria({
      tipo_ladrillo: 'bloque_hormigon_20',
      area_m2: 30,
    });

    expect(r.ladrillos_por_m2).toBe(12.5);
    expect(r.ladrillos_sin_desperdicio).toBe(375);
  });
});
