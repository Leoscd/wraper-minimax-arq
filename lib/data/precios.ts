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
 * Devuelve el dataset de precios para la región pedida.
 * Si la región no existe, hace fallback al dataset por defecto (NOA) y avisa
 * con un console.warn en vez de tirar error: preferimos degradar a un
 * resultado útil antes que romper la generación.
 */
export function getPreciosDataset(region: string = REGION_DEFAULT): PreciosDataset {
  const key = normalizarRegion(region);
  const dataset = DATASETS[key];

  if (!dataset) {
    console.warn(
      `[precios] Región "${region}" no disponible. Usando fallback "${REGION_DEFAULT}".`
    );
    return DATASETS[REGION_DEFAULT];
  }

  return dataset;
}
