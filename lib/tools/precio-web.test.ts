import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buscarPrecioWeb, parsearPrecio } from './precio-web';

describe('parsearPrecio', () => {
  it('formato argentino: miles con punto y decimales con coma', () => {
    expect(parsearPrecio('$ 12.345,67')).toBe(12345.67);
    expect(parsearPrecio('$14.161')).toBe(14161);
    expect(parsearPrecio('$ 1.234.567')).toBe(1234567);
    expect(parsearPrecio('$ 850,50')).toBe(850.5);
  });

  it('formato anglosajón: miles con coma y decimales con punto', () => {
    expect(parsearPrecio('ARS 12,345.67')).toBe(12345.67);
    expect(parsearPrecio('1234.56')).toBe(1234.56);
  });

  it('sin dígitos o precio inválido devuelve null', () => {
    expect(parsearPrecio('consultar')).toBeNull();
    expect(parsearPrecio('')).toBeNull();
  });
});

describe('buscar_precio_web', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('SERPER_API_KEY', 'test-key');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    fetchMock.mockReset();
  });

  it('sin SERPER_API_KEY devuelve error estructurado, sin llamar a la API', async () => {
    vi.stubEnv('SERPER_API_KEY', '');
    const r = await buscarPrecioWeb({ termino: 'cemento portland 50kg' });
    expect(r.error).toBe('busqueda_web_no_configurada');
    expect(r.resultados).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('mapea los resultados de Serper a precios estructurados con fuente web_retail', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        shopping: [
          {
            title: 'Cemento Portland Loma Negra 50kg',
            source: 'Easy Argentina',
            link: 'https://easy.com.ar/cemento',
            price: '$ 11.499,00',
          },
          { title: 'Item sin precio', source: 'Otro', link: 'https://x.com' },
        ],
      }),
    });

    const r = await buscarPrecioWeb({ termino: 'cemento portland 50kg' });
    expect(r.error).toBeUndefined();
    expect(r.total_encontrados).toBe(1);
    expect(r.resultados[0]).toMatchObject({
      descripcion: 'Cemento Portland Loma Negra 50kg',
      precio: 11499,
      comercio: 'Easy Argentina',
      url: 'https://easy.com.ar/cemento',
      fuente: 'web_retail',
    });
    expect(r.fecha_consulta).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(r.mensaje).toContain('retail');
  });

  it('respeta el limit', async () => {
    const items = Array.from({ length: 8 }, (_, i) => ({
      title: `Item ${i}`,
      source: 'Tienda',
      link: 'https://t.com',
      price: `$ ${1000 + i}`,
    }));
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ shopping: items }) });

    const r = await buscarPrecioWeb({ termino: 'hierro 8mm', limit: 3 });
    expect(r.resultados).toHaveLength(3);
  });

  it('falla de red devuelve error estructurado sin tirar', async () => {
    fetchMock.mockRejectedValue(new Error('network'));
    const r = await buscarPrecioWeb({ termino: 'cemento' });
    expect(r.error).toBe('busqueda_web_fallo');
    expect(r.resultados).toEqual([]);
  });

  it('respuesta no-ok de Serper devuelve error estructurado', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 429 });
    const r = await buscarPrecioWeb({ termino: 'cemento' });
    expect(r.error).toBe('busqueda_web_fallo');
  });
});
