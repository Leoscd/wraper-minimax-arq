import { describe, it, expect } from 'vitest';
import { renderPresentacionDarkGold } from './presentacion-darkgold';
import type { PresentacionData } from './presentacion-darkgold';

const baseData: PresentacionData = {
  proyecto: {
    nombre: 'Casa Test',
    subtitulo: 'Subtítulo',
    tagline: 'Tagline de marca',
    descripcion: 'Descripción',
    arquitecto: 'Arq. Test',
    estudio: 'Estudio Test',
    ubicacion: 'Tucumán',
    año: '2026',
    estado: 'Proyecto ejecutivo',
    email: 'test@example.com',
    telefono: '+54 381 555 1234',
    direccion: 'Av. Test 1234',
    web: 'test.com',
    instagram: '@test',
    linkedin: 'https://linkedin.com/in/test',
    twitter: 'https://x.com/test',
    facebook: 'https://facebook.com/test',
  },
  branding: {
    empresa_nombre: 'Estudio Test',
    estilo: 'premium',
    color_primario: '#C9A84C',
    color_secundario: '#8a7434',
    color_fondo: '#080808',
    color_texto: '#ede9e0',
    color_acento: '#E5C66B',
  },
  archivos: {
    galeria: [],
  },
};

describe('renderPresentacionDarkGold - paleta completa', () => {
  it('aplica color primario del usuario', () => {
    const html = renderPresentacionDarkGold({
      ...baseData,
      branding: { ...baseData.branding, color_primario: '#FF6B35' },
    });
    expect(html).toContain('--gold: #FF6B35');
  });

  it('usa color secundario y acento custom', () => {
    const html = renderPresentacionDarkGold({
      ...baseData,
      branding: {
        ...baseData.branding,
        color_secundario: '#AABBCC',
        color_acento: '#DDEEFF',
      },
    });
    expect(html).toContain('--gold-2: #AABBCC');
    expect(html).toContain('--gold-accent: #DDEEFF');
  });

  it('usa color de fondo custom', () => {
    const html = renderPresentacionDarkGold({
      ...baseData,
      branding: { ...baseData.branding, color_fondo: '#FFFFFF' },
    });
    expect(html).toContain('--dark: #FFFFFF');
  });
});

describe('renderPresentacionDarkGold - info de marca', () => {
  it('muestra tagline en el nav', () => {
    const html = renderPresentacionDarkGold(baseData);
    expect(html).toContain('Tagline de marca');
    expect(html).toContain('nav-tagline');
  });

  it('muestra tagline en el footer', () => {
    const html = renderPresentacionDarkGold(baseData);
    expect(html).toContain('footer-tagline');
  });

  it('muestra teléfono, dirección y web en footer', () => {
    const html = renderPresentacionDarkGold(baseData);
    expect(html).toContain('+54 381 555 1234');
    expect(html).toContain('Av. Test 1234');
    expect(html).toContain('test.com');
  });

  it('muestra redes sociales con iconos SVG', () => {
    const html = renderPresentacionDarkGold(baseData);
    expect(html).toContain('linkedin.com/in/test');
    expect(html).toContain('x.com/test');
    expect(html).toContain('facebook.com/test');
    expect(html).toContain('instagram.com/test');
    expect(html).toMatch(/<svg/);
  });

  it('omite el span de tagline si no se pasa', () => {
    const html = renderPresentacionDarkGold({
      ...baseData,
      proyecto: { ...baseData.proyecto, tagline: undefined },
    });
    expect(html).not.toContain('<span class="nav-tagline">');
  });
});

describe('renderPresentacionDarkGold - regresión', () => {
  it('sigue generando HTML completo con título', () => {
    const html = renderPresentacionDarkGold(baseData);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Casa Test');
  });
});
