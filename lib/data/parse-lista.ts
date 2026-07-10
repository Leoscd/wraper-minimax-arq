/**
 * Parser de listas de precios (CSV o texto pegado) → items normalizados.
 *
 * Módulo puro (sin `fs`): se usa desde el browser (carga de precios propios
 * en el chat), desde `scripts/parse-precios.ts` (generación de datasets
 * regionales) y desde los tests. Toda la lógica de parseo de listas vive acá
 * para no duplicarla.
 *
 * Formatos soportados:
 * - Separadores `;`, `,` o tab (paste desde Excel/Sheets viene tab-separated).
 * - Comillas dobles con separadores embebidos y comillas escapadas ("").
 * - Header por nombre de columna (variantes con/sin acento) o, si no hay
 *   header reconocible, fallback posicional: 2 columnas = descripcion;precio,
 *   3+ columnas = categoria;descripcion;precio.
 * - Precios en formato argentino ("261.051,59").
 */

/** Máximo de precios propios aceptados por sesión/request. */
export const MAX_PRECIOS_PROPIOS = 1500;

/** Item de una lista de precios cargada por el usuario. */
export interface PrecioPropio {
  descripcion: string;
  precio: number;
  categoria?: string;
  codigo?: string;
  proveedor?: string;
}

export interface ParseListaResult {
  /** Items normalizados con precio numérico. */
  items: PrecioPropio[];
  /** Filas con datos que se descartaron (sin descripción o precio inválido/0). */
  descartadas: number;
  /** Errores legibles para mostrar en la UI. Vacío si el parseo fue usable. */
  errores: string[];
  /** true si la lista superaba MAX_PRECIOS_PROPIOS y se truncó. */
  truncado: boolean;
}

/** Formato argentino: "261.051,59" → quita puntos de miles, coma decimal → punto. */
export function parsePrice(raw: string): number {
  const cleaned = raw.trim().replace(/\$/g, '').replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/** Normaliza un nombre de columna (minúsculas, sin acentos) para matchear el header. */
export function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Detecta el separador más probable (tab, ";" o ",") a partir de la línea de header. */
export function detectSeparator(headerLine: string): ';' | ',' | '\t' {
  if (headerLine.includes('\t')) return '\t';
  const semi = (headerLine.match(/;/g) || []).length;
  const comma = (headerLine.match(/,/g) || []).length;
  return semi >= comma ? ';' : ',';
}

/**
 * Parser de una línea CSV con soporte de comillas dobles. Respeta separadores
 * embebidos dentro de comillas y maneja comillas escapadas ("").
 */
export function parseCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === sep) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/** Busca el índice de una columna por nombre normalizado (acepta variantes). */
export function findCol(header: string[], ...nombres: string[]): number {
  return header.findIndex((h) => nombres.includes(h));
}

/** Índices de columna resueltos (por header o por posición). */
interface ColMap {
  descripcion: number;
  precio: number;
  categoria: number;
  proveedor: number;
  codigo: number;
}

function mapPorHeader(header: string[]): ColMap | null {
  const cols: ColMap = {
    categoria: findCol(header, 'categoria', 'rubro'),
    descripcion: findCol(header, 'descripcion', 'detalle', 'item', 'material', 'producto'),
    precio: findCol(header, 'precio', 'precio unitario', 'valor', 'importe'),
    proveedor: findCol(header, 'proveedor', 'fuente', 'corralon'),
    codigo: findCol(header, 'codigo', 'cod', 'sku'),
  };
  // Mínimo indispensable para una lista de precios: descripción + precio.
  if (cols.descripcion < 0 || cols.precio < 0) return null;
  return cols;
}

function mapPosicional(cantidadCols: number): ColMap | null {
  if (cantidadCols < 2) return null;
  if (cantidadCols === 2) {
    return { descripcion: 0, precio: 1, categoria: -1, proveedor: -1, codigo: -1 };
  }
  return { descripcion: 1, precio: 2, categoria: 0, proveedor: -1, codigo: -1 };
}

/** ¿La fila parece de datos? (su columna de precio parsea a un número > 0). */
function esFilaDeDatos(cols: string[], idxPrecio: number): boolean {
  return parsePrice(cols[idxPrecio] ?? '') > 0;
}

/**
 * Parsea una lista de precios completa (contenido de un CSV o texto pegado).
 * Nunca tira: siempre devuelve un resultado con items/errores.
 */
export function parseListaPrecios(texto: string): ParseListaResult {
  const lines = texto.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length === 0) {
    return { items: [], descartadas: 0, errores: ['El texto está vacío.'], truncado: false };
  }

  const sep = detectSeparator(lines[0]);
  const primeraFila = parseCsvLine(lines[0], sep);
  const headerNormalizado = primeraFila.map(normalizeHeader);

  // Primero intentamos header por nombre; si no matchea, fallback posicional
  // (solo si la primera fila ya parece de datos, para no comernos un header raro).
  let cols = mapPorHeader(headerNormalizado);
  let inicioDatos = 1;
  if (!cols) {
    const posicional = mapPosicional(primeraFila.length);
    if (posicional && esFilaDeDatos(primeraFila, posicional.precio)) {
      cols = posicional;
      inicioDatos = 0;
    }
  }

  if (!cols) {
    return {
      items: [],
      descartadas: 0,
      errores: [
        'No se reconocieron las columnas. Se necesita al menos descripción y precio ' +
          '(con header, o columnas en orden: descripción;precio o categoría;descripción;precio).',
      ],
      truncado: false,
    };
  }

  const items: PrecioPropio[] = [];
  let descartadas = 0;

  for (let i = inicioDatos; i < lines.length; i++) {
    const fila = parseCsvLine(lines[i], sep);
    const descripcion = (fila[cols.descripcion] ?? '').trim();
    const precio = parsePrice(fila[cols.precio] ?? '');

    if (!descripcion || precio <= 0) {
      descartadas++;
      continue;
    }

    const item: PrecioPropio = { descripcion, precio };
    const categoria = cols.categoria >= 0 ? (fila[cols.categoria] ?? '').trim() : '';
    const proveedor = cols.proveedor >= 0 ? (fila[cols.proveedor] ?? '').trim() : '';
    const codigo = cols.codigo >= 0 ? (fila[cols.codigo] ?? '').trim() : '';
    if (categoria) item.categoria = categoria;
    if (proveedor) item.proveedor = proveedor;
    if (codigo) item.codigo = codigo;

    items.push(item);
  }

  const truncado = items.length > MAX_PRECIOS_PROPIOS;
  const errores: string[] = [];
  if (items.length === 0) {
    errores.push(
      `No se pudo extraer ningún precio válido (${descartadas} filas descartadas).`
    );
  }

  return {
    items: truncado ? items.slice(0, MAX_PRECIOS_PROPIOS) : items,
    descartadas,
    errores,
    truncado,
  };
}
