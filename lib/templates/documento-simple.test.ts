import { describe, it, expect } from 'vitest';
import { renderDocumentoSimple } from './documento-simple';

const baseData = {
  proyecto: { nombre: 'Casa Test', ubicacion: 'Tucumán', año: '2026' },
  titulo: 'Memoria descriptiva',
  contenido_md: 'Este es un párrafo normal.\n\n# Sección 1\n\nMás texto acá.',
};

describe('renderDocumentoSimple', () => {
  it('genera HTML con título, subtítulo y proyecto', () => {
    const html = renderDocumentoSimple({
      ...baseData,
      subtitulo: 'Subtítulo opcional',
    });
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Memoria descriptiva');
    expect(html).toContain('Subtítulo opcional');
    expect(html).toContain('Casa Test');
  });

  it('parsea encabezados (#, ##, ###)', () => {
    const html = renderDocumentoSimple({
      ...baseData,
      contenido_md: '# H1 grande\n\n## H2 mediano\n\n### H3 chico',
    });
    expect(html).toMatch(/<h1[^>]*>H1 grande<\/h1>/);
    expect(html).toMatch(/<h2[^>]*>H2 mediano<\/h2>/);
    expect(html).toMatch(/<h3[^>]*>H3 chico<\/h3>/);
  });

  it('parsea negrita y cursiva', () => {
    const html = renderDocumentoSimple({
      ...baseData,
      contenido_md: 'Texto **en negrita** y *en cursiva*.',
    });
    expect(html).toContain('<strong>en negrita</strong>');
    expect(html).toContain('<em>en cursiva</em>');
  });

  it('parsea code inline', () => {
    const html = renderDocumentoSimple({
      ...baseData,
      contenido_md: 'Usá `npm install` para instalar.',
    });
    expect(html).toContain('<code>npm install</code>');
  });

  it('parsea listas no ordenadas', () => {
    const html = renderDocumentoSimple({
      ...baseData,
      contenido_md: '- item 1\n- item 2\n- item 3',
    });
    expect(html).toMatch(/<ul[^>]*><li>item 1<\/li><li>item 2<\/li><li>item 3<\/li><\/ul>/);
  });

  it('parsea listas ordenadas', () => {
    const html = renderDocumentoSimple({
      ...baseData,
      contenido_md: '1. primero\n2. segundo\n3. tercero',
    });
    expect(html).toMatch(/<ol[^>]*><li>primero<\/li><li>segundo<\/li><li>tercero<\/li><\/ol>/);
  });

  it('parsea blockquote', () => {
    const html = renderDocumentoSimple({
      ...baseData,
      contenido_md: '> Esto es una cita importante.',
    });
    expect(html).toContain('<blockquote');
    expect(html).toContain('Esto es una cita importante');
  });

  it('parsea línea horizontal', () => {
    const html = renderDocumentoSimple({
      ...baseData,
      contenido_md: 'Arriba\n\n---\n\nAbajo',
    });
    expect(html).toMatch(/<hr[^>]*\/?>/);
  });

  it('escapa HTML en el contenido (anti XSS)', () => {
    const html = renderDocumentoSimple({
      ...baseData,
      contenido_md: 'Texto con <script>alert(1)</script>',
    });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('renderiza metadata si se pasa', () => {
    const html = renderDocumentoSimple({
      ...baseData,
      metadata: { Autor: 'Arq. Test', Versión: '1.0' },
    });
    expect(html).toContain('Autor');
    expect(html).toContain('Arq. Test');
    expect(html).toContain('Versión');
    expect(html).toContain('1.0');
  });

  it('combina todos los elementos en un documento complejo', () => {
    const html = renderDocumentoSimple({
      proyecto: { nombre: 'Casa X', ubicacion: 'CABA' },
      titulo: 'Memoria técnica',
      subtitulo: 'Documento de presentación',
      contenido_md: [
        '# Objetivo',
        'Construir una casa en **CABA**.',
        '',
        '## Tareas',
        '- Relevamiento',
        '- Proyecto ejecutivo',
        '',
        '> Documento generado automáticamente.',
        '',
        '---',
        '',
        '1. Inicio',
        '2. Avance',
        '',
        'Usá `plan.xlsx` para los detalles.',
      ].join('\n'),
      fecha: 'Julio 2026',
      metadata: { Autor: 'Arq. Test' },
    });
    expect(html).toContain('Memoria técnica');
    expect(html).toContain('Documento de presentación');
    expect(html).toContain('<h1');
    expect(html).toContain('<h2');
    expect(html).toContain('<strong>');
    expect(html).toContain('<ul');
    expect(html).toContain('<ol');
    expect(html).toContain('<blockquote');
    expect(html).toMatch(/<hr/);
    expect(html).toContain('<code>plan.xlsx</code>');
    expect(html).toContain('Julio 2026');
  });
});
