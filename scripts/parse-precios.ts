/**
 * Script para convertir un CSV de precios → data/precios-<slug>.json
 *
 * Generalizado para soportar múltiples regiones y formatos de CSV:
 *   - Auto-detecta el separador (";" o ",").
 *   - Parser con soporte de comillas dobles (campos con comas/; embebidos).
 *   - Mapea columnas POR NOMBRE de header (no por posición), así tolera CSVs
 *     con distinto orden y cantidad de columnas. Columnas mínimas: categoria,
 *     descripcion, precio. Opcionales: proveedor, codigo.
 *
 * Uso:
 *   npx tsx scripts/parse-precios.ts --input "./lista.csv" --region "NOA" --moneda ARS
 *   npx tsx scripts/parse-precios.ts --input ./cuyo.csv --region "Cuyo"
 *
 * Flags:
 *   --input     <path>   Ruta del CSV de entrada. (requerido salvo fallback NOA)
 *   --region    <nombre> Nombre de la región (deriva el slug del output).
 *   --output    <path>   Ruta del JSON de salida. Default: data/precios-<slug>.json.
 *   --moneda    <code>   Código de moneda. Default: ARS.
 *   --proveedor <texto>  Proveedor por defecto si el CSV no trae columna. Default: "Lista de precios".
 *
 * Precios en formato argentino (1.234,56).
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';

interface PrecioRaw {
  proveedor: string;
  categoria: string;
  codigo: string;
  descripcion: string;
  precio: number;
}

interface PreciosIndex {
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
  items: Array<PrecioRaw & { id: string }>;
}

/** Rutas candidatas del CSV NOA original (compatibilidad sin --input). */
const SOURCE_PATHS = [
  'C:/Users/leona/AppData/Local/Temp/opencode/skill-extract/presupuesto-constructor/references/preciosNOA.csv',
  './presupuesto-constructor.zip',
];

function parsePrice(raw: string): number {
  // Formato argentino: "261.051,59" → quita puntos de miles, coma decimal → punto.
  const cleaned = raw.trim().replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/** Normaliza un nombre de columna (minúsculas, sin acentos) para matchear el header. */
function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Detecta el separador más probable (";" o ",") a partir de la línea de header. */
function detectSeparator(headerLine: string): ';' | ',' {
  const semi = (headerLine.match(/;/g) || []).length;
  const comma = (headerLine.match(/,/g) || []).length;
  return semi >= comma ? ';' : ',';
}

/**
 * Parser de una línea CSV con soporte de comillas dobles. Respeta separadores
 * embebidos dentro de comillas y maneja comillas escapadas ("").
 */
function parseCsvLine(line: string, sep: string): string[] {
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

/** Convierte "NOA (Noroeste Argentino)" → "noa" para nombrar el archivo. */
function slugify(region: string): string {
  return region
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Parser mínimo de flags `--clave valor`. */
function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[i + 1];
      if (val !== undefined && !val.startsWith('--')) {
        args[key] = val;
        i++;
      } else {
        args[key] = 'true';
      }
    }
  }
  return args;
}

