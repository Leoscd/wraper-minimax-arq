/**
 * Tool: buscar_precio_web
 *
 * Búsqueda de precios online de referencia para materiales que no están en
 * ningún dataset regional ni en la lista propia del usuario. Usa una API de
 * búsqueda (no un scraper propio: nada de HTML frágil ni problemas de
 * términos de uso) y devuelve resultados estructurados.
 *
 * Cubre toda Latinoamérica: el parámetro `pais` (default Argentina) elige la
 * configuración de búsqueda (código de país de Google, país de Tavily) y de
 * moneda (anclas para extraer precios del texto, moneda local del resultado).
 * `lugar` enfoca la búsqueda en una provincia/departamento/ciudad; la
 * geografía (qué lugar pertenece a qué país) la resuelve el modelo, no esta
 * tool.
 *
 * Proveedores soportados (se elige por env, en este orden):
 * - `SERPER_API_KEY` → Serper.dev, endpoint /shopping (Google Shopping del
 *   país): precio ya estructurado por resultado.
 * - `TAVILY_API_KEY` → Tavily search: el precio se extrae del texto del
 *   resultado con `extraerPrecio` y se acompaña del fragmento de contexto.
 *
 * **Invariante de trazabilidad:** cada precio viaja con comercio, URL, fecha
 * de consulta y moneda local, y la fuente es siempre `web_retail`. Son precios
 * minoristas online — NO precios de corralón/mayorista de obra — y el
 * asistente debe presentarlos como referencia, nunca mezclados en silencio
 * con el dataset regional o la lista propia.
 *
 * Sin ninguna key la tool devuelve un error estructurado para que el modelo
 * lo explique sin inventar precios.
 */

import type Anthropic from '@anthropic-ai/sdk';
import type { Tool } from './types';

export interface BuscarPrecioWebInput {
  termino: string;
  pais?: string;
  lugar?: string;
  limit?: number;
}

export interface PrecioWebEncontrado {
  descripcion: string;
  precio: number;
  /** Moneda local del país buscado (ARS, UYU, BRL, USD...). */
  moneda: string;
  comercio: string;
  url: string;
  fuente: 'web_retail';
  /** Fragmento del texto de donde se extrajo el precio (solo Tavily). */
  contexto?: string;
}

export interface BuscarPrecioWebOutput {
  termino: string;
  pais?: string;
  lugar?: string;
  total_encontrados: number;
  resultados: PrecioWebEncontrado[];
  fecha_consulta?: string;
  proveedor?: 'serper' | 'tavily';
  error?:
    | 'busqueda_web_no_configurada'
    | 'busqueda_web_fallo'
    | 'pais_no_soportado';
  /** Guía para el modelo sobre cómo presentar (o no) estos precios. */
  mensaje?: string;
}

/** Configuración de búsqueda y moneda de un país soportado. */
export interface PaisBusqueda {
  /** Nombre canónico para mostrar y para armar la query. */
  nombre: string;
  /** Código de país de Google (parámetro `gl` de Serper). */
  gl: string;
  /** Nombre de país que acepta Tavily en `country` (inglés, minúsculas). */
  tavily: string;
  /** Moneda en la que se expresan los precios retail online del país. */
  moneda: string;
  /** Anclas de moneda que preceden al número ("$", "R$", "Gs."...). */
  prefijos: string[];
  /** Códigos/palabras de moneda que siguen al número ("ARS", "soles"...). */
  sufijos: string[];
  /** Monto mínimo plausible para un material; filtra ruido tipo "50 kg". */
  precio_minimo: number;
  /** Idioma de la query de búsqueda. */
  idioma: 'es' | 'pt';
}

/**
 * Países LATAM soportados, claves normalizadas (mayúsculas, sin acentos).
 * En Ecuador, El Salvador, Panamá y Venezuela el retail online cotiza en USD
 * (dolarizados de jure o de facto).
 */
