import { describe, it, expect } from 'vitest';
import { renderPresupuestoTecnico } from './presupuesto-tecnico';

const baseData = {
  proyecto: {
    nombre: 'Losa 50m²',
    descripcion: 'Estructura independiente H°A°',
    arquitecto: 'Arq. Leonardo Díaz',
    estudio: 'SoyLeo AI',
    ubicacion: 'Tucumán, Arg.',
    año: '2026',
    estado: 'Proyecto ejecutivo',
    sistema: 'Obra Nueva',
    superficie_total: '50 m²',
    email: 'test@example.com',
  },
  rubros: {
    rubros: [
      {
        numero: '01',
        nombre: 'Hormigón H-25 elaborado',
        unidad: 'm³',
        cantidad: 7.5,
        precio_unitario_mat: 286246,
        precio_unitario_mo: 0,
        materiales: 2146845,
        mano_de_obra: 0,
        total: 2146845,
        incidencia: '24%',
      },
      {
        numero: '02',
        nombre: 'Acero Ø12mm',
        unidad: 'barra',
        cantidad: 52,
        precio_unitario_mat: 31498,
        precio_unitario_mo: 10560,
        materiales: 1102400,
        mano_de_obra: 360800,
        total: 1463200,
        incidencia: '16%',
      },
    ],
    totales: {
      materiales: 5142895,
      mano_de_obra: 3342882,
      total_obra: 8910066,
      costo_m2: 178201,
    },
    nota: 'Presupuesto global orientativo',
  },
  numero_presupuesto: '2026-002',
  fecha: 'Mayo 2026',
  cliente: 'Cliente Test',
};

describe('renderPresupuestoTecnico', () => {
  it('genera HTML con número de presupuesto', () => {
    const html = renderPresupuestoTecnico(baseData);
    expect(html).toContain('PRE-2026-002');
    expect(html).toContain('Mayo 2026');
  });

  it('incluye datos del proyecto en header', () => {
    const html = renderPresupuestoTecnico(baseData);
    expect(html).toContain('Losa 50m²');
    expect(html).toContain('Arq. Leonardo Díaz');
    expect(html).toContain('Tucumán');
  });

  it('lista los rubros con sus totales', () => {
    const html = renderPresupuestoTecnico(baseData);
    expect(html).toContain('Hormigón H-25');
    expect(html).toContain('Acero Ø12mm');
  });

  it('muestra el total estimado destacado', () => {
    const html = renderPresupuestoTecnico(baseData);
    expect(html).toContain('Total estimado');
  });

  it('incluye notas técnicas si se pasan', () => {
    const html = renderPresupuestoTecnico({
      ...baseData,
      notas_tecnicas: ['Hormigón H-25', 'Acero ADN-420'],
    });
    expect(html).toContain('Notas técnicas');
    expect(html).toContain('Hormigón H-25');
  });
});
