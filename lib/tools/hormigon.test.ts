import { describe, it, expect } from 'vitest';
import { calcularHormigon } from './hormigon';

describe('calcularHormigon', () => {
  it('calcula H-21 estándar para 1 m³', () => {
    const result = calcularHormigon({
      volumen_m3: 1,
      clase: 'H-21',
      elaborado: true,
      con_bomba: false,
      humedad_aridos: 'normales',
    });

    expect(result.clase).toBe('H-21');
    expect(result.volumen_m3).toBe(1);
    expect(result.factor_desperdicio).toBe(1.05);
    expect(result.volumen_real_m3).toBe(1.05);

    expect(result.materiales.cemento_kg).toBeCloseTo(336, 0);
    expect(result.materiales.cemento_bolsas_50kg).toBe(7);
    expect(result.materiales.arena_gruesa_m3).toBeCloseTo(0.5616, 4);
    expect(result.materiales.ripio_m3).toBeCloseTo(0.7776, 4);
    expect(result.materiales.agua_litros).toBe(190);
  });

  it('suma 10% de cemento si se usa bomba', () => {
    const result = calcularHormigon({
      volumen_m3: 1,
      clase: 'H-21',
      elaborado: true,
      con_bomba: true,
      humedad_aridos: 'normales',
    });

    expect(result.materiales.cemento_kg).toBeCloseTo(369.6, 1);
    expect(result.notas).toContain('Bomba: +10% cemento aplicado');
  });

  it('rechaza bomba para H-13', () => {
    expect(() =>
      calcularHormigon({
        volumen_m3: 1,
        clase: 'H-13',
        elaborado: true,
        con_bomba: true,
        humedad_aridos: 'normales',
      })
    ).toThrow(/H-13 no es apto para bomba/);
  });

  it('usa factor 1.08 para hormigón in situ', () => {
    const result = calcularHormigon({
      volumen_m3: 1,
      clase: 'H-21',
      elaborado: false,
      con_bomba: false,
      humedad_aridos: 'normales',
    });

    expect(result.factor_desperdicio).toBe(1.08);
    expect(result.volumen_real_m3).toBe(1.08);
  });

  it('ajusta agua según humedad de áridos', () => {
    const secos = calcularHormigon({
      volumen_m3: 1,
      clase: 'H-21',
      elaborado: true,
      con_bomba: false,
      humedad_aridos: 'secos',
    });
    const humedos = calcularHormigon({
      volumen_m3: 1,
      clase: 'H-21',
      elaborado: true,
      con_bomba: false,
      humedad_aridos: 'humedos',
    });

    expect(secos.materiales.agua_litros).toBe(200);
    expect(humedos.materiales.agua_litros).toBe(180);
  });

  it('rechaza volumen <= 0', () => {
    expect(() =>
      calcularHormigon({
        volumen_m3: 0,
        clase: 'H-21',
        elaborado: true,
        con_bomba: false,
        humedad_aridos: 'normales',
      })
    ).toThrow(/volumen_m3 debe ser > 0/);
  });

  it('rechaza clase inválida', () => {
    expect(() =>
      calcularHormigon({
        volumen_m3: 1,
        clase: 'H-99' as never,
        elaborado: true,
        con_bomba: false,
        humedad_aridos: 'normales',
      })
    ).toThrow(/Clase de hormigón inválida/);
  });

  it('usa H-21 por default si no se especifica', () => {
    const result = calcularHormigon({
      volumen_m3: 7.5,
      clase: 'H-21',
      elaborado: true,
      con_bomba: false,
      humedad_aridos: 'normales',
    });

    expect(result.clase).toBe('H-21');
    expect(result.materiales.cemento_bolsas_50kg).toBeGreaterThan(40);
    expect(result.materiales.cemento_bolsas_50kg).toBeLessThan(60);
  });
});