/** Busca el índice de una columna por nombre normalizado (acepta variantes). */
function findCol(header: string[], ...nombres: string[]): number {
  return header.findIndex((h) => nombres.includes(h));
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const region = args.region ?? 'NOA (Noroeste Argentino)';
  const moneda = args.moneda ?? 'ARS';
  const proveedorDefault = args.proveedor ?? 'Lista de precios';
  const slug = slugify(region) || 'noa';
  const outputPath = args.output ?? `./data/precios-${slug}.json`;

  // Resolver input: --input explícito, o fallback a las rutas NOA conocidas.
  let csvPath: string | null = null;
  if (args.input) {
    if (!existsSync(args.input)) {
      console.error(`No se encontró el CSV en la ruta indicada: ${args.input}`);
      process.exit(1);
    }
    csvPath = args.input;
  } else {
    for (const p of SOURCE_PATHS) {
      if (existsSync(p)) {
        csvPath = p;
        break;
      }
    }
  }

  if (!csvPath) {
    console.error(
      'No se encontró el CSV. Pasá la ruta con --input <path>.'
    );
    process.exit(1);
  }

  console.log(`Región:    ${region}`);
  console.log(`Moneda:    ${moneda}`);
  console.log(`Input:     ${csvPath}`);
  console.log(`Output:    ${outputPath}`);

  const raw = readFileSync(csvPath, 'utf-8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    console.error('CSV vacío o sin datos.');
    process.exit(1);
  }

  // Detectar separador e inspeccionar el header.
  const sep = detectSeparator(lines[0]);
  const header = parseCsvLine(lines[0], sep).map(normalizeHeader);
  console.log(`\nSeparador detectado: "${sep}"`);
  console.log(`Header (${header.length} cols): ${header.join(' | ')}`);

  // Mapear columnas por nombre (no por posición).
  const idxCategoria = findCol(header, 'categoria', 'categoría', 'rubro');
  const idxDescripcion = findCol(header, 'descripcion', 'descripción', 'detalle', 'item');
  const idxPrecio = findCol(header, 'precio', 'precio unitario', 'valor');
  const idxProveedor = findCol(header, 'proveedor', 'fuente');
  const idxCodigo = findCol(header, 'codigo', 'código', 'cod');

  const faltantes: string[] = [];
  if (idxCategoria < 0) faltantes.push('categoria');
  if (idxDescripcion < 0) faltantes.push('descripcion');
  if (idxPrecio < 0) faltantes.push('precio');
  if (faltantes.length > 0) {
    console.error(
      `\n✗ El CSV no tiene las columnas mínimas requeridas: ${faltantes.join(', ')}.\n` +
        `  Header encontrado: ${header.join(' | ')}\n` +
        `  Se requieren al menos: categoria, descripcion, precio.`
    );
    process.exit(1);
  }

  const items: Array<PrecioRaw & { id: string }> = [];
  const categoriasSet = new Set<string>();
  const proveedoresSet = new Set<string>();
  const categoriaCount = new Map<string, number>();
  let descartadas = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i], sep);

    const categoria = (cols[idxCategoria] ?? '').trim();
    const descripcion = (cols[idxDescripcion] ?? '').trim();
    const precio = parsePrice(cols[idxPrecio] ?? '');
    const proveedor = (idxProveedor >= 0 ? cols[idxProveedor] : '')?.trim() || proveedorDefault;
    const codigo = (idxCodigo >= 0 ? cols[idxCodigo] : '')?.trim() || '';

    if (!descripcion || precio === 0) {
      descartadas++;
      continue;
    }

    items.push({
      id: `PRE-${String(i).padStart(4, '0')}`,
      proveedor,
      categoria,
      codigo,
      descripcion,
      precio,
    });

    categoriasSet.add(categoria);
    proveedoresSet.add(proveedor);
    categoriaCount.set(categoria, (categoriaCount.get(categoria) || 0) + 1);
  }

  const categorias = Array.from(categoriasSet)
    .map((nombre) => ({ nombre, cantidad: categoriaCount.get(nombre) || 0 }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  const index: PreciosIndex = {
    metadata: {
      region,
      moneda,
      fuente: `Lista de precios ${region} - SoyLeo AI`,
      actualizado: new Date().toISOString().slice(0, 7),
      total_items: items.length,
      total_categorias: categorias.length,
      total_proveedores: proveedoresSet.size,
    },
    categorias,
    proveedores: Array.from(proveedoresSet).sort(),
    items,
  };

  writeFileSync(outputPath, JSON.stringify(index, null, 2), 'utf-8');

  console.log(`\n✓ ${items.length} items procesados (${descartadas} filas descartadas)`);
  console.log(`✓ ${categorias.length} categorías`);
  console.log(`✓ ${proveedoresSet.size} proveedores`);
  console.log(`\nPrimeras 5 categorías:`);
  categorias.slice(0, 5).forEach((c) => {
    console.log(`  - ${c.nombre} (${c.cantidad} items)`);
  });
  console.log(`\nGuardado en: ${outputPath}`);
  console.log(`\nSi la región es nueva, registrala en lib/data/precios.ts (DATASETS).`);
}

main();
