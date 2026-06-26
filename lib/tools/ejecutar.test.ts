/**
 * Tests del ejecutor central de tools (lib/tools/ejecutar.ts).
 *
 * Verifica que el routing por nombre llegue a la tool correcta y que un nombre
 * desconocido degrade a `{ error }` en vez de tirar (M3 recibe el feedback).
 */

import { describe, it, expect } from 'vitest';
import { ejecutarTool } from './ejecutar';

describe('ejecutarTool', () => {
  it('rutea buscar_precio y devuelve resultados', () => {
    const r = ejecutarTool('buscar_precio', { termino: 'cemento' }) as {
      resultados?: unknown[];
    };
    expect(r).toBeTypeOf('object');
    expect(Array.isArray(r.resultados)).toBe(true);
  });

  it('rutea calcular_hormigon y devuelve un cómputo', () => {
    const r = ejecutarTool('calcular_hormigon', {
      volumen_m3: 5,
      clase: 'H-21',
      elaborado: true,
      con_bomba: false,
      humedad_aridos: 'normales',
    }) as Record<string, unknown>;
    expect(r).toBeTypeOf('object');
    expect(r.error).toBeUndefined();
  });

  it('nombre desconocido devuelve { error } sin tirar', () => {
    const r = ejecutarTool('tool_inexistente', {}) as { error?: string };
    expect(r.error).toContain('tool_inexistente');
  });
});
