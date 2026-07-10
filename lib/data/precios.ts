/**
 * Loader de datasets de precios por región.
 *
 * SoyLeo AI arrancó con un único dataset (NOA), pero la lista de precios
 * varía mucho según la región del país. Este módulo centraliza la carga del
 * dataset correcto para que el resto del código (tools) no dependa de un
 * import hardcodeado.
 *
 * Convención de archivos: `data/precios-<slug>.json` (ej. NOA → precios-noa.json).
 * Next.js/TS no permiten import dinámico arbitrario de JSON de forma simple,
 * así que mapeamos las regiones conocidas a sus imports estáticos en un record.
 * Cuando llegue un CSV de otra región se genera el JSON con
 * `scripts/parse-precios.ts` y se agrega su import acá.
 */

import preciosNOA from '../../data/precios-noa.json';

/** Item individual de la lista de precios. */
export interface PrecioItem {
  id: string;
  proveedor: string;
  categoria: string;
  codigo: string;
  descripcion: string;
  precio: number;
}

/** Estructura completa de un dataset de precios (= forma del JSON en disco). */
export interface PreciosDataset {
  metadata: {
    region: string;
    moneda: string;
    fuente: string;
    actualizado: string;
    total_items: number;
    total_categorias: number;
    total_proveedores: number;
  };
  categorias: Array<{ nombre: string; cantidad: number }>;
  proveedores: string[];
  items: PrecioItem[];
}

/** Región por defecto cuando no se especifica ninguna. */
export const REGION_DEFAULT = 'NOA';

/**
 * Mapa de regiones conocidas → dataset importado estáticamente.
 * Las claves se normalizan (mayúsculas, sin acentos) al resolver.
 * Por ahora solo existe NOA; agregar nuevas regiones acá tras parsear su CSV.
 */
const DATASETS: Record<string, PreciosDataset> = {
  NOA: preciosNOA as PreciosDataset,
};

/** Normaliza el nombre de región para hacer el lookup case/accent-insensitive. */
function normalizarRegion(region: string): string {
  return region
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/**
 * Provincias argentinas → región de precios (clasificación INDEC, con La Rioja
 * en NOA y Buenos Aires/CABA en CENTRO). Claves ya normalizadas.
 */
const PROVINCIA_A_REGION: Record<string, string> = {
  JUJUY: 'NOA',
  SALTA: 'NOA',
  TUCUMAN: 'NOA',
  CATAMARCA: 'NOA',
  'SANTIAGO DEL ESTERO': 'NOA',
  'LA RIOJA': 'NOA',
  FORMOSA: 'NEA',
  CHACO: 'NEA',
  CORRIENTES: 'NEA',
  MISIONES: 'NEA',
  MENDOZA: 'CUYO',
  'SAN JUAN': 'CUYO',
  'SAN LUIS': 'CUYO',
  CORDOBA: 'CENTRO',
  'SANTA FE': 'CENTRO',
  'ENTRE RIOS': 'CENTRO',
  'LA PAMPA': 'CENTRO',
  'BUENOS AIRES': 'CENTRO',
  CABA: 'CENTRO',
  'CIUDAD DE BUENOS AIRES': 'CENTRO',
  'CIUDAD AUTONOMA DE BUENOS AIRES': 'CENTRO',
  NEUQUEN: 'PATAGONIA',
  'RIO NEGRO': 'PATAGONIA',
  CHUBUT: 'PATAGONIA',
  'SANTA CRUZ': 'PATAGONIA',
  'TIERRA DEL FUEGO': 'PATAGONIA',
};

/** Nombres alternativos con los que la gente pide una región. */
const ALIAS_REGION: Record<string, string> = {
  NOROESTE: 'NOA',
  'NOROESTE ARGENTINO': 'NOA',
  NORESTE: 'NEA',
  'NORESTE ARGENTINO': 'NEA',
  LITORAL: 'NEA',
  PAMPEANA: 'CENTRO',
  'REGION PAMPEANA': 'CENTRO',
  AMBA: 'CENTRO',
  PATAGONICA: 'PATAGONIA',
  'PATAGONIA ARGENTINA': 'PATAGONIA',
};

/** Resultado de resolver la entrada del usuario a una región canónica. */
export interface RegionResuelta {
  /** Región canónica normalizada (ej. "PATAGONIA"). */
  region: string;
  /** Presente si la entrada era una provincia y no una región. */
  provincia?: string;
}

/**
 * Resuelve lo que pidió el usuario (región, alias o provincia) a la región
 * canónica. "Neuquén" → PATAGONIA (provincia), "Patagónica" → PATAGONIA
 * (alias). Si no se reconoce, devuelve la entrada normalizada tal cual.
 */
export function resolverRegion(entrada: string): RegionResuelta {
  const key = normalizarRegion(entrada);
  const alias = ALIAS_REGION[key];
  if (alias) return { region: alias };
  const region = PROVINCIA_A_REGION[key];
  if (region) return { region, provincia: entrada.trim() };
  return { region: key };
}

/** Regiones con dataset cargado (claves normalizadas del record DATASETS). */
export function regionesDisponibles(): string[] {
  return Object.keys(DATASETS);
}

/**
 * Devuelve el dataset de precios para la región pedida, o `null` si no hay
 * dataset para esa región. Sin fallback silencioso: presentar precios de una
 * región como si fueran de otra rompe el invariante de trazabilidad de los
 * números; el que llama decide qué hacer (la tool devuelve un error
 * estructurado para que el modelo se lo explique al usuario).
 */
export function getPreciosDataset(region: string = REGION_DEFAULT): PreciosDataset | null {
  const key = resolverRegion(region).region;
  return DATASETS[key] ?? null;
}
