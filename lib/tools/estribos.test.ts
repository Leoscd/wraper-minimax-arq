import { describe, it, expect } from 'vitest';
import { calcularEstribos } from './estribos';

describe('calcularEstribos', () => {
  it('caso columna 20x20cm, h=3m, estribos Ø6 c/15cm, rec=2.5cm', () => {
    const r = calcularEstribos({
      longitud_elemento_m: 3,
      seccion_base_m: 0.2,
      seccion_altura_m: 0.2,
      diametro_estribo_mm: 6,
      separacion_m: 0.15,
      recubrimiento_m: 0.025,
    });

    expect(r.cantidad_estribos).toBe(21);
    expect(r.perimetro_por_estribo_m).toBeCloseTo(0.72, 3);
    expect(r.longitud_total_ml).toBeCloseTo(15.12, 2);
    expect(r.barras_6m_necesarias).toBe(3);
    expect(r.barras_con_desperdicio).toBe(4);
    expect(r.ganchos_por_estribo_m).toBe(0.12);
  });

  it('caso viga 30x40cm, h=5m, estribos Ø6 c/20cm, rec=2.5cm', () => {
    const r = calcularEstribos({
      longitud_elemento_m: 5,
      seccion_base_m: 0.3,
      seccion_altura_m: 0.4,
      diametro_estribo_mm: 6,
      separacion_m: 0.2,
      recubrimiento_m: 0.025,
    });

    expect(r.cantidad_estribos).toBe(26);
    expect(r.perimetro_por_estribo_m).toBeCloseTo(1.32, 2);
    expect(r.longitud_total_ml).toBeCloseTo(34.32, 2);
    expect(r.barras_6m_necesarias).toBe(6);
    expect(r.barras_con_desperdicio).toBe(7);
  });

  it('acepta estribos Ø8 con peso mayor', () => {
    const r = calcularEstribos({
      longitud_elemento_m: 3,
      seccion_base_m: 0.3,
      seccion_altura_m: 0.3,
      diametro_estribo_mm: 8,
      separacion_m: 0.15,
      recubrimiento_m: 0.025,
    });

    expect(r.ganchos_por_estribo_m).toBe(0.16);
    expect(r.peso_total_kg).toBeGreaterThan(0);
  });

  it('rechaza recubrimiento mayor a media dimensión', () => {
    expect(() =>
      calcularEstribos({
        longitud_elemento_m: 3,
        seccion_base_m: 0.2,
        seccion_altura_m: 0.2,
        diametro_estribo_mm: 6,
        separacion_m: 0.15,
        recubrimiento_m: 0.15,
      })
    ).toThrow(/Dimensiones interiores inválidas/);
  });

  it('rechaza diámetro que no sea 6 u 8', () => {
    expect(() =>
      calcularEstribos({
        longitud_elemento_m: 3,
        seccion_base_m: 0.2,
        seccion_altura_m: 0.2,
        diametro_estribo_mm: 10 as never,
        separacion_m: 0.15,
        recubrimiento_m: 0.025,
      })
    ).toThrow(/6 u 8/);
  });
});
