import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buscarProfesionales } from './profesionales';

describe('buscar_profesionales', () => {
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
    const r = await buscarProfesionales({ oficio: 'plomero' });
    expect(r.error).toBe('busqueda_web_no_configurada');
    expect(r.resultados).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('país no soportado devuelve error estructurado, sin llamar a la API', async () => {
    vi.stubEnv('TAVILY_API_KEY', 'tvly-test');
    const r = await buscarProfesionales({ oficio: 'plomero', pais: 'España' });
    expect(r.error).toBe('pais_no_soportado');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('con Serper usa /places y mapea la ficha completa de Google Maps', async () => {
    vi.stubEnv('SERPER_API_KEY', 'test-key');
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        places: [
          {
            title: 'Plomería García',
            address: 'Av. Belgrano 1200, Salta',
            category: 'Plomero',
            phoneNumber: '+54 387 555-1234',
            rating: 4.6,
            ratingCount: 89,
            website: 'https://plomeriagarcia.com.ar',
          },
          {
            title: 'Destapaciones Norte',
            address: 'Salta',
            category: 'Plomero',
            cid: '123456',
          },
        ],
      }),
    });

    const r = await buscarProfesionales({
      oficio: 'plomero',
      lugar: 'Salta',
    });

    expect(fetchMock.mock.calls[0][0]).toContain('serper.dev/places');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.q).toBe('plomero en Salta');
    expect(body.gl).toBe('ar');

    expect(r.proveedor).toBe('serper');
    expect(r.pais).toBe('Argentina');
    expect(r.total_encontrados).toBe(2);
    expect(r.resultados[0]).toMatchObject({
      nombre: 'Plomería García',
      telefono: '+54 387 555-1234',
      rating: 4.6,
      resenas: 89,
      direccion: 'Av. Belgrano 1200, Salta',
      fuente: 'google_places',
      url: 'https://plomeriagarcia.com.ar',
    });
    // Sin website, la URL trazable es la ficha de Maps.
    expect(r.resultados[1].url).toBe('https://maps.google.com/?cid=123456');
    expect(r.fecha_consulta).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(r.mensaje).toContain('NO verificados');
  });

  it('con Serper y otro país usa su gl y arma la query con el país si no hay lugar', async () => {
    vi.stubEnv('SERPER_API_KEY', 'test-key');
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ places: [] }) });

    await buscarProfesionales({ oficio: 'encanador', pais: 'Brasil' });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.q).toBe('encanador Brasil');
    expect(body.gl).toBe('br');
    expect(body.hl).toBe('pt-br');
  });

  it('con Tavily devuelve páginas con URL y contexto, sin teléfono', async () => {
    vi.stubEnv('TAVILY_API_KEY', 'tvly-test');
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            title: 'Herrería de obra en Montevideo — Portones y rejas',
            url: 'https://herreriamontevideo.uy/servicios',
            content: 'Herrería de obra: portones, rejas y escaleras. Presupuestos sin cargo en Montevideo y Canelones.',
          },
        ],
      }),
    });

    const r = await buscarProfesionales({
      oficio: 'herrero',
      pais: 'Uruguay',
      lugar: 'Montevideo',
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.query).toContain('herrero');
    expect(body.query).toContain('Montevideo');
    expect(body.query).toContain('Uruguay');
    expect(body.country).toBe('uruguay');

    expect(r.proveedor).toBe('tavily');
    expect(r.resultados[0]).toMatchObject({
      nombre: 'Herrería de obra en Montevideo — Portones y rejas',
      url: 'https://herreriamontevideo.uy/servicios',
      fuente: 'web',
    });
    expect(r.resultados[0].telefono).toBeUndefined();
    expect(r.resultados[0].contexto).toContain('Presupuestos sin cargo');
  });

  it('respeta el limit', async () => {
    vi.stubEnv('SERPER_API_KEY', 'test-key');
    const places = Array.from({ length: 9 }, (_, i) => ({
      title: `Profesional ${i}`,
      address: 'CABA',
    }));
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ places }) });

    const r = await buscarProfesionales({ oficio: 'yesero', limit: 4 });
    expect(r.resultados).toHaveLength(4);
  });

  it('falla de red devuelve error estructurado sin tirar', async () => {
    vi.stubEnv('TAVILY_API_KEY', 'tvly-test');
    fetchMock.mockRejectedValue(new Error('network'));
    const r = await buscarProfesionales({ oficio: 'plomero' });
    expect(r.error).toBe('busqueda_web_fallo');
    expect(r.resultados).toEqual([]);
  });

  it('oficio matriculado suma la pasada de padrón con include_domains', async () => {
    vi.stubEnv('TAVILY_API_KEY', 'tvly-test');
    fetchMock
      // 1ª llamada: búsqueda web común
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            {
              title: 'Gasista matriculado en Salta',
              url: 'https://gasistasalta.com.ar',
              content: 'Instalaciones de gas domiciliarias.',
            },
          ],
        }),
      })
      // 2ª llamada: padrón institucional
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            {
              title: 'Registro de gasistas matriculados — ENARGAS',
              url: 'https://enargas.gob.ar/registro/gasistas',
              content: 'Listado oficial de instaladores matriculados por distribuidora.',
            },
          ],
        }),
      });

    const r = await buscarProfesionales({
      oficio: 'gasista matriculado',
      lugar: 'Salta',
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const bodyPadron = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(bodyPadron.include_domains).toEqual(['enargas.gob.ar']);
    expect(bodyPadron.query).toContain('matriculados');

    expect(r.resultados_padron).toHaveLength(1);
    expect(r.resultados_padron![0]).toMatchObject({
      nombre: 'Registro de gasistas matriculados — ENARGAS',
      fuente: 'padron_institucional',
    });
    expect(r.padron_fuentes![0]).toContain('ENARGAS');
    expect(r.total_encontrados).toBe(2);
    expect(r.mensaje).toContain('padron');
  });

  it('oficio sin fuentes institucionales no hace la pasada extra', async () => {
    vi.stubEnv('TAVILY_API_KEY', 'tvly-test');
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    });

    const r = await buscarProfesionales({ oficio: 'plomero', lugar: 'Salta' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(r.resultados_padron).toBeUndefined();
  });

  it('oficio matriculado en país sin fuentes curadas no hace la pasada extra', async () => {
    vi.stubEnv('TAVILY_API_KEY', 'tvly-test');
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    });

    await buscarProfesionales({ oficio: 'gasista', pais: 'Uruguay' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('si el padrón falla, la búsqueda principal sobrevive sin padrón', async () => {
    vi.stubEnv('TAVILY_API_KEY', 'tvly-test');
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            { title: 'Electricista CABA', url: 'https://electricista.com.ar' },
          ],
        }),
      })
      .mockRejectedValueOnce(new Error('network'));

    const r = await buscarProfesionales({ oficio: 'electricista', lugar: 'CABA' });
    expect(r.error).toBeUndefined();
    expect(r.resultados).toHaveLength(1);
    expect(r.resultados_padron).toBeUndefined();
  });
});