export const PAISES: Record<string, PaisBusqueda> = {
  ARGENTINA: {
    nombre: 'Argentina',
    gl: 'ar',
    tavily: 'argentina',
    moneda: 'ARS',
    prefijos: ['AR$', '$'],
    sufijos: ['ARS'],
    precio_minimo: 100,
    idioma: 'es',
  },
  BOLIVIA: {
    nombre: 'Bolivia',
    gl: 'bo',
    tavily: 'bolivia',
    moneda: 'BOB',
    prefijos: ['Bs.', 'Bs'],
    sufijos: ['BOB', 'bolivianos'],
    precio_minimo: 5,
    idioma: 'es',
  },
  BRASIL: {
    nombre: 'Brasil',
    gl: 'br',
    tavily: 'brazil',
    moneda: 'BRL',
    prefijos: ['R$'],
    sufijos: ['BRL', 'reais'],
    precio_minimo: 3,
    idioma: 'pt',
  },
  CHILE: {
    nombre: 'Chile',
    gl: 'cl',
    tavily: 'chile',
    moneda: 'CLP',
    prefijos: ['$'],
    sufijos: ['CLP'],
    precio_minimo: 500,
    idioma: 'es',
  },
  COLOMBIA: {
    nombre: 'Colombia',
    gl: 'co',
    tavily: 'colombia',
    moneda: 'COP',
    prefijos: ['COL$', '$'],
    sufijos: ['COP'],
    precio_minimo: 1000,
    idioma: 'es',
  },
  'COSTA RICA': {
    nombre: 'Costa Rica',
    gl: 'cr',
    tavily: 'costa rica',
    moneda: 'CRC',
    prefijos: ['₡', 'CRC'],
    sufijos: ['CRC', 'colones'],
    precio_minimo: 500,
    idioma: 'es',
  },
  ECUADOR: {
    nombre: 'Ecuador',
    gl: 'ec',
    tavily: 'ecuador',
    moneda: 'USD',
    prefijos: ['US$', 'USD', '$'],
    sufijos: ['USD'],
    precio_minimo: 1,
    idioma: 'es',
  },
  'EL SALVADOR': {
    nombre: 'El Salvador',
    gl: 'sv',
    tavily: 'el salvador',
    moneda: 'USD',
    prefijos: ['US$', 'USD', '$'],
    sufijos: ['USD'],
    precio_minimo: 1,
    idioma: 'es',
  },
  GUATEMALA: {
    nombre: 'Guatemala',
    gl: 'gt',
    tavily: 'guatemala',
    moneda: 'GTQ',
    prefijos: ['Q.', 'Q'],
    sufijos: ['GTQ', 'quetzales'],
    precio_minimo: 5,
    idioma: 'es',
  },
  HONDURAS: {
    nombre: 'Honduras',
    gl: 'hn',
    tavily: 'honduras',
    moneda: 'HNL',
    prefijos: ['Lps.', 'Lps', 'L.', 'L'],
    sufijos: ['HNL', 'lempiras'],
    precio_minimo: 20,
    idioma: 'es',
  },
  MEXICO: {
    nombre: 'México',
    gl: 'mx',
    tavily: 'mexico',
    moneda: 'MXN',
    prefijos: ['$'],
    sufijos: ['MXN'],
    precio_minimo: 20,
    idioma: 'es',
  },
  NICARAGUA: {
    nombre: 'Nicaragua',
    gl: 'ni',
    tavily: 'nicaragua',
    moneda: 'NIO',
    prefijos: ['C$'],
    sufijos: ['NIO', 'cordobas'],
    precio_minimo: 30,
    idioma: 'es',
  },
  PANAMA: {
    nombre: 'Panamá',
    gl: 'pa',
    tavily: 'panama',
    moneda: 'USD',
    prefijos: ['B/.', 'US$', 'USD', '$'],
    sufijos: ['USD', 'PAB'],
    precio_minimo: 1,
    idioma: 'es',
  },
  PARAGUAY: {
    nombre: 'Paraguay',
    gl: 'py',
    tavily: 'paraguay',
    moneda: 'PYG',
    prefijos: ['₲', 'Gs.', 'Gs'],
    sufijos: ['PYG', 'guaranies'],
    precio_minimo: 1000,
    idioma: 'es',
  },
  PERU: {
    nombre: 'Perú',
    gl: 'pe',
    tavily: 'peru',
    moneda: 'PEN',
    prefijos: ['S/.', 'S/'],
    sufijos: ['PEN', 'soles'],
    precio_minimo: 3,
    idioma: 'es',
  },
  'REPUBLICA DOMINICANA': {
    nombre: 'República Dominicana',
    gl: 'do',
    tavily: 'dominican republic',
    moneda: 'DOP',
    prefijos: ['RD$', '$'],
    sufijos: ['DOP'],
    precio_minimo: 50,
    idioma: 'es',
  },
  URUGUAY: {
    nombre: 'Uruguay',
    gl: 'uy',
    tavily: 'uruguay',
    moneda: 'UYU',
    prefijos: ['$U', '$'],
    sufijos: ['UYU'],
    precio_minimo: 20,
    idioma: 'es',
  },
  VENEZUELA: {
    nombre: 'Venezuela',
    gl: 've',
    tavily: 'venezuela',
    moneda: 'USD',
    prefijos: ['US$', 'USD', '$'],
    sufijos: ['USD'],
    precio_minimo: 1,
    idioma: 'es',
  },
};

