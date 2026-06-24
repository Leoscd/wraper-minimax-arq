import { describe, it, expect } from 'vitest';
import { calcularHierroLongitudinal } from './hierro';

describe('calcularHierroLongitudinal', () => {
  it('caso simple: columna 3m con 4Ø12, sin empalme', () => {
    const r = calcularHierroLongitudinal({
      cantidad_barras: 4,
      longitud_elemento_m: 3,
      diametro_mm: 12,
    });

    expect(r.requiere_empalme).toBe(false);
    expect(r.empalme_m).toBe(0);
    expect(r.longitud_efectiva_por_barra_m).toBe(12);
    expect(r.barras_por_posicion).toBe(1);
    expect(r.barras_totales_sin_desperdicio).toBe(4);
    expect(r.barras_totales_con_desperdicio).toBe(5);
    expect(r.peso_por_barra_kg).toBeCloseTo(10.66, 2);
    expect(r.peso_total_kg).toBeCloseTo(53.3, 1);
  });

  it('caso con empalme: viga 15m con 4Ø12 (>12m requiere empalme)', () => {
    const r = calcularHierroLongitudinal({
      cantidad_barras: 4,
      longitud_elemento_m: 15,
      diametro_mm: 12,
    });

    expect(r.requiere_empalme).toBe(true);
    expect(r.empalme_m).toBe(0.48);
    expect(r.longitud_efectiva_por_barra_m).toBeCloseTo(11.52, 2);
    expect(r.barras_por_posicion).toBe(2);
  });

  it('rechaza diámetro no soportado', () => {
    expect(() =>
      calcularHierroLongitudinal({
        cantidad_barras: 4,
        longitud_elemento_m: 3,
        diametro_mm: 15,
      })
    ).toThrow(/Diámetro 15mm no soportado/);
  });

  it('peso total para 52 barras de Ø12 (caso Losa 50m²)', () => {
    const r = calcularHierroLongitudinal({
      cantidad_barras: 52,
      longitud_elemento_m: 6,
      diametro_mm: 12,
    });

    expect(r.requiere_empalme).toBe(false);
    expect(r.barras_por_posicion).toBe(1);
    expect(r.barras_totales_sin_desperdicio).toBe(52);
    expect(r.barras_totales_con_desperdicio).toBe(57);
  });
});
