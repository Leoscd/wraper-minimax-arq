import { describe, it, expect } from 'vitest';
import { aplicarDesperdicio } from './desperdicios';

describe('aplicarDesperdicio', () => {
  it('aplica factor 1.05 para cemento', () => {
    const r = aplicarDesperdicio({ material: 'cemento', cantidad_calculada: 100 });
    expect(r.factor).toBe(1.05);
    expect(r.cantidad_final).toBe(105);
  });

  it('aplica factor 1.08 para acero', () => {
    const r = aplicarDesperdicio({ material: 'acero', cantidad_calculada: 100 });
    expect(r.factor).toBe(1.08);
    expect(r.cantidad_final).toBe(108);
  });

  it('aplica factor 1.12 para mortero Plasticor', () => {
    const r = aplicarDesperdicio({ material: 'mortero', cantidad_calculada: 50 });
    expect(r.factor).toBe(1.12);
    expect(r.cantidad_final).toBe(56);
  });

  it('acepta alias de material', () => {
    const r1 = aplicarDesperdicio({ material: 'hierro', cantidad_calculada: 10 });
    const r2 = aplicarDesperdicio({ material: 'ladrillo', cantidad_calculada: 10 });
    const r3 = aplicarDesperdicio({ material: 'ceramico', cantidad_calculada: 10 });

    expect(r1.material).toBe('acero_barras');
    expect(r2.material).toBe('ladrillos_huecos');
    expect(r3.material).toBe('ceramicos_porcellanato');
  });

  it('rechaza material desconocido', () => {
    expect(() =>
      aplicarDesperdicio({ material: 'inexistente', cantidad_calculada: 10 })
    ).toThrow(/Material no encontrado/);
  });

  it('rechaza cantidad negativa', () => {
    expect(() =>
      aplicarDesperdicio({ material: 'cemento', cantidad_calculada: -1 })
    ).toThrow(/cantidad_calculada debe ser >= 0/);
  });
});
