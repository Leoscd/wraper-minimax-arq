/**
 * Tool: buscar_profesionales
 *
 * Búsqueda de empresas y profesionales de oficios de la construcción
 * (plomeros, electricistas, carpinteros, herreros, albañiles, techistas...)
 * por país y lugar, con el mismo esquema multi-proveedor y multi-país de
 * `buscar_precio_web` (reutiliza el mapa `PAISES`).
 *
 * Proveedores (se elige por env, en este orden):
 * - `SERPER_API_KEY` → Serper.dev, endpoint /places (Google Maps): fichas de
 *   negocio estructuradas — nombre, dirección, teléfono, rating y cantidad de
 *   reseñas. Es el proveedor preferido: para contactos, el dato estructurado
 *   importa más que en precios.
 * - `TAVILY_API_KEY` → Tavily search: páginas y perfiles (directorios, redes)
 *   con título, URL y fragmento. Sin teléfono estructurado: no intentamos
 *   extraerlo del texto para no atribuir un número a quien no corresponde.
 *
 * **Padrones institucionales:** para oficios matriculados (gasista,
 * electricista) hay una pasada extra de Tavily sesgada con `include_domains`
 * a los registros oficiales curados en `data/fuentes-institucionales.json`
 * (colegios, consejos, reguladores). Esos resultados van aparte en
 * `resultados_padron` con fuente `padron_institucional`. La curación es un
 * dato, no código: se agregan dominios reales al JSON cuando se conocen, y un
 * dominio que no rinde solo produce una pasada vacía.
 *
 * **Invariante de trazabilidad (acá es crítico):** un teléfono o dirección
 * inventados son peores que un precio inventado. Cada resultado viaja con su
 * fuente (`google_places`, `web` o `padron_institucional`), URL y fecha de
 * consulta, y el asistente solo puede presentar los datos que vinieron en el
 * resultado — el `mensaje` se lo recuerda. Los resultados NO son
 * profesionales verificados por la plataforma.
 */

import type Anthropic from '@anthropic-ai/sdk';
import type { Tool } from './types';
import {
  resolverPais,
  hostname,
  PAISES_SOPORTADOS,
  type PaisBusqueda,
} from './precio-web';
import fuentesInstitucionales from '../../data/fuentes-institucionales.json';

export interface BuscarProfesionalesInput {
  oficio: string;
  pais?: string;
  lugar?: string;
  limit?: number;
}

export interface ProfesionalEncontrado {
  nombre: string;
  /** Rubro/categoría que reporta la fuente (ej. "Plomero", "Contractor"). */
  categoria?: string;
  direccion?: string;
  telefono?: string;
  rating?: number;
  resenas?: number;
  sitio_web?: string;
  /** URL de origen del dato (sitio, perfil o ficha de Google Maps). */
  url?: string;
  fuente: 'google_places' | 'web' | 'padron_institucional';
  /** Fragmento del texto de donde salió el resultado (solo Tavily). */
  contexto?: string;
}

export interface BuscarProfesionalesOutput {
  oficio: string;
  pais?: string;
  lugar?: string;
  total_encontrados: number;
  resultados: ProfesionalEncontrado[];
  /**
   * Resultados de padrones/registros institucionales (solo oficios
   * matriculados con fuentes curadas para el país). Presentarlos primero.
   */
  resultados_padron?: ProfesionalEncontrado[];
  /** Instituciones consultadas para el padrón (nota del JSON curado). */
  padron_fuentes?: string[];
  fecha_consulta?: string;
  proveedor?: 'serper' | 'tavily';
  error?:
    | 'busqueda_web_no_configurada'
    | 'busqueda_web_fallo'
    | 'pais_no_soportado';
  /** Guía para el modelo sobre cómo presentar (o no) estos contactos. */
  mensaje?: string;
}

/** Forma relevante de la respuesta del endpoint /places de Serper. */
interface SerperPlaceItem {
  title?: string;
  address?: string;
  category?: string;
  phoneNumber?: string;
  rating?: number;
  ratingCount?: number;
  website?: string;
  cid?: string;
}

/** Forma relevante de un resultado de Tavily search. */
interface TavilyResult {
  title?: string;
  url?: string;
  content?: string;
}

/** Entrada del JSON curado de padrones institucionales. */
interface FuenteInstitucional {
  pais: string;
  oficios: string[];
  dominios: string[];
  nota: string;
}

/** Máximo de resultados de padrón (van además de los `resultados` comunes). */
const MAX_RESULTADOS_PADRON = 3;

