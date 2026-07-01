import { describe, it, expect } from 'vitest';
import { renderCronogramaGantt } from './cronograma-gantt';

const baseData = {
  proyecto: {
    nombre: 'Casa Test',
    ubicacion: 'Tucumán',
    año: '2026',
  },
  cronograma: {
    duracion_total_dias: 18,
    fin_proyecto_dia: 18,
    camino_critico: ['T1', 'T2', 'T3'],
    tareas: [
      {
        id: 'T1',
        nombre: 'Excavación',
        duracion_dias: 3,
        inicio_dia: 1,
        fin_dia: 3,
        holgura_dias: 0,
        critica: true,
        predecesoras: [],
      },
      {
        id: 'T2',
        nombre: 'Fundaciones',
        duracion_dias: 5,
        inicio_dia: 4,
        fin_dia: 8,
        holgura_dias: 0,
        critica: true,
        predecesoras: ['T1'],
      },
      {
        id: 'T3',
        nombre: 'Estructura',
        duracion_dias: 10,
        inicio_dia: 9,
        fin_dia: 18,
        holgura_dias: 0,
        critica: true,
        predecesoras: ['T2'],
      },
    ],
  },
};

describe('renderCronogramaGantt', () => {
  it('genera HTML con título y meta correctos', () => {
    const html = renderCronogramaGantt(baseData);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Casa Test');
    expect(html).toContain('Cronograma');
    expect(html).toContain('Tucumán');
    expect(html).toContain('2026');
  });

  it('incluye el resumen de métricas', () => {
    const html = renderCronogramaGantt(baseData);
    expect(html).toContain('18 días'); // duracion
    expect(html).toContain('3 tareas'); // camino critico
    expect(html).toContain('día 1');
    expect(html).toContain('día 18');
  });

  it('renderiza una fila por tarea en el Gantt', () => {
    const html = renderCronogramaGantt(baseData);
    const rowsCount = (html.match(/class="gantt-row"/g) || []).length;
    expect(rowsCount).toBe(3);
  });

  it('marca las tareas críticas con la clase correcta', () => {
    const html = renderCronogramaGantt(baseData);
    // Match solo en class="..." del HTML, no en el CSS del <style>.
    const criticalBars = (html.match(/class="gantt-bar gantt-bar-critical"/g) || []).length;
    expect(criticalBars).toBe(3); // T1, T2, T3 son críticas
  });

  it('calcula offsets y anchos proporcionales a la duración', () => {
    const html = renderCronogramaGantt(baseData);
    // T1: 3 días, inicia día 1. left=(1-1)/18*100=0, width=3/18*100=16.67
    expect(html).toMatch(/left: 0%; width: 16\.666666666666664%/);
    // T2: 5 días, inicia día 4. left=(4-1)/18*100=16.67, width=5/18*100=27.78
    expect(html).toMatch(/left: 16\.666666666666664%; width: 27\.77777777777778%/);
  });

  it('marca tareas no críticas con clase normal', () => {
    const html = renderCronogramaGantt({
      ...baseData,
      cronograma: {
        ...baseData.cronograma,
        tareas: [
          {
            id: 'A',
            nombre: 'A',
            duracion_dias: 5,
            inicio_dia: 1,
            fin_dia: 5,
            holgura_dias: 3,
            critica: false,
            predecesoras: [],
          },
        ],
        camino_critico: [],
      },
    });
    expect(html).toContain('class="gantt-bar gantt-bar-normal"');
    expect(html).not.toContain('class="gantt-bar gantt-bar-critical"');
  });

  it('incluye la tabla de detalle de tareas', () => {
    const html = renderCronogramaGantt(baseData);
    expect(html).toContain('Detalle de tareas');
    expect(html).toContain('T1');
    expect(html).toContain('T2');
    expect(html).toContain('T3');
    expect(html).toContain('Excavación');
    expect(html).toContain('CRÍTICA');
  });

  it('renderiza la curva de inversion cuando se pasa', () => {
    const html = renderCronogramaGantt({
      ...baseData,
      curva: {
        granularidad: 'semanal' as const,
        duracion_total_dias: 14,
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
    });
    expect(html).toContain('Curva de inversión');
    expect(html).toContain('curva-bar');
  });

  it('escapa HTML en los nombres de tareas', () => {
    const html = renderCronogramaGantt({
      ...baseData,
      cronograma: {
        ...baseData.cronograma,
        tareas: [
          {
            id: 'X',
            nombre: '<script>alert(1)</script>',
            duracion_dias: 5,
            inicio_dia: 1,
            fin_dia: 5,
            holgura_dias: 0,
            critica: true,
            predecesoras: [],
          },
        ],
      },
    });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
