import { describe, it, expect } from 'vitest';
import { renderPresentacionDarkGold } from './presentacion-darkgold';
import type { PresentacionData } from './presentacion-darkgold';

const baseData: PresentacionData = {
  proyecto: {
    nombre: 'Casa Test',
    subtitulo: 'Subtítulo de prueba',
    descripcion: 'Descripción de prueba del proyecto',
    arquitecto: 'Arq. Test',
    estudio: 'Estudio Test',
    ubicacion: 'Tucumán, Argentina',
    año: '2026',
    estado: 'Proyecto ejecutivo',
    sistema: 'Steel Frame',
    superficie_total: '120 m²',
    unidades: '2 unidades',
    email: 'test@example.com',
    web: 'test.com',
    instagram: '@test',
  },
  branding: {
    empresa_nombre: 'Estudio Test',
    estilo: 'premium',
    color_primario: '#C9A84C',
  },
  archivos: {
    galeria: [
      { nombre: 'Render 1', url: 'https://example.com/1.jpg' },
    ],
  },
};

describe('renderPresentacionDarkGold', () => {
  it('genera HTML completo con título correcto', () => {
    const html = renderPresentacionDarkGold(baseData);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Casa Test');
    expect(html).toContain('Subtítulo de prueba');
    expect(html).toContain('Arq. Test');
  });

  it('incluye galería cuando hay imágenes', () => {
    const html = renderPresentacionDarkGold(baseData);
    expect(html).toContain('Render 1');
    expect(html).toContain('https://example.com/1.jpg');
  });

  it('incluye video hero cuando se pasa', () => {
    const html = renderPresentacionDarkGold({
      ...baseData,
      archivos: {
        ...baseData.archivos,
        video_hero: 'https://example.com/hero.mp4',
      },
    });
    expect(html).toContain('<video');
    expect(html).toContain('hero.mp4');
  });

  it('escapa HTML para evitar XSS', () => {
    const html = renderPresentacionDarkGold({
      ...baseData,
      proyecto: {
        ...baseData.proyecto,
        nombre: '<script>alert("xss")</script>',
      },
    });
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;');
  });

  it('incluye tabla de presupuesto cuando hay rubros', () => {
    const html = renderPresentacionDarkGold({
      ...baseData,
      rubros: {
        rubros: [
          {
            numero: '01',
            nombre: 'Hormigón',
            cantidad: 1,
            precio_unitario_mat: 100000,
            precio_unitario_mo: 50000,
            materiales: 100000,
            mano_de_obra: 50000,
            total: 150000,
            incidencia: '100%',
          },
        ],
        totales: {
          materiales: 100000,
          mano_de_obra: 50000,
          total_obra: 150000,
        },
      },
    });
    expect(html).toContain('Presupuesto');
    expect(html).toContain('Hormigón');
  });

  it('omite tabla de presupuesto cuando no hay rubros', () => {
    const html = renderPresentacionDarkGold(baseData);
    expect(html).not.toContain('Inversión estimada');
  });
});
