import { describe, it, expect } from 'vitest';
import { buscarPrecio } from './precios';
import { getPreciosDataset, regionesDisponibles } from '../data/precios';

describe('buscarPrecio', () => {
  it('encuentra cemento Loma Negra', () => {
    const r = buscarPrecio({ termino: 'loma negra' });
    expect(r.total_encontrados).toBeGreaterThan(0);
    expect(r.resultados[0].descripcion.toLowerCase()).toContain('loma negra');
  });

  it('búsqueda accent-insensitive: cerámico matchea con ceramico', () => {
    const r = buscarPrecio({ termino: 'ceramico' });
    expect(r.total_encontrados).toBeGreaterThan(0);
  });

  it('encuentra hierro 12mm', () => {
    const r = buscarPrecio({ termino: '12mm', limit: 20 });
    expect(r.total_encontrados).toBeGreaterThan(0);
  });

  it('filtra por categoría', () => {
    const r = buscarPrecio({
      termino: 'm2',
      categoria: 'pisos',
      limit: 5,
    });
    expect(r.total_encontrados).toBeGreaterThan(0);
  });

  it('devuelve hasta el límite pedido', () => {
    const r = buscarPrecio({ termino: 'm', limit: 3 });
    expect(r.resultados.length).toBeLessThanOrEqual(3);
  });

  it('devuelve 0 resultados si el término no existe', () => {
    const r = buscarPrecio({ termino: 'xyz123noexiste' });
    expect(r.total_encontrados).toBe(0);
    expect(r.resultados).toEqual([]);
  });

  it('sin región usa NOA por defecto', () => {
    const r = buscarPrecio({ termino: 'loma negra' });
    expect(r.region_usada).toContain('NOA');
  });

  it('con region NOA explícita funciona igual', () => {
    const r = buscarPrecio({ termino: 'loma negra', region: 'NOA' });
    expect(r.total_encontrados).toBeGreaterThan(0);
    expect(r.region_usada).toContain('NOA');
  });

  it('región sin dataset devuelve error explícito, sin fallback', () => {
    const r = buscarPrecio({ termino: 'loma negra', region: 'PATAGONIA' });
    expect(r.error).toBe('region_no_disponible');
    expect(r.total_encontrados).toBe(0);
    expect(r.resultados).toEqual([]);
    expect(r.region_pedida).toBe('PATAGONIA');
    expect(r.regiones_disponibles).toContain('NOA');
    expect(r.region_usada).toBeUndefined();
  });

  it('una provincia resuelve a su región y el error la nombra', () => {
    const r = buscarPrecio({ termino: 'loma negra', region: 'Neuquén' });
    expect(r.error).toBe('region_no_disponible');
    expect(r.region_pedida).toBe('Neuquén');
    expect(r.region_resuelta).toBe('PATAGONIA');
    expect(r.provincia).toBe('Neuquén');
    expect(r.mensaje).toContain('PATAGONIA');
  });

  it('una provincia del NOA usa el dataset NOA directamente', () => {
    const r = buscarPrecio({ termino: 'loma negra', region: 'Salta' });
    expect(r.error).toBeUndefined();
    expect(r.total_encontrados).toBeGreaterThan(0);
    expect(r.region_usada).toContain('NOA');
  });

  it('un alias de región resuelve a la canónica', () => {
    const r = buscarPrecio({ termino: 'loma negra', region: 'Patagónica' });
    expect(r.error).toBe('region_no_disponible');
    expect(r.region_resuelta).toBe('PATAGONIA');
    expect(r.provincia).toBeUndefined();
  });

  it('resultados del dataset llevan fuente "dataset"', () => {
    const r = buscarPrecio({ termino: 'loma negra' });
    expect(r.resultados.every((x) => x.fuente === 'dataset')).toBe(true);
    expect(r.total_lista_propia).toBeUndefined();
  });
});

