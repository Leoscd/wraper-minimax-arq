/**
 * Tests del ejecutor central de tools (lib/tools/ejecutar.ts).
 *
 * Verifica que el routing por nombre llegue a la tool correcta y que un nombre
 * desconocido degrade a `{ error }` en vez de tirar (M3 recibe el feedback).
 */

import { describe, it, expect, vi } from 'vitest';
import { ejecutarTool } from './ejecutar';

describe('ejecutarTool', () => {
  it('rutea buscar_precio y devuelve resultados', async () => {
    const r = (await ejecutarTool('buscar_precio', { termino: 'cemento' })) as {
      resultados?: unknown[];
    };
    expect(r).toBeTypeOf('object');
    expect(Array.isArray(r.resultados)).toBe(true);
  });

  it('rutea calcular_hormigon y devuelve un cómputo', async () => {
    const r = (await ejecutarTool('calcular_hormigon', {
      volumen_m3: 5,
      clase: 'H-21',
      elaborado: true,
      con_bomba: false,
      humedad_aridos: 'normales',
    })) as Record<string, unknown>;
    expect(r).toBeTypeOf('object');
    expect(r.error).toBeUndefined();
  });

  it('nombre desconocido devuelve { error } sin tirar', async () => {
    const r = (await ejecutarTool('tool_inexistente', {})) as { error?: string };
    expect(r.error).toContain('tool_inexistente');
  });

  it('el contexto con precios propios llega a buscar_precio', async () => {
    const r = (await ejecutarTool(
      'buscar_precio',
      { termino: 'membrana especial' },
      { preciosPropios: [{ descripcion: 'Membrana especial x rollo', precio: 45000 }] }
    )) as { resultados: Array<{ fuente: string; precio: number }> };
    expect(r.resultados).toHaveLength(1);
    expect(r.resultados[0].fuente).toBe('lista_propia');
    expect(r.resultados[0].precio).toBe(45000);
  });

  it('sin contexto buscar_precio sigue funcionando igual', async () => {
    const r = (await ejecutarTool('buscar_precio', { termino: 'cemento' })) as {
      resultados: Array<{ fuente: string }>;
    };
    expect(r.resultados.length).toBeGreaterThan(0);
    expect(r.resultados.every((x) => x.fuente === 'dataset')).toBe(true);
  });

  it('rutea buscar_precio_web (sin key devuelve error estructurado)', async () => {
    vi.stubEnv('SERPER_API_KEY', '');
    try {
      const r = (await ejecutarTool('buscar_precio_web', {
        termino: 'cemento portland 50kg',
      })) as { error?: string };
      expect(r.error).toBe('busqueda_web_no_configurada');
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
