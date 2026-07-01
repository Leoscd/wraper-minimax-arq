import { describe, it, expect } from 'vitest';
import { renderCurvaInversion } from './curva-inversion';

const baseData = {
  proyecto: {
    nombre: 'Casa Test',
    ubicacion: 'Tucumán',
    año: '2026',
  },
  curva: {
    granularidad: 'semanal' as const,
    duracion_total_dias: 14,
    costo_total_materiales: 700000,
    costo_total_mano_obra: 300000,
    costo_total_equipos: 0,
    costo_total_obra: 1000000,
    periodos: [
      {
        periodo: 1,
        inicio_dia: 1,
        fin_dia: 7,
        tareas_activas: ['T1'],
        costo_materiales: 100000,
        costo_mano_obra: 50000,
        costo_equipos: 0,
        costo_total: 150000,
        costo_acumulado: 150000,
        porcentaje_avance: 15,
      },
      {
        periodo: 2,
        inicio_dia: 8,
        fin_dia: 14,
        tareas_activas: ['T2'],
        costo_materiales: 600000,
        costo_mano_obra: 250000,
        costo_equipos: 0,
        costo_total: 850000,
        costo_acumulado: 1000000,
        porcentaje_avance: 100,
      },
    ],
  },
};

describe('renderCurvaInversion', () => {
  it('genera HTML con título y meta correctos', () => {
    const html = renderCurvaInversion(baseData);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Casa Test');
    expect(html).toContain('Curva de inversión');
    expect(html).toContain('semanal');
    expect(html).toContain('Tucumán');
    expect(html).toContain('2026');
  });

  it('incluye el resumen de métricas', () => {
    const html = renderCurvaInversion(baseData);
    expect(html).toContain('Total obra');
    expect(html).toContain('Materiales');
    expect(html).toContain('Mano de obra');
    expect(html).toContain('14 días');
  });

  it('renderiza un SVG con la curva acumulada', () => {
    const html = renderCurvaInversion(baseData);
    expect(html).toContain('<svg');
    expect(html).toContain('</svg>');
    expect(html).toMatch(/<path d="M/);
    expect(html).toContain('curva-svg');
  });

  it('el SVG incluye gridlines, line y area', () => {
    const html = renderCurvaInversion(baseData);
    // 3 gridlines (25%, 50%, 75%)
    const gridlines = (html.match(/stroke="rgba\(201,168,76,0\.08\)"/g) || []).length;
    expect(gridlines).toBeGreaterThanOrEqual(3);
    expect(html).toContain('fill="rgba(201,168,76,0.12)"'); // area
    expect(html).toContain(`stroke="${GOLD_COLOR()}" stroke-width="2.5"`); // line
  });

  it('incluye la tabla de detalle por periodo', () => {
    const html = renderCurvaInversion(baseData);
    expect(html).toContain('Detalle por periodo');
    expect(html).toContain('P1');
    expect(html).toContain('P2');
    expect(html).toContain('T1');
    expect(html).toContain('T2');
    expect(html).toContain('Materiales');
    expect(html).toContain('Mano de obra');
    expect(html).toContain('Equipos');
  });

  it('las barras de gasto parcial son proporcionales al costo', () => {
    const html = renderCurvaInversion(baseData);
    // P1: 150k / max(150k, 850k) = 17.65% (redondeado a 2 decimales).
    expect(html).toMatch(/width: 17\.65%/);
    // P2: 850k / 850k = 100%
    expect(html).toMatch(/width: 100%/);
  });

  it('muestra los porcentajes de avance', () => {
    const html = renderCurvaInversion(baseData);
    expect(html).toContain('15.0%');
    expect(html).toContain('100.0%');
  });

  it('escapa HTML en los campos', () => {
    const html = renderCurvaInversion({
      ...baseData,
      proyecto: { nombre: '<script>alert(1)</script>' },
    });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('funciona con curva mensual', () => {
    const html = renderCurvaInversion({
      ...baseData,
      curva: { ...baseData.curva, granularidad: 'mensual' },
    });
    expect(html).toContain('mensual');
  });
});

function GOLD_COLOR() {
  return '#C9A84C';
}
