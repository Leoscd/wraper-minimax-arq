import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buscarPrecioWeb,
  parsearPrecio,
  extraerPrecio,
  resolverPais,
  PAISES,
} from './precio-web';

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

  it('ignora el punto final de la oración pegado al número', () => {
    expect(parsearPrecio('$ 993.0.')).toBe(993);
    expect(parsearPrecio('R$ 43,80.')).toBe(43.8);
    expect(parsearPrecio('$ 1.234.')).toBe(1234);
  });
});

describe('extraerPrecio', () => {
  it('extrae precio con ancla $ y devuelve contexto', () => {
    const r = extraerPrecio(
      'Cemento pórtland compuesto CPC40 50 kg, $10.049,00 c/u Agregar al carro'
    );
    expect(r?.precio).toBe(10049);
    expect(r?.contexto).toContain('$10.049,00');
  });

  it('extrae precio con ancla ARS pospuesta', () => {
    const r = extraerPrecio('CEMENTO x 50KG LOMA NEGRA. 12.652,85 ARS Precio.');
    expect(r?.precio).toBe(12652.85);
  });

  it('no confunde cantidades sin ancla de moneda ni montos chicos', () => {
    expect(extraerPrecio('bolsa de 50 kg, rinde 25 litros')).toBeNull();
    expect(extraerPrecio('envío $50 por unidad')).toBeNull();
  });

  it('usa las anclas de moneda del país: Uruguay ($U), Brasil (R$), Perú (S/)', () => {
    expect(
      extraerPrecio('Portland gris 25 kg $U 1.890 c/u', PAISES.URUGUAY)?.precio
    ).toBe(1890);
    expect(
      extraerPrecio('Cimento CP II 25kg R$ 45,90 à vista', PAISES.BRASIL)?.precio
    ).toBe(45.9);
    expect(
      extraerPrecio('Cemento Sol 42.5 kg S/ 32.50', PAISES.PERU)?.precio
    ).toBe(32.5);
    expect(
      extraerPrecio('Cemento 25kg Gs. 85.000', PAISES.PARAGUAY)?.precio
    ).toBe(85000);
  });

  it('la "$" de "U$S" no cuenta como precio en pesos uruguayos', () => {
    expect(extraerPrecio('oferta U$S 45 la bolsa', PAISES.URUGUAY)).toBeNull();
  });

  it('respeta el mínimo plausible por moneda', () => {
    // 8 USD es un precio plausible en Ecuador; 8 ARS es ruido en Argentina.
    expect(extraerPrecio('cemento $8.50 saco', PAISES.ECUADOR)?.precio).toBe(8.5);
    expect(extraerPrecio('cemento $8.50 saco')).toBeNull();
  });
});

describe('resolverPais', () => {
  it('sin entrada devuelve Argentina', () => {
    expect(resolverPais()?.nombre).toBe('Argentina');
    expect(resolverPais('  ')?.nombre).toBe('Argentina');
  });

  it('resuelve con o sin acentos y con alias', () => {
    expect(resolverPais('Perú')?.moneda).toBe('PEN');
    expect(resolverPais('mexico')?.moneda).toBe('MXN');
    expect(resolverPais('Brazil')?.moneda).toBe('BRL');
    expect(resolverPais('República Dominicana')?.moneda).toBe('DOP');
  });

  it('país desconocido devuelve null', () => {
    expect(resolverPais('Francia')).toBeNull();
  });
});

