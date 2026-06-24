/**
 * Genera ejemplos de HTML renderizados para preview.
 *
 * Uso: npx tsx scripts/generate-examples.ts
 *
 * Crea archivos en examples-output/ que el usuario puede abrir en el browser.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { renderPresentacionDarkGold } from '../lib/templates/presentacion-darkgold';
import { renderPresupuestoTecnico } from '../lib/templates/presupuesto-tecnico';
import type { PresentacionData } from '../lib/templates/presentacion-darkgold';

const OUTPUT_DIR = './examples-output';
mkdirSync(OUTPUT_DIR, { recursive: true });

const casaRogeris: PresentacionData = {
  proyecto: {
    nombre: 'Casa Rogeris',
    subtitulo: 'Complejo 4 Departamentos — Steel Frame',
    descripcion:
      'Desarrollo de tipología residencial colectiva en sistema Steel Frame. El proyecto optimiza 193 m² totales divididos en 4 unidades funcionales de 42 m² cada una, conectadas por una pasarela y escalera metálica de diseño industrial.',
    arquitecto: 'Arq. Leonardo Díaz',
    estudio: 'SoyLeo AI',
    superficie_total: '193 m²',
    superficie_cubierta: '168 m²',
    superficie_descubierta: '25 m²',
    unidades: '4 x 42 m²',
    sistema: 'Steel Frame',
    ubicacion: 'Tucumán, NOA',
    año: '2025',
    estado: 'Proyecto ejecutivo',
    email: 'soyleo.ai.arq@gmail.com',
    web: 'soyleoai.com',
    instagram: '@soy.leo_ai',
  },
  archivos: {
    galeria: [
      { nombre: 'Planta General 3D', url: 'https://placehold.co/1200x800/1a1a1a/C9A84C?text=Planta+3D' },
      { nombre: 'Cocina - Comedor', url: 'https://placehold.co/1200x800/0f0f0f/ede9e0?text=Cocina' },
      { nombre: 'Habitación Principal', url: 'https://placehold.co/1200x800/161616/ede9e0?text=Habitacion' },
      { nombre: 'Baño Terminado', url: 'https://placehold.co/1200x800/1e1e1e/ede9e0?text=Bano' },
    ],
  },
  branding: {
    empresa_nombre: 'SoyLeo AI',
    estilo: 'premium',
    color_primario: '#C9A84C',
  },
  rubros: {
    rubros: [
      { numero: '01', nombre: 'Trabajos Preparatorios', cantidad: 1, precio_unitario_mat: 1050400, precio_unitario_mo: 1575600, materiales: 1050400, mano_de_obra: 1575600, total: 2626000, incidencia: '2,0%' },
      { numero: '02', nombre: 'Fundaciones', cantidad: 1, precio_unitario_mat: 6846400, precio_unitario_mo: 3687600, materiales: 6846400, mano_de_obra: 3687600, total: 10534000, incidencia: '8,0%' },
      { numero: '03', nombre: 'Estructura Steel Frame', cantidad: 1, precio_unitario_mat: 17380800, precio_unitario_mo: 11587200, materiales: 17380800, mano_de_obra: 11587200, total: 28968000, incidencia: '22,0%' },
      { numero: '04', nombre: 'Cerramiento exterior', cantidad: 1, precio_unitario_mat: 7398400, precio_unitario_mo: 3171600, materiales: 7398400, mano_de_obra: 3171600, total: 10570000, incidencia: '8,0%' },
      { numero: '05', nombre: 'Terminación exterior', cantidad: 1, precio_unitario_mat: 3281250, precio_unitario_mo: 3281250, materiales: 3281250, mano_de_obra: 3281250, total: 6562500, incidencia: '5,0%' },
      { numero: '06', nombre: 'Tabiquería interior', cantidad: 1, precio_unitario_mat: 4737600, precio_unitario_mo: 3158400, materiales: 4737600, mano_de_obra: 3158400, total: 7896000, incidencia: '6,0%' },
      { numero: '07', nombre: 'Pisos y revestimientos', cantidad: 1, precio_unitario_mat: 5997150, precio_unitario_mo: 3229350, materiales: 5997150, mano_de_obra: 3229350, total: 9226500, incidencia: '7,0%' },
      { numero: '08', nombre: 'Instalación eléctrica', cantidad: 1, precio_unitario_mat: 4356300, precio_unitario_mo: 3564700, materiales: 4356300, mano_de_obra: 3564700, total: 7921000, incidencia: '6,0%' },
      { numero: '09', nombre: 'Instalación sanitaria', cantidad: 1, precio_unitario_mat: 5082350, precio_unitario_mo: 4158650, materiales: 5082350, mano_de_obra: 4158650, total: 9241000, incidencia: '7,0%' },
      { numero: '10', nombre: 'Cubierta / Losa SF', cantidad: 1, precio_unitario_mat: 6862400, precio_unitario_mo: 3697600, materiales: 6862400, mano_de_obra: 3697600, total: 10560000, incidencia: '8,0%' },
      { numero: '11', nombre: 'Carpintería', cantidad: 1, precio_unitario_mat: 8976000, precio_unitario_mo: 1584000, materiales: 8976000, mano_de_obra: 1584000, total: 10560000, incidencia: '8,0%' },
      { numero: '12', nombre: 'Pasarela y escalera', cantidad: 1, precio_unitario_mat: 4620000, precio_unitario_mo: 1980000, materiales: 4620000, mano_de_obra: 1980000, total: 6600000, incidencia: '5,0%' },
      { numero: '13', nombre: 'Pintura interior', cantidad: 1, precio_unitario_mat: 1584000, precio_unitario_mo: 2376000, materiales: 1584000, mano_de_obra: 2376000, total: 3960000, incidencia: '3,0%' },
      { numero: '14', nombre: 'Varios y gastos grales', cantidad: 1, precio_unitario_mat: 3281250, precio_unitario_mo: 3281250, materiales: 3281250, mano_de_obra: 3281250, total: 6562500, incidencia: '5,0%' },
    ],
    totales: {
      materiales: 81453300,
      mano_de_obra: 50133200,
      total_obra: 131240000,
      costo_m2: 680000,
    },
    nota: 'Presupuesto GLOBAL orientativo (Base NOA 2025). No incluye honorarios profesionales ni IVA.',
  },
};

const losa50 = {
  proyecto: {
    nombre: 'Losa 50m²',
    descripcion: 'Estructura independiente H°A° H-25',
    arquitecto: 'Arq. Leonardo Díaz',
    estudio: 'SoyLeo AI',
    ubicacion: 'Tucumán, Arg.',
    año: '2026',
    estado: 'Proyecto ejecutivo',
    sistema: 'Obra Nueva',
    superficie_total: '50 m²',
    email: 'soyleo.ai.arq@gmail.com',
    web: 'soyleoai.com',
  },
  rubros: {
    rubros: [
      {
        numero: '01.01',
        nombre: 'Hormigón H-25 elaborado',
        unidad: 'm³',
        cantidad: 7.5,
        precio_unitario_mat: 286246,
        precio_unitario_mo: 0,
        materiales: 2146845,
        mano_de_obra: 0,
        total: 2146845,
        incidencia: '24%',
      },
      {
        numero: '02.01',
        nombre: 'Hierro nervado Ø12mm',
        unidad: 'barra',
        cantidad: 52,
        precio_unitario_mat: 21200,
        precio_unitario_mo: 4800,
        materiales: 1102400,
        mano_de_obra: 360800,
        total: 1463200,
        incidencia: '16%',
      },
      {
        numero: '02.02',
        nombre: 'Hierro nervado Ø8mm',
        unidad: 'barra',
        cantidad: 102,
        precio_unitario_mat: 9500,
        precio_unitario_mo: 2200,
        materiales: 969000,
        mano_de_obra: 230400,
        total: 1199400,
        incidencia: '13%',
      },
      {
        numero: '03.01',
        nombre: 'Encofrado de madera pino losa',
        unidad: 'm²',
        cantidad: 50,
        precio_unitario_mat: 17293,
        precio_unitario_mo: 6800,
        materiales: 864650,
        mano_de_obra: 340000,
        total: 1204650,
        incidencia: '14%',
      },
      {
        numero: '03.02',
        nombre: 'Clavos de construcción',
        unidad: 'kg',
        cantidad: 10,
        precio_unitario_mat: 6000,
        precio_unitario_mo: 0,
        materiales: 60000,
        mano_de_obra: 0,
        total: 60000,
        incidencia: '1%',
      },
    ],
    totales: {
      materiales: 5142895,
      mano_de_obra: 3342882,
      total_obra: 8910066,
      costo_m2: 178201,
    },
    nota: 'Presupuesto global orientativo',
  },
  numero_presupuesto: '2026-002',
  fecha: 'Mayo 2026',
  cliente: 'Sin cliente',
  notas_tecnicas: [
    'Losa llena, 15cm de espesor, hierro en dos direcciones',
    'Hierro Ø12 cada 20cm en dirección 10m (52 barras)',
    'Hierro Ø12 cada 20cm en dirección 5m (52 barras)',
    'Precio material: Mayo 2026 · Tavella + Notion',
    'Valor orientativo — verificar antes de usar',
    'Incluyen colocación y desencofrado',
    'No incluye bombeo ni flete',
  ],
};

const html1 = renderPresentacionDarkGold(casaRogeris);
writeFileSync(`${OUTPUT_DIR}/01-casa-rogeris-presentacion.html`, html1, 'utf-8');
console.log(`✓ Generado: ${OUTPUT_DIR}/01-casa-rogeris-presentacion.html`);

const html2 = renderPresupuestoTecnico(losa50);
writeFileSync(`${OUTPUT_DIR}/02-losa-50-presupuesto.html`, html2, 'utf-8');
console.log(`✓ Generado: ${OUTPUT_DIR}/02-losa-50-presupuesto.html`);

console.log('\nPara verlos, abrilos en el navegador:');
console.log('  start examples-output/01-casa-rogeris-presentacion.html');
console.log('  start examples-output/02-losa-50-presupuesto.html');
