import { describe, it, expect } from 'vitest';
import {
  ProyectoInputSchema,
  BrandingInputSchema,
  ArchivosInputSchema,
  RubrosInputSchema,
  GenerationRequestSchema,
  LeadInputSchema,
  formatZodError,
} from './schemas';

const validProyecto = {
  nombre: 'Casa Test',
  descripcion: 'Descripcion de prueba del proyecto',
  arquitecto: 'Arq. Test',
  ubicacion: 'Tucumán',
  año: '2026',
  estado: 'Proyecto ejecutivo',
  email: 'test@example.com',
};

const validBranding = {
  empresa_nombre: 'Estudio Test',
  color_primario: '#C9A84C',
  estilo: 'premium' as const,
};

const validArchivos = { galeria: [] };

describe('ProyectoInputSchema', () => {
  it('acepta proyecto válido', () => {
    expect(ProyectoInputSchema.safeParse(validProyecto).success).toBe(true);
  });

  it('rechaza email inválido', () => {
    const r = ProyectoInputSchema.safeParse({
      ...validProyecto,
      email: 'no-es-email',
    });
    expect(r.success).toBe(false);
  });

  it('rechaza año con 3 dígitos', () => {
    const r = ProyectoInputSchema.safeParse({ ...validProyecto, año: '202' });
    expect(r.success).toBe(false);
  });

  it('rechaza año fuera de rango', () => {
    const r = ProyectoInputSchema.safeParse({ ...validProyecto, año: '1800' });
    expect(r.success).toBe(false);
  });

  it('rechaza nombre vacío', () => {
    const r = ProyectoInputSchema.safeParse({ ...validProyecto, nombre: '' });
    expect(r.success).toBe(false);
  });
});

describe('BrandingInputSchema', () => {
  it('acepta color HEX 6 dígitos', () => {
    expect(
      BrandingInputSchema.safeParse(validBranding).success
    ).toBe(true);
  });

  it('acepta color HEX 3 dígitos', () => {
    const r = BrandingInputSchema.safeParse({
      ...validBranding,
      color_primario: '#FAB',
    });
    expect(r.success).toBe(true);
  });

  it('rechaza color no HEX', () => {
    const r = BrandingInputSchema.safeParse({
      ...validBranding,
      color_primario: 'rgb(255,0,0)',
    });
    expect(r.success).toBe(false);
  });

  it('rechaza estilo fuera de enum', () => {
    const r = BrandingInputSchema.safeParse({
      ...validBranding,
      estilo: 'custom',
    });
    expect(r.success).toBe(false);
  });
});

describe('ArchivosInputSchema', () => {
  it('acepta galeria vacía', () => {
    expect(ArchivosInputSchema.safeParse(validArchivos).success).toBe(true);
  });

  it('acepta video_hero como URL https', () => {
    const r = ArchivosInputSchema.safeParse({
      ...validArchivos,
      video_hero: 'https://example.com/video.mp4',
    });
    expect(r.success).toBe(true);
  });

  it('acepta data URIs (base64)', () => {
    const r = ArchivosInputSchema.safeParse({
      ...validArchivos,
      video_hero: 'data:video/mp4;base64,AAAA',
    });
    expect(r.success).toBe(true);
  });

  it('rechaza url maliciosa (javascript:)', () => {
    const r = ArchivosInputSchema.safeParse({
      ...validArchivos,
      video_hero: 'javascript:alert(1)',
    });
    expect(r.success).toBe(false);
  });

  it('rechaza más de 20 imágenes en galería', () => {
    const galeria = Array.from({ length: 21 }, (_, i) => ({
      nombre: `img${i}`,
      url: `https://example.com/${i}.jpg`,
    }));
    const r = ArchivosInputSchema.safeParse({ galeria });
    expect(r.success).toBe(false);
  });
});

describe('RubrosInputSchema', () => {
  it('acepta rubros válidos', () => {
    const r = RubrosInputSchema.safeParse({
      rubros: [
        {
          numero: '01',
          nombre: 'Fundaciones',
          cantidad: 1,
          precio_unitario_mat: 1000,
          precio_unitario_mo: 500,
          materiales: 1000,
          mano_de_obra: 500,
          total: 1500,
          incidencia: '10%',
        },
      ],
      totales: {
        materiales: 1000,
        mano_de_obra: 500,
        total_obra: 1500,
      },
    });
    expect(r.success).toBe(true);
  });

  it('rechaza más de 50 rubros', () => {
    const rubros = Array.from({ length: 51 }, (_, i) => ({
      numero: String(i + 1).padStart(2, '0'),
      nombre: `Rubro ${i}`,
      cantidad: 1,
      precio_unitario_mat: 100,
      precio_unitario_mo: 50,
      materiales: 100,
      mano_de_obra: 50,
      total: 150,
      incidencia: '1%',
    }));
    const r = RubrosInputSchema.safeParse({
      rubros,
      totales: { materiales: 5000, mano_de_obra: 2500, total_obra: 7500 },
    });
    expect(r.success).toBe(false);
  });

  it('rechaza costos negativos', () => {
    const r = RubrosInputSchema.safeParse({
      rubros: [
        {
          numero: '01',
          nombre: 'Test',
          cantidad: 1,
          precio_unitario_mat: -1,
          precio_unitario_mo: 0,
          materiales: -1,
          mano_de_obra: 0,
          total: -1,
          incidencia: '0%',
        },
      ],
      totales: { materiales: 0, mano_de_obra: 0, total_obra: 0 },
    });
    expect(r.success).toBe(false);
  });
});

describe('GenerationRequestSchema', () => {
  it('acepta request completo válido', () => {
    const r = GenerationRequestSchema.safeParse({
      proyecto: validProyecto,
      branding: validBranding,
      archivos: validArchivos,
    });
    expect(r.success).toBe(true);
  });

  it('rechaza si falta branding', () => {
    const r = GenerationRequestSchema.safeParse({
      proyecto: validProyecto,
      archivos: validArchivos,
    });
    expect(r.success).toBe(false);
  });
});

describe('LeadInputSchema', () => {
  it('acepta email válido', () => {
    expect(
      LeadInputSchema.safeParse({ email: 'test@example.com' }).success
    ).toBe(true);
  });

  it('rechaza email inválido', () => {
    const r = LeadInputSchema.safeParse({ email: 'mal' });
    expect(r.success).toBe(false);
  });
});

describe('formatZodError', () => {
  it('formatea error con path y message', () => {
    const r = ProyectoInputSchema.safeParse({
      ...validProyecto,
      email: 'bad',
    });
    if (r.success) throw new Error('expected failure');
    const formatted = formatZodError(r.error);
    expect(formatted.message).toBe('Datos de entrada inválidos');
    expect(formatted.issues.length).toBeGreaterThan(0);
    expect(formatted.issues[0].path).toBe('email');
  });
});