function normalizar(texto: string): string {
  return texto
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/**
 * Fuentes institucionales curadas que aplican al oficio pedido en el país
 * (match por substring: "gasista matriculado" matchea la entrada "gasista").
 */
function fuentesPara(
  oficio: string,
  pais: PaisBusqueda
): FuenteInstitucional[] {
  const oficioNorm = normalizar(oficio);
  const paisNorm = normalizar(pais.nombre);
  return (fuentesInstitucionales.fuentes as FuenteInstitucional[]).filter(
    (f) =>
      normalizar(f.pais) === paisNorm &&
      f.oficios.some((o) => oficioNorm.includes(normalizar(o)))
  );
}

/**
 * Pasada extra sobre los dominios institucionales (padrones de matriculados).
 * Solo Tavily soporta `include_domains`; si no hay key de Tavily no se hace.
 */
async function buscarPadron(
  input: BuscarProfesionalesInput,
  pais: PaisBusqueda,
  fuentes: FuenteInstitucional[],
  apiKey: string
): Promise<ProfesionalEncontrado[]> {
  const dominios = [...new Set(fuentes.flatMap((f) => f.dominios))];
  const query = [input.oficio, 'matriculados', input.lugar, pais.nombre]
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
      max_results: 5,
      include_domains: dominios,
    }),
  });
  if (!res.ok) throw new Error(`Tavily respondió ${res.status}`);
  const data = await res.json();
  const items: TavilyResult[] = Array.isArray(data.results) ? data.results : [];

  const resultados: ProfesionalEncontrado[] = [];
  for (const item of items) {
    if (!item.title || !item.url) continue;
    resultados.push({
      nombre: item.title,
      url: item.url,
      sitio_web: hostname(item.url),
      fuente: 'padron_institucional',
      contexto: item.content?.slice(0, 180),
    });
    if (resultados.length >= MAX_RESULTADOS_PADRON) break;
  }
  return resultados;
}

const MENSAJE_PRESENTACION =
  'Contactos obtenidos de la web (Google Maps o búsqueda), NO verificados ' +
  'por la plataforma. Presentá SOLO los datos que vinieron en cada ' +
  'resultado, citando fuente y fecha: nunca inventes ni completes teléfonos, ' +
  'direcciones o nombres. Recomendá pedir referencias y presupuesto antes de ' +
  'contratar; para gas y electricidad, recordá que se exige matrícula ' +
  'habilitante.';

function errorFallo(input: BuscarProfesionalesInput): BuscarProfesionalesOutput {
  return {
    oficio: input.oficio,
    pais: input.pais,
    lugar: input.lugar,
    total_encontrados: 0,
    resultados: [],
    error: 'busqueda_web_fallo',
    mensaje:
      'La búsqueda de profesionales falló (servicio no disponible). ' +
      'Decíselo al usuario sin inventar contactos y ofrecele reintentar.',
  };
}

