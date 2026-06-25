/**
 * Skill "Presentador" — Ejemplo few-shot.
 *
 * Genera un HTML "Dark Gold" de referencia (a partir del template determinístico)
 * para anclar la calidad y la estructura que se espera del modelo. Se incluye en
 * el brief como bloque ESTÁTICO cacheable.
 *
 * Reusa `renderPresentacionDarkGold` para no mantener un HTML a mano.
 */

import { renderPresentacionDarkGold, type PresentacionData } from '../../templates/presentacion-darkgold';

const EJEMPLO_DATA: PresentacionData = {
  proyecto: {
    nombre: 'Casa Rogeris',
    subtitulo: 'Complejo 4 Departamentos — Steel Frame',
    tagline: 'Arquitectura que transforma',
    descripcion:
      'Desarrollo de tipología residencial colectiva en sistema Steel Frame. Optimiza 193 m² totales en 4 unidades funcionales de 42 m², conectadas por una pasarela y escalera metálica de diseño industrial.',
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
    telefono: '+54 381 555 1234',
    direccion: 'Av. Independencia 1234, San Miguel de Tucumán',
    web: 'soyleoai.com',
    instagram: '@soy.leo_ai',
  },
  archivos: {
    galeria: [
      { nombre: 'Planta General 3D', url: 'https://placehold.co/1200x800/1a1a1a/C9A84C?text=Planta+3D' },
      { nombre: 'Cocina - Comedor', url: 'https://placehold.co/1200x800/0f0f0f/ede9e0?text=Cocina' },
      { nombre: 'Habitación Principal', url: 'https://placehold.co/1200x800/161616/ede9e0?text=Habitacion' },
    ],
  },
  branding: {
    empresa_nombre: 'SoyLeo AI',
    logo_url: 'https://placehold.co/200x60/C9A84C/080808?text=SOYLEO+AI',
    estilo: 'premium',
    color_primario: '#C9A84C',
    color_secundario: '#8a7434',
    color_fondo: '#080808',
    color_texto: '#ede9e0',
    color_acento: '#E5C66B',
  },
  rubros: {
    rubros: [
      { numero: '01', nombre: 'Trabajos Preparatorios', cantidad: 1, precio_unitario_mat: 1050400, precio_unitario_mo: 1575600, materiales: 1050400, mano_de_obra: 1575600, total: 2626000, incidencia: '2,0%' },
      { numero: '02', nombre: 'Fundaciones', cantidad: 1, precio_unitario_mat: 6846400, precio_unitario_mo: 3687600, materiales: 6846400, mano_de_obra: 3687600, total: 10534000, incidencia: '8,0%' },
      { numero: '03', nombre: 'Estructura Steel Frame', cantidad: 1, precio_unitario_mat: 17380800, precio_unitario_mo: 11587200, materiales: 17380800, mano_de_obra: 11587200, total: 28968000, incidencia: '22,0%' },
    ],
    totales: {
      materiales: 25277600,
      mano_de_obra: 16850400,
      total_obra: 42128000,
      costo_m2: 680000,
    },
    nota: 'Presupuesto GLOBAL orientativo (Base NOA 2025). No incluye honorarios profesionales ni IVA.',
  },
};

/** HTML "Dark Gold" de referencia, generado una sola vez al cargar el módulo. */
export const EJEMPLO_HTML: string = renderPresentacionDarkGold(EJEMPLO_DATA);
