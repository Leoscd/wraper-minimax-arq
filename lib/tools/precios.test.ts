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

  it('regionesDisponibles lista las regiones cargadas', () => {
    expect(regionesDisponibles()).toEqual(['NOA']);
  });
});