async function buscarSerperPlaces(
  input: BuscarProfesionalesInput,
  pais: PaisBusqueda,
  limit: number,
  apiKey: string
): Promise<ProfesionalEncontrado[]> {
  const q = input.lugar
    ? `${input.oficio} en ${input.lugar}`
    : `${input.oficio} ${pais.nombre}`;
  const res = await fetch('https://google.serper.dev/places', {
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
  const items: SerperPlaceItem[] = Array.isArray(data.places)
    ? data.places
    : [];

  const resultados: ProfesionalEncontrado[] = [];
  for (const item of items) {
    if (!item.title) continue;
    resultados.push({
      nombre: item.title,
      categoria: item.category,
      direccion: item.address,
      telefono: item.phoneNumber,
      rating: item.rating,
      resenas: item.ratingCount,
      sitio_web: item.website,
      url:
        item.website ??
        (item.cid ? `https://maps.google.com/?cid=${item.cid}` : undefined),
      fuente: 'google_places',
    });
    if (resultados.length >= limit) break;
  }
  return resultados;
}

async function buscarTavilyWeb(
  input: BuscarProfesionalesInput,
  pais: PaisBusqueda,
  limit: number,
  apiKey: string
): Promise<ProfesionalEncontrado[]> {
  const query = [input.oficio, input.lugar, pais.nombre, 'contacto']
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

  const resultados: ProfesionalEncontrado[] = [];
  for (const item of items) {
    if (!item.title || !item.url) continue;
    resultados.push({
      nombre: item.title,
      url: item.url,
      sitio_web: hostname(item.url),
      fuente: 'web',
      contexto: item.content?.slice(0, 180),
    });
    if (resultados.length >= limit) break;
  }
  return resultados;
}

async function ejecutar(
  input: BuscarProfesionalesInput
): Promise<BuscarProfesionalesOutput> {
  const serperKey = process.env.SERPER_API_KEY;
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (!serperKey && !tavilyKey) {
    return {
      oficio: input.oficio,
      pais: input.pais,
      lugar: input.lugar,
      total_encontrados: 0,
      resultados: [],
      error: 'busqueda_web_no_configurada',
      mensaje:
        'La búsqueda de profesionales no está configurada en este entorno ' +
        '(falta SERPER_API_KEY o TAVILY_API_KEY). Decile al usuario que esa ' +
        'opción no está disponible por ahora.',
    };
  }

  const pais = resolverPais(input.pais);
  if (!pais) {
    return {
      oficio: input.oficio,
      pais: input.pais,
      lugar: input.lugar,
      total_encontrados: 0,
      resultados: [],
      error: 'pais_no_soportado',
      mensaje:
        `No hay búsqueda de profesionales configurada para "${input.pais}". ` +
        `Países soportados: ${PAISES_SOPORTADOS}. Decíselo al usuario sin ` +
        'inventar contactos.',
    };
  }

  const limit = Math.min(input.limit ?? 5, 10);
  const proveedor = serperKey ? 'serper' : 'tavily';
  let resultados: ProfesionalEncontrado[];
  try {
    resultados = serperKey
      ? await buscarSerperPlaces(input, pais, limit, serperKey)
      : await buscarTavilyWeb(input, pais, limit, tavilyKey!);
  } catch {
    return errorFallo(input);
  }

  // Pasada institucional (padrones de matriculados) para oficios con fuentes
  // curadas. Si falla, no arruina la búsqueda principal: se omite el padrón.
  let resultadosPadron: ProfesionalEncontrado[] | undefined;
  let padronFuentes: string[] | undefined;
  const fuentes = tavilyKey ? fuentesPara(input.oficio, pais) : [];
  if (fuentes.length > 0) {
    try {
      resultadosPadron = await buscarPadron(input, pais, fuentes, tavilyKey!);
      padronFuentes = fuentes.map((f) => f.nota);
    } catch {
      resultadosPadron = undefined;
    }
  }

  return {
    oficio: input.oficio,
    pais: pais.nombre,
    lugar: input.lugar,
    total_encontrados: resultados.length + (resultadosPadron?.length ?? 0),
    resultados,
    ...(resultadosPadron?.length
      ? { resultados_padron: resultadosPadron, padron_fuentes: padronFuentes }
      : {}),
    fecha_consulta: new Date().toISOString().slice(0, 10),
    proveedor,
    mensaje: resultadosPadron?.length
      ? MENSAJE_PRESENTACION +
        ' Los resultados de `resultados_padron` salen de registros ' +
        'institucionales de matriculados (ver padron_fuentes): presentalos ' +
        'primero, citando la institución, y aclará que la vigencia de la ' +
        'matrícula debe verificarse.'
      : MENSAJE_PRESENTACION,
  };
}

const schema: Anthropic.Tool = {
  name: 'buscar_profesionales',
  description:
    'Busca empresas y profesionales de oficios de la construcción (plomero, electricista, gasista, albañil, carpintero, herrero, yesero, pintor, techista, etc.) en países de Latinoamérica, vía Google Maps o búsqueda web. Devuelve fichas con nombre, y cuando la fuente los trae, dirección, teléfono, rating y sitio; siempre con fuente, URL y fecha. Para oficios matriculados (gasista, electricista) puede devolver además "resultados_padron" desde registros institucionales oficiales — presentarlos primero citando la institución. Los resultados NO son profesionales verificados: presentarlos como referencia citando la fuente, sin inventar ni completar datos de contacto.',
  input_schema: {
    type: 'object',
    properties: {
      oficio: {
        type: 'string',
        description:
          'Oficio o rubro a buscar, en el idioma del país. Ej: "plomero", ' +
          '"electricista matriculado", "herrería de obra", "colocador de ' +
          'cerámicos", "encanador" (Brasil).',
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
          'Ciudad, barrio o zona donde se necesita al profesional. Pasalo ' +
          'SIEMPRE que el usuario lo haya dicho: una búsqueda de ' +
          'profesionales sin lugar devuelve resultados poco útiles.',
      },
      limit: {
        type: 'number',
        description: 'Cantidad máxima de resultados. Default: 5, máximo: 10.',
        default: 5,
        minimum: 1,
        maximum: 10,
      },
    },
    required: ['oficio'],
  },
};

export const buscarProfesionalesTool: Tool<
  BuscarProfesionalesInput,
  Promise<BuscarProfesionalesOutput>
> = {
  name: schema.name!,
  description: schema.description!,
  schema,
  execute: ejecutar,
};

export { ejecutar as buscarProfesionales };
