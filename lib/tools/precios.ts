/**
 * Tool: buscar_precio
 *
 * Busca materiales en el CSV de precios del NOA (825 items, 112 categorías).
 * Soporta búsqueda por término libre y filtro por categoría.
 *
 * Implementa el script `buscar_precio.py` original de SoyLeo AI pero
 * con búsqueda en memoria (mucho más rápido).
 */

import type Anthropic from '@anthropic-ai/sdk';
import type { Tool, BuscarPrecioInput, BuscarPrecioOutput } from './types';
import preciosData from '../../data/precios-noa.json';

interface PrecioItem {
  id: string;
  proveedor: string;
  categoria: string;
  codigo: string;
  descripcion: string;
  precio: number;
}

const items: PrecioItem[] = preciosData.items as PrecioItem[];

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function calcular(input: BuscarPrecioInput): BuscarPrecioOutput {
  const termino = normalizar(input.termino.trim());
  if (!termino) {
    return {
      termino: input.termino,
      total_encontrados: 0,
      resultados: [],
    };
  }

  let resultados = items.filter((item) => {
    const matchDescripcion = normalizar(item.descripcion).includes(termino);
    const matchCategoria = normalizar(item.categoria).includes(termino);
    const matchCodigo = normalizar(item.codigo).includes(termino);
    return matchDescripcion || matchCategoria || matchCodigo;
  });

  if (input.categoria) {
    const cat = normalizar(input.categoria);
    resultados = resultados.filter((i) => normalizar(i.categoria).includes(cat));
  }

  const limit = Math.min(input.limit ?? 10, 50);
  const top = resultados.slice(0, limit);

  return {
    termino: input.termino,
    total_encontrados: resultados.length,
    resultados: top.map((r) => ({
      id: r.id,
      descripcion: r.descripcion,
      categoria: r.categoria,
      proveedor: r.proveedor,
      precio: r.precio,
      codigo: r.codigo,
    })),
  };
}

const schema: Anthropic.Tool = {
  name: 'buscar_precio',
  description:
    'Busca materiales y sus precios en la lista actualizada del NOA (825 items, 112 categorías). Busca por descripción, código o categoría. Devuelve hasta N resultados ordenados por relevancia.',
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
    },
    required: ['termino'],
  },
};

export const buscarPrecioTool: Tool<BuscarPrecioInput, BuscarPrecioOutput> = {
  name: schema.name,
  description: schema.description,
  schema,
  execute: calcular,
};

export { calcular as buscarPrecio };
