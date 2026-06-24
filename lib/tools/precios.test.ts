import { describe, it, expect } from 'vitest';
import { buscarPrecio } from './precios';

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
});
