/**
 * Tool: calcular_cronograma
 *
 * Calcula el cronograma de obra con método del camino crítico (CPM):
 *   1. Forward pass: ES (Early Start) y EF (Early Finish) por tarea.
 *   2. Backward pass: LS (Late Start) y LF (Late Finish) desde el final del proyecto.
 *   3. Holgura = LS - ES. Tareas con holgura = 0 → camino crítico.
 *
 * Implementa el algoritmo CPM clásico (no recursos-nivelados): cada tarea
 * arranca apenas todas sus predecesoras terminan. Es determinístico y no
 * consulta APIs externas; todo se resuelve en una pasada.
 *
 * Referencia: SKILL.md original, sección 'FASE 3: CRONOGRAMA DE OBRA'.
 */

import type Anthropic from '@anthropic-ai/sdk';
import type { Tool, CronogramaInput, CronogramaOutput, CronogramaTareaOutput } from './types';

function calcular(input: CronogramaInput): CronogramaOutput {
  if (!input.tareas || input.tareas.length === 0) {
    throw new Error('Se requiere al menos una tarea en el cronograma.');
  }

  const ids = new Set<string>();
  for (const t of input.tareas) {
    if (!t.id || !t.nombre) {
      throw new Error('Cada tarea debe tener id y nombre.');
    }
    if (t.duracion_dias <= 0) {
      throw new Error(`La tarea "${t.id}" debe tener duracion_dias > 0.`);
    }
    if (ids.has(t.id)) {
      throw new Error(`ID de tarea duplicado: "${t.id}".`);
    }
    ids.add(t.id);
  }

  for (const t of input.tareas) {
    for (const pred of t.predecesoras ?? []) {
      if (!ids.has(pred)) {
        throw new Error(
          `La tarea "${t.id}" tiene predecesora "${pred}" que no existe.`
        );
      }
      if (pred === t.id) {
        throw new Error(`La tarea "${t.id}" se predecede a sí misma.`);
      }
    }
  }

  const inicioProyecto = input.inicio_proyecto_dia ?? 1;

  const tareasMap = new Map<string, { input: typeof input.tareas[number]; es: number; ef: number; ls: number; lf: number }>();
  for (const t of input.tareas) {
    tareasMap.set(t.id, { input: t, es: 0, ef: 0, ls: 0, lf: 0 });
  }

  const ordenEjecucion: string[] = [];
  const visitados = new Set<string>();
  const enStack = new Set<string>();

  function topoSort(id: string): void {
    if (enStack.has(id)) {
      throw new Error(`Dependencia circular detectada en "${id}".`);
    }
    if (visitados.has(id)) return;
    visitados.add(id);
    enStack.add(id);
    const t = tareasMap.get(id)!;
    for (const pred of t.input.predecesoras ?? []) {
      topoSort(pred);
    }
    enStack.delete(id);
    ordenEjecucion.push(id);
  }

  for (const t of input.tareas) {
    topoSort(t.id);
  }

  for (const id of ordenEjecucion) {
    const t = tareasMap.get(id)!;
    const preds = t.input.predecesoras ?? [];
    const earliestStart =
      preds.length === 0
        ? inicioProyecto
        : Math.max(...preds.map((p) => tareasMap.get(p)!.ef)) + 1;
    t.es = earliestStart;
    t.ef = earliestStart + t.input.duracion_dias - 1;
  }

  let projectEnd = inicioProyecto - 1;
  for (const t of tareasMap.values()) {
    if (t.ef > projectEnd) projectEnd = t.ef;
  }

  for (let i = ordenEjecucion.length - 1; i >= 0; i--) {
    const id = ordenEjecucion[i];
    const t = tareasMap.get(id)!;

    const sucesoras = input.tareas.filter(
      (other) => (other.predecesoras ?? []).includes(id)
    );
    t.lf =
      sucesoras.length === 0
        ? projectEnd
        : Math.min(...sucesoras.map((s) => tareasMap.get(s.id)!.es)) - 1;
    t.ls = t.lf - t.input.duracion_dias + 1;
  }

  const tareasOutput: CronogramaTareaOutput[] = [];
  const caminoCritico: string[] = [];

  for (const t of input.tareas) {
    const calc = tareasMap.get(t.id)!;
    const holgura = calc.ls - calc.es;
    const critica = holgura === 0;
    if (critica) caminoCritico.push(t.id);

    tareasOutput.push({
      id: t.id,
      nombre: t.nombre,
      duracion_dias: t.duracion_dias,
      inicio_dia: calc.es,
      fin_dia: calc.ef,
      holgura_dias: holgura,
      critica,
      predecesoras: t.predecesoras ?? [],
    });
  }

  tareasOutput.sort((a, b) => a.inicio_dia - b.inicio_dia);

  const resumen =
    `Cronograma de ${input.tareas.length} tareas, ` +
    `duración total: ${projectEnd - inicioProyecto + 1} días. ` +
    `Camino crítico: ${caminoCritico.length} tareas (${caminoCritico.join(', ')}).`;

  return {
    inicio_proyecto_dia: inicioProyecto,
    duracion_total_dias: projectEnd - inicioProyecto + 1,
    fin_proyecto_dia: projectEnd,
    tareas: tareasOutput,
    camino_critico: caminoCritico,
    resumen,
  };
}

const schema: Anthropic.Tool = {
  name: 'calcular_cronograma',
  description:
    'Calcula el cronograma de obra usando el método del camino crítico (CPM). Recibe una lista de tareas con su duración en días y sus tareas predecesoras. Devuelve cada tarea con inicio/fin, holgura y si es crítica. Pensado para obras de construcción con dependencias constructivas (fundaciones → estructura → mamposterías → revoques → instalaciones → terminaciones).',
  input_schema: {
    type: 'object',
    properties: {
      tareas: {
        type: 'array',
        description:
          'Lista de tareas. Cada una con id, nombre, duracion_dias y opcionalmente predecesoras (array de IDs).',
        minItems: 1,
        items: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Identificador único de la tarea (ej: "T01", "fundaciones").',
            },
            nombre: {
              type: 'string',
              description: 'Nombre legible (ej: "Fundaciones").',
            },
            duracion_dias: {
              type: 'number',
              description: 'Duración estimada en días corridos.',
              minimum: 1,
            },
            predecesoras: {
              type: 'array',
              items: { type: 'string' },
              description: 'IDs de las tareas que deben terminar antes de que esta arranque.',
            },
          },
          required: ['id', 'nombre', 'duracion_dias'],
        },
      },
      inicio_proyecto_dia: {
        type: 'number',
        description: 'Día de inicio del proyecto. Default: 1.',
        default: 1,
        minimum: 1,
      },
    },
    required: ['tareas'],
  },
};

export const calcularCronogramaTool: Tool<CronogramaInput, CronogramaOutput> = {
  name: schema.name!,
  description: schema.description!,
  schema,
  execute: calcular,
};

export { calcular as calcularCronograma };