describe('buscarPrecio con precios propios (ToolContext)', () => {
  const propios = [
    { descripcion: 'Cemento portland x 50kg', precio: 14000, proveedor: 'Mi corralón' },
    { descripcion: 'Cemento portland x 25kg', precio: 7500 },
    { descripcion: 'Arena fina m3', precio: 22000, categoria: 'ARIDOS' },
  ];

  it('la lista propia va primero y el dataset complementa', () => {
    const r = buscarPrecio({ termino: 'cemento', limit: 10 }, { preciosPropios: propios });
    expect(r.total_lista_propia).toBe(2);
    expect(r.total_dataset).toBeGreaterThan(0);
    expect(r.resultados[0].fuente).toBe('lista_propia');
    expect(r.resultados[1].fuente).toBe('lista_propia');
    expect(r.resultados[2].fuente).toBe('dataset');
    expect(r.resultados.length).toBe(2 + Math.min(r.total_dataset!, 8));
    expect(r.region_usada).toContain('NOA');
  });

  it('los propios no se truncan a favor del dataset', () => {
    const muchos = Array.from({ length: 5 }, (_, i) => ({
      descripcion: `Cemento especial tipo ${i + 1}`,
      precio: 1000 * (i + 1),
    }));
    const r = buscarPrecio({ termino: 'cemento', limit: 5 }, { preciosPropios: muchos });
    expect(r.resultados).toHaveLength(5);
    expect(r.resultados.every((x) => x.fuente === 'lista_propia')).toBe(true);
    expect(r.total_dataset).toBeGreaterThan(0);
  });

  it('items propios llevan id sintético y defaults de proveedor', () => {
    const r = buscarPrecio({ termino: 'arena fina' }, { preciosPropios: propios });
    expect(r.resultados[0].id).toBe('PROPIO-0003');
    expect(r.resultados[0].proveedor).toBe('Lista propia del usuario');
    expect(r.resultados[0].categoria).toBe('ARIDOS');
  });

  it('el filtro por categoría también aplica a la lista propia', () => {
    const r = buscarPrecio(
      { termino: 'm3', categoria: 'aridos' },
      { preciosPropios: propios }
    );
    const propiosEnResultado = r.resultados.filter((x) => x.fuente === 'lista_propia');
    expect(propiosEnResultado).toHaveLength(1);
    expect(propiosEnResultado[0].descripcion).toBe('Arena fina m3');
  });

  it('región desconocida CON lista propia busca solo en la propia, sin error', () => {
    const r = buscarPrecio(
      { termino: 'cemento', region: 'CUYO' },
      { preciosPropios: propios }
    );
    expect(r.error).toBeUndefined();
    expect(r.total_lista_propia).toBe(2);
    expect(r.total_dataset).toBeUndefined();
    expect(r.region_usada).toBeUndefined();
    expect(r.mensaje).toContain('CUYO');
    expect(r.resultados.every((x) => x.fuente === 'lista_propia')).toBe(true);
  });
});

describe('getPreciosDataset', () => {
  it('default devuelve el dataset NOA', () => {
    const ds = getPreciosDataset();
    expect(ds?.metadata.region).toContain('NOA');
    expect(ds?.items.length).toBeGreaterThan(0);
  });

  it('región conocida (case/accent-insensitive) resuelve el dataset', () => {
    const ds = getPreciosDataset('nóa');
    expect(ds?.metadata.region).toContain('NOA');
  });

  it('región desconocida devuelve null (sin fallback)', () => {
    expect(getPreciosDataset('REGION_QUE_NO_EXISTE')).toBeNull();
  });

  it('una provincia del NOA resuelve al dataset NOA', () => {
    const ds = getPreciosDataset('Santiago del Estero');
    expect(ds?.metadata.region).toContain('NOA');
  });

  it('regionesDisponibles lista las regiones cargadas', () => {
    expect(regionesDisponibles()).toEqual(['NOA']);
  });
});
