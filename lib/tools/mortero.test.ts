import { describe, it, expect } from 'vitest';
import { calcularMorteroRevoque } from './mortero';

describe('calcularMorteroRevoque', () => {
  it('revoque grueso 1.5cm para 100m²', () => {
    const r = calcularMorteroRevoque({
      tipo: 'revoque_grueso',
      area_m2: 100,
      espesor_grueso_cm: 1.5,
    });

    expect(r.detalles.revoque_grueso?.espesor_cm).toBe(1.5);
    expect(r.detalles.revoque_grueso?.rendimiento_m2_por_bolsa).toBe(4);
    expect(r.bolsas_total).toBe(28);
  });

  it('revoque fino sobre grueso irregular para 100m²', () => {
    const r = calcularMorteroRevoque({
      tipo: 'revoque_fino',
      area_m2: 100,
      sustrato_fino: 'sobre_grueso_irregular',
    });

    expect(r.detalles.revoque_fino?.rendimiento_m2_por_bolsa).toBe(8);
    expect(r.bolsas_total).toBe(14);
  });

  it('revoque completo: grueso 1.5cm + fino para 100m²', () => {
    const r = calcularMorteroRevoque({
      tipo: 'revoque_completo',
      area_m2: 100,
      espesor_grueso_cm: 1.5,
      sustrato_fino: 'sobre_grueso_irregular',
    });

    expect(r.bolsas_total).toBe(28 + 14);
    expect(r.detalles.revoque_grueso).toBeDefined();
    expect(r.detalles.revoque_fino).toBeDefined();
  });

  it('contrapiso 10cm para 50m²', () => {
    const r = calcularMorteroRevoque({
      tipo: 'contrapiso',
      area_m2: 50,
      espesor_contrapiso_cm: 10,
    });

    expect(r.detalles.contrapiso?.espesor_cm).toBe(10);
    expect(r.detalles.contrapiso?.m3).toBe(5);
    expect(r.bolsas_total).toBeGreaterThan(20);
  });
});
