import { describe, it, expect } from 'vitest';
import {
  parsePrice,
  detectSeparator,
  parseCsvLine,
  parseListaPrecios,
  MAX_PRECIOS_PROPIOS,
} from './parse-lista';

describe('parsePrice', () => {
  it('parsea formato argentino con miles y decimales', () => {
    expect(parsePrice('261.051,59')).toBe(261051.59);
  });

  it('parsea enteros con puntos de miles', () => {
    expect(parsePrice('1.234')).toBe(1234);
  });

  it('tolera el símbolo $', () => {
    expect(parsePrice('$ 1.234,56')).toBe(1234.56);
  });

  it('devuelve 0 si no es un número', () => {
    expect(parsePrice('consultar')).toBe(0);
    expect(parsePrice('')).toBe(0);
  });
});

describe('detectSeparator', () => {
  it('detecta punto y coma', () => {
    expect(detectSeparator('categoria;descripcion;precio')).toBe(';');
  });

  it('detecta coma', () => {
    expect(detectSeparator('categoria,descripcion,precio')).toBe(',');
  });

  it('prioriza tab (paste desde Excel/Sheets)', () => {
    expect(detectSeparator('categoria\tdescripcion, larga\tprecio')).toBe('\t');
  });
});

describe('parseCsvLine', () => {
  it('respeta separadores embebidos en comillas', () => {
    expect(parseCsvLine('ABERTURAS,"Puerta 0,90 x 2,05","261.051,59"', ',')).toEqual([
      'ABERTURAS',
      'Puerta 0,90 x 2,05',
      '261.051,59',
    ]);
  });

  it('maneja comillas escapadas', () => {
    expect(parseCsvLine('a;"dijo ""hola""";1', ';')).toEqual(['a', 'dijo "hola"', '1']);
  });
});

describe('parseListaPrecios', () => {
  it('parsea CSV con header (formato de la lista NOA)', () => {
    const csv = [
      'Categoría,Descripción,Precio',
      '1- ABERTURAS ALUMINIO,"Puerta Moderna 0,90 X 2,05 mts.","261.051,59"',
      'CEMENTO,"Cemento Loma Negra x 50kg","15.300,00"',
    ].join('\n');
    const r = parseListaPrecios(csv);
    expect(r.errores).toEqual([]);
    expect(r.items).toHaveLength(2);
    expect(r.items[0]).toEqual({
      descripcion: 'Puerta Moderna 0,90 X 2,05 mts.',
      precio: 261051.59,
      categoria: '1- ABERTURAS ALUMINIO',
    });
    expect(r.descartadas).toBe(0);
    expect(r.truncado).toBe(false);
  });

  it('acepta variantes de header con acentos y columnas opcionales', () => {
    const csv = [
      'Rubro;Detalle;Precio Unitario;Proveedor;Código',
      'HIERROS;Hierro 12mm x 12m;9.500,50;Corralón X;H12',
    ].join('\n');
    const r = parseListaPrecios(csv);
    expect(r.items).toEqual([
      {
        descripcion: 'Hierro 12mm x 12m',
        precio: 9500.5,
        categoria: 'HIERROS',
        proveedor: 'Corralón X',
        codigo: 'H12',
      },
    ]);
  });

  it('fallback posicional sin header: 2 columnas = descripcion;precio', () => {
    const texto = ['Cemento x 50kg;15.300', 'Arena gruesa m3;28.000,50'].join('\n');
    const r = parseListaPrecios(texto);
    expect(r.items).toEqual([
      { descripcion: 'Cemento x 50kg', precio: 15300 },
      { descripcion: 'Arena gruesa m3', precio: 28000.5 },
    ]);
  });

  it('fallback posicional sin header: 3 columnas = categoria;descripcion;precio', () => {
    const texto = 'CEMENTO;Cemento x 50kg;15.300';
    const r = parseListaPrecios(texto);
    expect(r.items).toEqual([
      { descripcion: 'Cemento x 50kg', precio: 15300, categoria: 'CEMENTO' },
    ]);
  });

  it('parsea texto pegado tab-separated (Excel/Sheets)', () => {
    const texto = ['Cemento x 50kg\t15.300,00', 'Cal hidratada x 25kg\t8.200,00'].join('\n');
    const r = parseListaPrecios(texto);
    expect(r.items).toHaveLength(2);
    expect(r.items[1]).toEqual({ descripcion: 'Cal hidratada x 25kg', precio: 8200 });
  });

  it('descarta filas sin descripción o con precio inválido/0', () => {
    const csv = [
      'Descripción;Precio',
      'Cemento;15.300',
      ';9.999',
      'Item sin precio;consultar',
      'Item precio cero;0',
    ].join('\n');
    const r = parseListaPrecios(csv);
    expect(r.items).toHaveLength(1);
    expect(r.descartadas).toBe(3);
  });

  it('trunca listas más largas que el máximo', () => {
    const filas = Array.from(
      { length: MAX_PRECIOS_PROPIOS + 10 },
      (_, i) => `Item ${i + 1};${i + 1}`
    );
    const r = parseListaPrecios(filas.join('\n'));
    expect(r.truncado).toBe(true);
    expect(r.items).toHaveLength(MAX_PRECIOS_PROPIOS);
  });

  it('texto que no es una lista devuelve 0 items con error legible', () => {
    const r = parseListaPrecios('Hola, quiero presupuestar una losa de 40 m2.');
    expect(r.items).toEqual([]);
    expect(r.errores.length).toBeGreaterThan(0);
  });

  it('texto vacío devuelve error', () => {
    const r = parseListaPrecios('   \n  ');
    expect(r.items).toEqual([]);
    expect(r.errores.length).toBeGreaterThan(0);
  });
});
