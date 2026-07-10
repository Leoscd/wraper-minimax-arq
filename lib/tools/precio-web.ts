/**
 * Tool: buscar_precio_web
 *
 * Búsqueda de precios online de referencia para materiales que no están en
 * ningún dataset regional ni en la lista propia del usuario. Usa una API de
 * búsqueda (no un scraper propio: nada de HTML frágil ni problemas de
 * términos de uso) y devuelve resultados estructurados.
 *
 * Proveedores soportados (se elige por env, en este orden):
 * - `SERPER_API_KEY` → Serper.dev, endpoint /shopping (Google Shopping AR):
 *   precio ya estructurado por resultado.
 * - `TAVILY_API_KEY` → Tavily search: el precio se extrae del texto del
 *   resultado con `extraerPrecio` y se acompaña del fragmento de contexto.
 *
 * **Invariante de trazabilidad:** cada precio viaja con comercio, URL y fecha
 * de consulta, y la fuente es siempre `web_retail`. Son precios minoristas
 * online — NO precios de corralón/mayorista de obra — y el asistente debe
 * presentarlos como referencia, nunca mezclados en silencio con el dataset
 * regional o la lista propia.
 *
 * Sin ninguna key la tool devuelve un error estructurado para que el modelo
 * lo explique sin inventar precios.
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
  /** Fragmento del texto de donde se extrajo el precio (solo Tavily). */
  contexto?: string;
}

export interface BuscarPrecioWebOutput {
  termino: string;
  total_encontrados: number;
  resultados: PrecioWebEncontrado[];
  fecha_consulta?: string;
  proveedor?: 'serper' | 'tavily';
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

/** Forma relevante de un resultado de Tavily search. */
interface TavilyResult {
  title?: string;
  url?: string;
  content?: string;
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

/**
 * Extrae el primer precio plausible de un texto libre ("$10.049,00 c/u",
 * "12.652,85 ARS"). Requiere el ancla $ o ARS para no confundir cantidades
 * ("50 kg") con precios, y descarta montos menores a $100 (ruido). Devuelve
 * también el fragmento alrededor para que el modelo pueda juzgar el contexto.
 */
export function extraerPrecio(
  texto: string
): { precio: number; contexto: string } | null {
  const patron = /(?:\$\s?([\d][\d.,]*)|([\d][\d.,]*)\s?ARS)/gi;
  for (const m of texto.matchAll(patron)) {
    const crudo = m[1] ?? m[2];
    const precio = parsearPrecio(crudo);
    if (precio === null || precio < 100) continue;
    const desde = Math.max(0, (m.index ?? 0) - 45);
    const hasta = Math.min(texto.length, (m.index ?? 0) + m[0].length + 45);
    return { precio, contexto: texto.slice(desde, hasta).trim() };
  }
  return null;
}

const MENSAJE_PRESENTACION =
  'Estos son precios minoristas online (retail), NO de corralón ni mayorista ' +
  'de obra: presentalos siempre como referencia de orden de magnitud, citando ' +
  'comercio y fecha de consulta de cada uno. Si los usás en un cómputo, ' +
  'aclaralo y no los mezcles en silencio con el dataset regional ni con la ' +
  'lista propia del usuario.';

function errorFallo(termino: string): BuscarPrecioWebOutput {
  return {
    termino,
    total_encontrados: 0,
    resultados: [],
    error: 'busqueda_web_fallo',
    mensaje:
      'La búsqueda de precios online falló (servicio no disponible). ' +
      'Decíselo al usuario sin inventar precios y ofrecele reintentar o ' +
      'cargar su propia lista.',
  };
}

async function buscarSerper(
  termino: string,
  limit: number,
  apiKey: string
): Promise<PrecioWebEncontrado[]> {
  const res = await fetch('https://google.serper.dev/shopping', {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ q: termino, gl: 'ar', hl: 'es' }),
  });
  if (!res.ok) throw new Error(`Serper respondió ${res.status}`);
  const data = await res.json();
  const items: SerperShoppingItem[] = Array.isArray(data.shopping)
    ? data.shopping
    : [];

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
  return resultados;
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Comercio online';
  }
}

async function buscarTavily(
  termino: string,
  limit: number,
  apiKey: string
): Promise<PrecioWebEncontrado[]> {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `precio ${termino} comprar argentina`,
      max_results: Math.min(limit * 2, 10),
      country: 'argentina',
    }),
  });
  if (!res.ok) throw new Error(`Tavily respondió ${res.status}`);
  const data = await res.json();
  const items: TavilyResult[] = Array.isArray(data.results) ? data.results : [];

  const resultados: PrecioWebEncontrado[] = [];
  for (const item of items) {
    if (!item.title || !item.url) continue;
    const extraido = extraerPrecio(`${item.title} ${item.content ?? ''}`);
    if (!extraido) continue;
    resultados.push({
      descripcion: item.title,
      precio: extraido.precio,
      moneda: 'ARS',
      comercio: hostname(item.url),
      url: item.url,
      fuente: 'web_retail',
      contexto: extraido.contexto,
    });
    if (resultados.length >= limit) break;
  }
  return resultados;
}

async function ejecutar(input: BuscarPrecioWebInput): Promise<BuscarPrecioWebOutput> {
  const serperKey = process.env.SERPER_API_KEY;
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (!serperKey && !tavilyKey) {
    return {
      termino: input.termino,
      total_encontrados: 0,
      resultados: [],
      error: 'busqueda_web_no_configurada',
      mensaje:
        'La búsqueda de precios online no está configurada en este entorno ' +
        '(falta SERPER_API_KEY o TAVILY_API_KEY). Decile al usuario que esa ' +
        'opción no está disponible por ahora y ofrecele cargar su propia ' +
        'lista de precios.',
    };
  }

  const limit = Math.min(input.limit ?? 5, 10);
  const proveedor = serperKey ? 'serper' : 'tavily';
  let resultados: PrecioWebEncontrado[];
  try {
    resultados = serperKey
      ? await buscarSerper(input.termino, limit, serperKey)
      : await buscarTavily(input.termino, limit, tavilyKey!);
  } catch {
    return errorFallo(input.termino);
  }

  return {
    termino: input.termino,
    total_encontrados: resultados.length,
    resultados,
    fecha_consulta: new Date().toISOString().slice(0, 10),
    proveedor,
    mensaje: MENSAJE_PRESENTACION,
  };
}

const schema: Anthropic.Tool = {
  name: 'buscar_precio_web',
  description:
    'Busca precios minoristas online (Argentina) de un material vía una API de búsqueda. Usar SOLO cuando el material no está en el dataset regional ni en la lista propia del usuario, y el usuario aceptó una referencia online. Devuelve precios estructurados con comercio, URL y fecha; la fuente es siempre "web_retail" (retail, no corralón) y debe citarse al presentar cada precio.',
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
