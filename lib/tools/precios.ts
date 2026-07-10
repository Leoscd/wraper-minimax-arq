/**
 * Tool: buscar_precio
 *
 * Busca materiales en la lista de precios de una región (default NOA) y,
 * si el usuario cargó una lista propia en la sesión (ToolContext), también
 * en esa lista. Los resultados propios van primero y cada uno declara su
 * `fuente` para que el asistente siempre pueda citar de dónde salió el precio.
 *
 * Implementa el script `buscar_precio.py` original de SoyLeo AI pero
 * con búsqueda en memoria (mucho más rápido). El dataset ahora es adaptable
 * por región: se resuelve vía `getPreciosDataset` en vez de un import fijo.
 */

import type Anthropic from '@anthropic-ai/sdk';
import type {
  Tool,
  ToolContext,
  BuscarPrecioInput,
  BuscarPrecioOutput,
  PrecioEncontrado,
} from './types';
import {
  getPreciosDataset,
  regionesDisponibles,
  resolverRegion,
  REGION_DEFAULT,
} from '../data/precios';

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Filtro por término (descripción/categoría/código) + categoría opcional. */
function filtrar<T extends { descripcion: string; categoria?: string; codigo?: string }>(
  items: T[],
  termino: string,
  categoria?: string
): T[] {
  let resultados = items.filter((item) => {
    const matchDescripcion = normalizar(item.descripcion).includes(termino);
    const matchCategoria = normalizar(item.categoria ?? '').includes(termino);
    const matchCodigo = normalizar(item.codigo ?? '').includes(termino);
    return matchDescripcion || matchCategoria || matchCodigo;
  });

  if (categoria) {
    const cat = normalizar(categoria);
    resultados = resultados.filter((i) => normalizar(i.categoria ?? '').includes(cat));
  }

  return resultados;
}

function calcular(input: BuscarPrecioInput, ctx?: ToolContext): BuscarPrecioOutput {
  const pedida = input.region ?? REGION_DEFAULT;
  const { region, provincia } = resolverRegion(pedida);
  const dataset = getPreciosDataset(region);
  const propios = ctx?.preciosPropios ?? [];

  if (!dataset && propios.length === 0) {
    const contexto = provincia
      ? `La provincia ${provincia} pertenece a la región ${region}, que todavía no tiene dataset de precios. `
      : 'No hay dataset de precios cargado para esa región. ';
    return {
      termino: input.termino,
      total_encontrados: 0,
      resultados: [],
      error: 'region_no_disponible',
      region_pedida: pedida,
      region_resuelta: region,
      ...(provincia ? { provincia } : {}),
      regiones_disponibles: regionesDisponibles(),
      mensaje:
        contexto +
        'Explicale al usuario (nombrando la región que le corresponde si pidió ' +
        'una provincia) y ofrecele: (a) cargar su propia lista de precios ' +
        '(adjuntando un CSV o pegándola en el chat), o (b) consultar la lista ' +
        'NOA aclarando que es de otra región.',
    };
  }

  const termino = normalizar(input.termino.trim());
  if (!termino) {
    return {
      termino: input.termino,
      total_encontrados: 0,
      resultados: [],
      ...(dataset ? { region_usada: dataset.metadata.region } : {}),
    };
  }

  // Ids sintéticos estables por posición en la lista cargada.
  const propiosConId: PrecioEncontrado[] = propios.map((p, i) => ({
    id: `PROPIO-${String(i + 1).padStart(4, '0')}`,
    descripcion: p.descripcion,
    categoria: p.categoria ?? '',
    proveedor: p.proveedor ?? 'Lista propia del usuario',
    precio: p.precio,
    codigo: p.codigo ?? '',
    fuente: 'lista_propia',
  }));

  const matchPropios = filtrar(propiosConId, termino, input.categoria);
  const matchDataset = dataset ? filtrar(dataset.items, termino, input.categoria) : [];

  // Los resultados propios nunca se truncan a favor del dataset:
  // llenan el límite primero y el dataset completa el cupo restante.
  const limit = Math.min(input.limit ?? 10, 50);
  const topPropios = matchPropios.slice(0, limit);
  const cupoDataset = Math.max(0, limit - topPropios.length);
  const topDataset: PrecioEncontrado[] = matchDataset.slice(0, cupoDataset).map((r) => ({
    id: r.id,
    descripcion: r.descripcion,
    categoria: r.categoria,
    proveedor: r.proveedor,
    precio: r.precio,
    codigo: r.codigo,
    fuente: 'dataset',
  }));

  return {
    termino: input.termino,
    total_encontrados: matchPropios.length + matchDataset.length,
    resultados: [...topPropios, ...topDataset],
    ...(propios.length > 0 ? { total_lista_propia: matchPropios.length } : {}),
    ...(dataset
      ? { total_dataset: matchDataset.length, region_usada: dataset.metadata.region }
      : {
          mensaje:
            `No hay dataset regional para "${region}": los resultados provienen ` +
            'únicamente de la lista propia cargada por el usuario. Aclaráselo.',
        }),
  };
}

const schema: Anthropic.Tool = {
  name: 'buscar_precio',
  description:
    'Busca materiales y sus precios en la lista actualizada de la región (default NOA: 825 items, 112 categorías). Busca por descripción, código o categoría. Devuelve hasta N resultados ordenados por relevancia. Si el usuario cargó su propia lista de precios en la sesión, los resultados la incluyen primero, marcados con fuente "lista_propia"; los del dataset regional llevan fuente "dataset".',
  input_schema: {
    type: 'object',
    properties: {
      termino: {
        type: 'string',
        description:
          'Término de búsqueda. Ej: "cemento loma negra", "hierro 12mm", "ceramico".',
        minLength: 2,
      },
      categoria: {
        type: 'string',
        description:
          'Filtrar por categoría específica. Opcional. Ej: "CEMENTO", "HIERROS", "PINTURAS".',
      },
      limit: {
        type: 'number',
        description: 'Cantidad máxima de resultados. Default: 10, máximo: 50.',
        default: 10,
        minimum: 1,
        maximum: 50,
      },
      region: {
        type: 'string',
        description:
          'Región o provincia argentina de la lista de precios a consultar. Opcional. Default: "NOA". Acepta regiones (NOA, NEA, Centro, Cuyo, Patagonia) o nombres de provincia ("Neuquén" resuelve a Patagonia, "Salta" a NOA). Si no hay dataset para la región resuelta, la tool devuelve error "region_no_disponible" con la región a la que pertenece la provincia y las regiones disponibles (no hace fallback).',
        default: 'NOA',
      },
    },
    required: ['termino'],
  },
};

export const buscarPrecioTool: Tool<BuscarPrecioInput, BuscarPrecioOutput> = {
  name: schema.name!,
  description: schema.description!,
  schema,
  execute: calcular,
};

export { calcular as buscarPrecio };
