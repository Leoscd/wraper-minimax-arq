import { describe, it, expect } from 'vitest';
import { buscarPrecio } from './precios';
import { getPreciosDataset } from '../data/precios';

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

  it('región inexistente hace fallback a NOA y devuelve resultados', () => {
    const r = buscarPrecio({ termino: 'loma negra', region: 'PATAGONIA' });
    expect(r.total_encontrados).toBeGreaterThan(0);
    expect(r.region_usada).toContain('NOA');
  });
});

describe('getPreciosDataset', () => {
  it('default devuelve el dataset NOA', () => {
    const ds = getPreciosDataset();
    expect(ds.metadata.region).toContain('NOA');
    expect(ds.items.length).toBeGreaterThan(0);
  });

  it('región conocida (case/accent-insensitive) resuelve el dataset', () => {
    const ds = getPreciosDataset('nóa');
    expect(ds.metadata.region).toContain('NOA');
  });

  it('región desconocida hace fallback a NOA', () => {
    const ds = getPreciosDataset('REGION_QUE_NO_EXISTE');
    expect(ds.metadata.region).toContain('NOA');
    expect(ds.items.length).toBeGreaterThan(0);
  });
});
