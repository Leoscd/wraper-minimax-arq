/**
 * Script para convertir preciosNOA.csv → data/precios-noa.json
 *
 * Uso: npx tsx scripts/parse-precios.ts
 *   o:  node --import tsx scripts/parse-precios.ts
 *
 * Input:  referencias externas (preciosNOA.csv de la skill original)
 * Output: data/precios-noa.json con estructura indexada
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

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
  categorias: Array<{
    nombre: string;
    cantidad: number;
  }>;
  proveedores: string[];
  items: Array<PrecioRaw & { id: string }>;
}

const SOURCE_PATHS = [
  'C:/Users/leona/AppData/Local/Temp/opencode/skill-extract/presupuesto-constructor/references/preciosNOA.csv',
  './presupuesto-constructor.zip',
];

const OUTPUT_PATH = './data/precios-noa.json';

function parsePrice(raw: string): number {
  const cleaned = raw.trim().replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function main() {
  let csvPath: string | null = null;
  const fs = require('fs') as typeof import('fs');

  for (const p of SOURCE_PATHS) {
    if (fs.existsSync(p)) {
      csvPath = p;
      break;
    }
  }

  if (!csvPath) {
    console.error('No se encontró el CSV. Colocá el archivo preciosNOA.csv en la raíz o pasá la ruta.');
    process.exit(1);
  }

  console.log(`Leyendo CSV desde: ${csvPath}`);
  const raw = readFileSync(csvPath, 'utf-8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    console.error('CSV vacío o sin datos.');
    process.exit(1);
  }

  const header = lines[0].split(';');
  console.log(`Header: ${header.join(' | ')}`);

  const items: Array<PrecioRaw & { id: string }> = [];
  const categoriasSet = new Set<string>();
  const proveedoresSet = new Set<string>();
  const categoriaCount = new Map<string, number>();

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(';');
    if (cols.length < 5) continue;

    const [proveedor, categoria, codigo, descripcion, precioRaw] = cols;
    const precio = parsePrice(precioRaw);

    if (!descripcion || precio === 0) continue;

    const id = `PRE-${String(i).padStart(4, '0')}`;
    items.push({
      id,
      proveedor: proveedor.trim(),
      categoria: categoria.trim(),
      codigo: (codigo || '').trim(),
      descripcion: descripcion.trim(),
      precio,
    });

    categoriasSet.add(categoria.trim());
    proveedoresSet.add(proveedor.trim());
    categoriaCount.set(
      categoria.trim(),
      (categoriaCount.get(categoria.trim()) || 0) + 1
    );
  }

  const categorias = Array.from(categoriasSet)
    .map((nombre) => ({
      nombre,
      cantidad: categoriaCount.get(nombre) || 0,
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  const index: PreciosIndex = {
    metadata: {
      region: 'NOA (Noroeste Argentino)',
      moneda: 'ARS',
      fuente: 'Lista de precios del NOA - SoyLeo AI skill original',
      actualizado: '2026-02',
      total_items: items.length,
      total_categorias: categorias.length,
      total_proveedores: proveedoresSet.size,
    },
    categorias,
    proveedores: Array.from(proveedoresSet).sort(),
    items,
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(index, null, 2), 'utf-8');

  console.log(`\n✓ ${items.length} items procesados`);
  console.log(`✓ ${categorias.length} categorías`);
  console.log(`✓ ${proveedoresSet.size} proveedores`);
  console.log(`\nPrimeras 5 categorías:`);
  categorias.slice(0, 5).forEach((c) => {
    console.log(`  - ${c.nombre} (${c.cantidad} items)`);
  });
  console.log(`\nGuardado en: ${OUTPUT_PATH}`);
}

main();