describe('buscar_precio_web', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('SERPER_API_KEY', '');
    vi.stubEnv('TAVILY_API_KEY', '');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    fetchMock.mockReset();
  });

  it('sin ninguna key devuelve error estructurado, sin llamar a la API', async () => {
    const r = await buscarPrecioWeb({ termino: 'cemento portland 50kg' });
    expect(r.error).toBe('busqueda_web_no_configurada');
    expect(r.resultados).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('con Serper mapea resultados de shopping con fuente web_retail', async () => {
    vi.stubEnv('SERPER_API_KEY', 'test-key');
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
    expect(r.proveedor).toBe('serper');
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

  it('con Tavily extrae el precio del contenido y usa el dominio como comercio', async () => {
    vi.stubEnv('TAVILY_API_KEY', 'tvly-test');
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            title: 'Cemento pórtland compuesto CPC40 50 kg',
            url: 'https://www.sodimac.com.ar/producto/103507X',
            content: 'producto argentino de 50 kg, $10.049,00 c/u Agregar al carro',
          },
          {
            title: 'Nota sin precios',
            url: 'https://blog.com/nota',
            content: 'el cemento es un material fundamental',
          },
        ],
      }),
    });

    const r = await buscarPrecioWeb({ termino: 'cemento portland 50kg' });
    expect(r.proveedor).toBe('tavily');
    expect(r.total_encontrados).toBe(1);
    expect(r.resultados[0]).toMatchObject({
      precio: 10049,
      comercio: 'sodimac.com.ar',
      fuente: 'web_retail',
    });
    expect(r.resultados[0].contexto).toContain('$10.049,00');
  });

  it('con ambas keys prioriza Serper', async () => {
    vi.stubEnv('SERPER_API_KEY', 'serper-key');
    vi.stubEnv('TAVILY_API_KEY', 'tvly-test');
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ shopping: [] }) });

    const r = await buscarPrecioWeb({ termino: 'cemento' });
    expect(r.proveedor).toBe('serper');
    expect(fetchMock.mock.calls[0][0]).toContain('serper.dev');
  });

  it('respeta el limit', async () => {
    vi.stubEnv('SERPER_API_KEY', 'test-key');
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
    vi.stubEnv('TAVILY_API_KEY', 'tvly-test');
    fetchMock.mockRejectedValue(new Error('network'));
    const r = await buscarPrecioWeb({ termino: 'cemento' });
    expect(r.error).toBe('busqueda_web_fallo');
    expect(r.resultados).toEqual([]);
  });

  it('respuesta no-ok del proveedor devuelve error estructurado', async () => {
    vi.stubEnv('SERPER_API_KEY', 'test-key');
    fetchMock.mockResolvedValue({ ok: false, status: 429 });
    const r = await buscarPrecioWeb({ termino: 'cemento' });
    expect(r.error).toBe('busqueda_web_fallo');
  });

  it('país no soportado devuelve error estructurado, sin llamar a la API', async () => {
    vi.stubEnv('TAVILY_API_KEY', 'tvly-test');
    const r = await buscarPrecioWeb({ termino: 'cemento', pais: 'Francia' });
    expect(r.error).toBe('pais_no_soportado');
    expect(r.mensaje).toContain('Uruguay');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('con Serper y otro país usa su gl/hl y su moneda', async () => {
    vi.stubEnv('SERPER_API_KEY', 'test-key');
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        shopping: [
          {
            title: 'Cimento CP II 25kg',
            source: 'Leroy Merlin',
            link: 'https://leroymerlin.com.br/cimento',
            price: 'R$ 45,90',
          },
        ],
      }),
    });

    const r = await buscarPrecioWeb({
      termino: 'cimento 25kg',
      pais: 'Brasil',
      lugar: 'São Paulo',
    });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.gl).toBe('br');
    expect(body.hl).toBe('pt-br');
    expect(body.q).toContain('São Paulo');
    expect(r.pais).toBe('Brasil');
    expect(r.resultados[0]).toMatchObject({ precio: 45.9, moneda: 'BRL' });
  });

  it('con Tavily y otro país arma la query con lugar y país, y extrae en moneda local', async () => {
    vi.stubEnv('TAVILY_API_KEY', 'tvly-test');
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            title: 'Portland gris 25 kg',
            url: 'https://www.sodimac.com.uy/producto/portland',
            content: 'Portland ANCAP 25 kg $U 1.890 c/u en stock',
          },
        ],
      }),
    });

    const r = await buscarPrecioWeb({
      termino: 'cemento portland 25kg',
      pais: 'Uruguay',
      lugar: 'Montevideo',
    });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.country).toBe('uruguay');
    expect(body.query).toContain('Montevideo');
    expect(body.query).toContain('Uruguay');
    expect(r.pais).toBe('Uruguay');
    expect(r.resultados[0]).toMatchObject({
      precio: 1890,
      moneda: 'UYU',
      comercio: 'sodimac.com.uy',
    });
  });
});