/** Nombres alternativos con los que puede llegar un país. */
const ALIAS_PAIS: Record<string, string> = {
  BRAZIL: 'BRASIL',
  MEJICO: 'MEXICO',
  DOMINICANA: 'REPUBLICA DOMINICANA',
  'SANTO DOMINGO': 'REPUBLICA DOMINICANA',
};

export const PAIS_DEFAULT = PAISES.ARGENTINA;

function normalizarPais(entrada: string): string {
  return entrada
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/**
 * Resuelve el nombre de país (con o sin acentos, alias en inglés) a su
 * configuración. Sin entrada devuelve Argentina; si no se reconoce, null.
 */
export function resolverPais(entrada?: string): PaisBusqueda | null {
  if (!entrada || !entrada.trim()) return PAIS_DEFAULT;
  const key = normalizarPais(entrada);
  return PAISES[key] ?? PAISES[ALIAS_PAIS[key]] ?? null;
}

/** Lista legible de países soportados para mensajes de error y schema. */
export const PAISES_SOPORTADOS = Object.values(PAISES)
  .map((p) => p.nombre)
  .sort((a, b) => a.localeCompare(b, 'es'))
  .join(', ');

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
 * Parsea precios en formato latino ("$ 12.345,67") o anglosajón
 * ("ARS 12,345.67") a número. Devuelve null si no hay dígitos.
 */
export function parsearPrecio(texto: string): number | null {
  // Los separadores colgantes son puntuación de la oración, no del número
  // ("$ 993.0. El cemento..." captura "993.0."), y confunden la heurística
  // de miles/decimales.
  const limpio = texto.replace(/[^\d.,]/g, '').replace(/^[.,]+|[.,]+$/g, '');
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

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Regex de precio para las anclas de moneda de un país: prefijo pegado al
 * número ("$ 10.049", "R$ 45,90") o código/palabra pospuesto ("12.652 ARS",
 * "32.50 soles"). El lookbehind evita falsos positivos dentro de otras
 * palabras o símbolos compuestos (la "$" de "U$S" no es un precio en pesos).
 */
function patronPrecio(pais: PaisBusqueda): RegExp {
  const pre = pais.prefijos.map(escapeRegex).join('|');
  const suf = pais.sufijos.map(escapeRegex).join('|');
  return new RegExp(
    `(?:(?<![\\w$])(?:${pre})\\s?([\\d][\\d.,]*)|([\\d][\\d.,]*)\\s?(?:${suf})(?!\\w))`,
    'gi'
  );
}

/**
 * Extrae el primer precio plausible de un texto libre ("$10.049,00 c/u",
 * "R$ 45,90 à vista") según las anclas de moneda del país. Requiere el ancla
 * para no confundir cantidades ("50 kg") con precios, y descarta montos
 * menores al mínimo plausible del país (ruido). Devuelve también el fragmento
 * alrededor para que el modelo pueda juzgar el contexto.
 */
export function extraerPrecio(
  texto: string,
  pais: PaisBusqueda = PAIS_DEFAULT
): { precio: number; contexto: string } | null {
  for (const m of texto.matchAll(patronPrecio(pais))) {
    const crudo = m[1] ?? m[2];
    const precio = parsearPrecio(crudo);
    if (precio === null || precio < pais.precio_minimo) continue;
    const desde = Math.max(0, (m.index ?? 0) - 45);
    const hasta = Math.min(texto.length, (m.index ?? 0) + m[0].length + 45);
    return { precio, contexto: texto.slice(desde, hasta).trim() };
  }
  return null;
}

const MENSAJE_PRESENTACION =
  'Estos son precios minoristas online (retail), NO de corralón ni mayorista ' +
  'de obra: presentalos siempre como referencia de orden de magnitud, citando ' +
  'comercio, moneda y fecha de consulta de cada uno. Si los usás en un ' +
  'cómputo, aclaralo y no los mezcles en silencio con el dataset regional ni ' +
  'con la lista propia del usuario (y nunca mezcles monedas distintas).';

function errorFallo(input: BuscarPrecioWebInput): BuscarPrecioWebOutput {
  return {
    termino: input.termino,
    pais: input.pais,
    lugar: input.lugar,
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
  input: BuscarPrecioWebInput,
  pais: PaisBusqueda,
  limit: number,
  apiKey: string
): Promise<PrecioWebEncontrado[]> {
  const q = input.lugar ? `${input.termino} ${input.lugar}` : input.termino;
  const res = await fetch('https://google.serper.dev/shopping', {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q,
      gl: pais.gl,
      hl: pais.idioma === 'pt' ? 'pt-br' : 'es',
    }),
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
      moneda: pais.moneda,
      comercio: item.source ?? 'Comercio online',
      url: item.link ?? '',
      fuente: 'web_retail',
    });
    if (resultados.length >= limit) break;
  }
  return resultados;
}

