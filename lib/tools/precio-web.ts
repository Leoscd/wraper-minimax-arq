/**
 * Tool: buscar_precio_web
 *
 * Búsqueda de precios online de referencia para materiales que no están en
 * ningún dataset regional ni en la lista propia del usuario. Consulta Google
 * Shopping vía Serper.dev (API, no scraper propio: nada de HTML frágil ni
 * problemas de términos de uso) y devuelve resultados estructurados.
 *
 * **Invariante de trazabilidad:** cada precio viaja con comercio, URL y fecha
 * de consulta, y la fuente es siempre `web_retail`. Son precios minoristas
 * online — NO precios de corralón/mayorista de obra — y el asistente debe
 * presentarlos como referencia, nunca mezclados en silencio con el dataset
 * regional o la lista propia.
 *
 * Requiere `SERPER_API_KEY` (serper.dev, tier gratis). Sin la key la tool
 * devuelve un error estructurado para que el modelo lo explique.
 */

import type Anthropic from '@anthropic-ai/sdk';
import type { Tool } from './types';

export interface BuscarPrecioWebInput {
  termino: string;
  limit?: number;
}

export interface PrecioWebEncontrado {
  descripcion: string;
  precio: number;
  moneda: 'ARS';
  comercio: string;
  url: string;
  fuente: 'web_retail';
}

export interface BuscarPrecioWebOutput {
  termino: string;
  total_encontrados: number;
  resultados: PrecioWebEncontrado[];
  fecha_consulta?: string;
  error?: 'busqueda_web_no_configurada' | 'busqueda_web_fallo';
  /** Guía para el modelo sobre cómo presentar (o no) estos precios. */
  mensaje?: string;
}

/** Forma relevante de la respuesta del endpoint /shopping de Serper. */
interface SerperShoppingItem {
  title?: string;
  source?: string;
  link?: string;
  price?: string;
}

/**
 * Parsea precios en formato argentino ("$ 12.345,67") o anglosajón
 * ("ARS 12,345.67") a número. Devuelve null si no hay dígitos.
 */
export function parsearPrecio(texto: string): number | null {
  const limpio = texto.replace(/[^\d.,]/g, '');
  if (!/\d/.test(limpio)) return null;
  const ultimaComa = limpio.lastIndexOf(',');
  const ultimoPunto = limpio.lastIndexOf('.');

  let normalizado: string;
  if (ultimaComa !== -1 && ultimoPunto !== -1) {
    // Ambos separadores: el que aparece último es el decimal.
    normalizado =
      ultimaComa > ultimoPunto
        ? limpio.replace(/\./g, '').replace(',', '.')
        : limpio.replace(/,/g, '');
  } else if (ultimaComa !== -1 || ultimoPunto !== -1) {
    // Un solo tipo de separador: si se repite o va seguido de exactamente
    // 3 dígitos es de miles ("$14.161" son catorce mil); si no, decimal.
    const sep = ultimaComa !== -1 ? ',' : '.';
    const idx = Math.max(ultimaComa, ultimoPunto);
    const repetido = limpio.indexOf(sep) !== idx;
    const digitosDespues = limpio.length - idx - 1;
    if (repetido || digitosDespues === 3) {
      normalizado = limpio.replace(/[.,]/g, '');
    } else {
      normalizado = limpio.replace(sep, '.');
    }
  } else {
    normalizado = limpio;
  }

  const n = Number(normalizado);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const MENSAJE_PRESENTACION =
  'Estos son precios minoristas online (retail), NO de corralón ni mayorista ' +
  'de obra: presentalos siempre como referencia de orden de magnitud, citando ' +
  'comercio y fecha de consulta de cada uno. Si los usás en un cómputo, ' +
  'aclaralo y no los mezcles en silencio con el dataset regional ni con la ' +
  'lista propia del usuario.';

async function ejecutar(input: BuscarPrecioWebInput): Promise<BuscarPrecioWebOutput> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    return {
      termino: input.termino,
      total_encontrados: 0,
      resultados: [],
      error: 'busqueda_web_no_configurada',
      mensaje:
        'La búsqueda de precios online no está configurada en este entorno ' +
        '(falta SERPER_API_KEY). Decile al usuario que esa opción no está ' +
        'disponible por ahora y ofrecele cargar su propia lista de precios.',
    };
  }

  const limit = Math.min(input.limit ?? 5, 10);
  let items: SerperShoppingItem[];
  try {
    const res = await fetch('https://google.serper.dev/shopping', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: input.termino, gl: 'ar', hl: 'es' }),
    });
    if (!res.ok) throw new Error(`Serper respondió ${res.status}`);
    const data = await res.json();
    items = Array.isArray(data.shopping) ? data.shopping : [];
  } catch {
    return {
      termino: input.termino,
      total_encontrados: 0,
      resultados: [],
      error: 'busqueda_web_fallo',
      mensaje:
        'La búsqueda de precios online falló (servicio no disponible). ' +
        'Decíselo al usuario sin inventar precios y ofrecele reintentar o ' +
        'cargar su propia lista.',
    };
  }

  const resultados: PrecioWebEncontrado[] = [];
  for (const item of items) {
    const precio = item.price ? parsearPrecio(item.price) : null;
    if (precio === null || !item.title) continue;
    resultados.push({
      descripcion: item.title,
      precio,
      moneda: 'ARS',
      comercio: item.source ?? 'Comercio online',
      url: item.link ?? '',
      fuente: 'web_retail',
    });
    if (resultados.length >= limit) break;
  }

  return {
    termino: input.termino,
    total_encontrados: resultados.length,
    resultados,
    fecha_consulta: new Date().toISOString().slice(0, 10),
    mensaje: MENSAJE_PRESENTACION,
  };
}

const schema: Anthropic.Tool = {
  name: 'buscar_precio_web',
  description:
    'Busca precios minoristas online (Google Shopping, Argentina) de un material. Usar SOLO cuando el material no está en el dataset regional ni en la lista propia del usuario, y el usuario aceptó una referencia online. Devuelve precios estructurados con comercio, URL y fecha; la fuente es siempre "web_retail" (retail, no corralón) y debe citarse al presentar cada precio.',
  input_schema: {
    type: 'object',
    properties: {
      termino: {
        type: 'string',
        description:
          'Material a buscar, lo más específico posible. Ej: "cemento portland 50kg", "hierro aletado 8mm barra 12m".',
        minLength: 3,
      },
      limit: {
        type: 'number',
        description: 'Cantidad máxima de resultados. Default: 5, máximo: 10.',
        default: 5,
        minimum: 1,
        maximum: 10,
      },
    },
    required: ['termino'],
  },
};

export const buscarPrecioWebTool: Tool<BuscarPrecioWebInput, Promise<BuscarPrecioWebOutput>> = {
  name: schema.name!,
  description: schema.description!,
  schema,
  execute: ejecutar,
};

export { ejecutar as buscarPrecioWeb };