export function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Comercio online';
  }
}

async function buscarTavily(
  input: BuscarPrecioWebInput,
  pais: PaisBusqueda,
  limit: number,
  apiKey: string
): Promise<PrecioWebEncontrado[]> {
  const precio = pais.idioma === 'pt' ? 'preço' : 'precio';
  const query = [precio, input.termino, 'comprar', input.lugar, pais.nombre]
    .filter(Boolean)
    .join(' ');
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      max_results: Math.min(limit * 2, 10),
      country: pais.tavily,
    }),
  });
  if (!res.ok) throw new Error(`Tavily respondió ${res.status}`);
  const data = await res.json();
  const items: TavilyResult[] = Array.isArray(data.results) ? data.results : [];

  const resultados: PrecioWebEncontrado[] = [];
  for (const item of items) {
    if (!item.title || !item.url) continue;
    const extraido = extraerPrecio(`${item.title} ${item.content ?? ''}`, pais);
    if (!extraido) continue;
    resultados.push({
      descripcion: item.title,
      precio: extraido.precio,
      moneda: pais.moneda,
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
      pais: input.pais,
      lugar: input.lugar,
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

  const pais = resolverPais(input.pais);
  if (!pais) {
    return {
      termino: input.termino,
      pais: input.pais,
      lugar: input.lugar,
      total_encontrados: 0,
      resultados: [],
      error: 'pais_no_soportado',
      mensaje:
        `No hay búsqueda de precios configurada para "${input.pais}". ` +
        `Países soportados: ${PAISES_SOPORTADOS}. Decíselo al usuario sin ` +
        'inventar precios.',
    };
  }

  const limit = Math.min(input.limit ?? 5, 10);
  const proveedor = serperKey ? 'serper' : 'tavily';
  let resultados: PrecioWebEncontrado[];
  try {
    resultados = serperKey
      ? await buscarSerper(input, pais, limit, serperKey)
      : await buscarTavily(input, pais, limit, tavilyKey!);
  } catch {
    return errorFallo(input);
  }

  return {
    termino: input.termino,
    pais: pais.nombre,
    lugar: input.lugar,
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
    'Busca precios minoristas online de un material en países de Latinoamérica vía una API de búsqueda. Usar SOLO cuando el material no está en el dataset regional ni en la lista propia del usuario, y el usuario aceptó una referencia online. Devuelve precios estructurados con comercio, URL, fecha y moneda local del país; la fuente es siempre "web_retail" (retail, no corralón) y debe citarse al presentar cada precio.',
  input_schema: {
    type: 'object',
    properties: {
      termino: {
        type: 'string',
        description:
          'Material a buscar, lo más específico posible. Ej: "cemento portland 25kg", "hierro aletado 8mm barra 12m".',
        minLength: 3,
      },
      pais: {
        type: 'string',
        description:
          'País donde buscar. Default: Argentina. Soportados: ' +
          `${PAISES_SOPORTADOS}. Si el usuario nombra una ciudad o provincia ` +
          'de otro país, resolvé vos a qué país pertenece y pasalo acá.',
        default: 'Argentina',
      },
      lugar: {
        type: 'string',
        description:
          'Provincia, departamento, estado o ciudad para enfocar la búsqueda ' +
          'dentro del país. Ej: "Montevideo", "Asunción", "São Paulo". Opcional.',
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
