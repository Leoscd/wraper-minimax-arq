/**
 * Schemas Zod compartidos para validación de inputs en endpoints API.
 *
 * Cada endpoint hace `Schema.safeParse(body)` y devuelve 400 con
 * `error.issues` si falla. Mantener los schemas cerca de los tipos
 * (`lib/types.ts`) para que cambios queden sincronizados.
 *
 * Reglas de validación (consenso del doc):
 *   - nombre/descripcion: 1-200 / 1-2000 chars (evitar payloads vacíos o gigantes)
 *   - email: formato válido
 *   - año: 4 dígitos (1900-2100)
 *   - superficies: strings cortos (ej: "193 m²")
 *   - colores: formato HEX (#RRGGBB o #RGB)
 *   - galeria: máximo 20 items
 *   - presupuestos: números >= 0
 */

import { z } from 'zod';

const hexColor = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Color debe ser HEX (#RGB o #RRGGBB)');

const shortString = z.string().min(1).max(200);
const mediumString = z.string().min(1).max(2000);
const urlOrDataUri = z
  .string()
  .refine(
    (s) =>
      s.startsWith('http://') ||
      s.startsWith('https://') ||
      s.startsWith('data:'),
    'Debe ser URL http(s) o data URI'
  );

export const ProyectoInputSchema = z.object({
  nombre: shortString,
  subtitulo: z.string().max(200).optional(),
  tagline: z.string().max(200).optional(),
  descripcion: mediumString,
  arquitecto: shortString,
  estudio: z.string().max(200).optional(),
  ubicacion: shortString,
  // El wizard ofrece "año" como opcional y no expone "estado". Los aceptamos
  // opcionales (string vacío → undefined) pero seguimos validando el formato
  // del año cuando viene cargado.
  año: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z
      .string()
      .regex(/^\d{4}$/, 'Año debe tener 4 dígitos')
      .refine(
        (y) => {
          const n = parseInt(y, 10);
          return n >= 1900 && n <= 2100;
        },
        'Año fuera de rango (1900-2100)'
      )
      .optional()
  ),
  estado: z.string().max(200).optional(),
  superficie_total: z.string().max(50).optional(),
  superficie_cubierta: z.string().max(50).optional(),
  superficie_descubierta: z.string().max(50).optional(),
  unidades: z.string().max(100).optional(),
  sistema: z.string().max(100).optional(),
  email: z.string().email('Email inválido'),
  telefono: z.string().max(50).optional(),
  direccion: z.string().max(300).optional(),
  web: z.string().max(200).optional(),
  instagram: z.string().max(100).optional(),
  linkedin: z.string().max(300).optional(),
  twitter: z.string().max(300).optional(),
  facebook: z.string().max(300).optional(),
});

export const BrandingInputSchema = z.object({
  empresa_nombre: shortString,
  logo_url: urlOrDataUri.optional(),
  color_primario: hexColor,
  color_secundario: hexColor.optional(),
  color_fondo: hexColor.optional(),
  color_texto: hexColor.optional(),
  color_acento: hexColor.optional(),
  estilo: z.enum(['premium', 'moderno', 'minimalista', 'tecnico']),
});

export const ArchivosInputSchema = z.object({
  video_hero: urlOrDataUri.optional(),
  imagen_principal: urlOrDataUri.optional(),
  galeria: z
    .array(
      z.object({
        nombre: z.string().min(1).max(200),
        url: urlOrDataUri,
      })
    )
    .max(20, 'Máximo 20 imágenes en la galería'),
});

export const RubrosInputSchema = z.object({
  rubros: z
    .array(
      z.object({
        numero: z.string().min(1).max(20),
        nombre: z.string().min(1).max(200),
        superficie: z.string().max(100).optional(),
        unidad: z.string().max(50).optional(),
        cantidad: z.number().nonnegative(),
        precio_unitario_mat: z.number().nonnegative(),
        precio_unitario_mo: z.number().nonnegative(),
        materiales: z.number().nonnegative(),
        mano_de_obra: z.number().nonnegative(),
        total: z.number().nonnegative(),
        incidencia: z.string().max(50),
      })
    )
    .max(50, 'Máximo 50 rubros'),
  totales: z.object({
    materiales: z.number().nonnegative(),
    mano_de_obra: z.number().nonnegative(),
    total_obra: z.number().nonnegative(),
    costo_m2: z.number().nonnegative().optional(),
  }),
  nota: z.string().max(500).optional(),
});

export const OpcionesSchema = z
  .object({
    incluir_cronograma: z.boolean().optional(),
    incluir_curva_inversion: z.boolean().optional(),
    incluir_honorarios: z.boolean().optional(),
    duracion_estimada_meses: z.number().int().positive().max(120).optional(),
    honorarios: z.number().nonnegative().optional(),
  })
  .optional();

export const GenerationRequestSchema = z.object({
  proyecto: ProyectoInputSchema,
  branding: BrandingInputSchema,
  archivos: ArchivosInputSchema,
  rubros: RubrosInputSchema.optional(),
  opciones: OpcionesSchema,
});

/** Un turno de la conversación del asistente (chat). */
export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1, 'El mensaje no puede estar vacío').max(8000),
});

/**
 * Body de /api/chat: el historial completo de la conversación. El cliente
 * manda todos los turnos previos (stateless en el server); limitamos la
 * cantidad para acotar el costo de tokens por request.
 */
export const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1).max(40),
});

export const LeadInputSchema = z.object({
  email: z.string().email('Email inválido'),
  proyecto: z.string().max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const UploadMetadataSchema = z.object({
  tipo: z.enum(['imagen', 'video', 'logo']),
  filename: z.string().min(1).max(255),
});

export const LIMITS = {
  UPLOAD_IMAGE_MAX_BYTES: 8 * 1024 * 1024,
  UPLOAD_VIDEO_MAX_BYTES: 50 * 1024 * 1024,
  UPLOAD_LOGO_MAX_BYTES: 2 * 1024 * 1024,
  UPLOAD_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  UPLOAD_VIDEO_TYPES: ['video/mp4', 'video/webm'],
};

export function formatZodError(error: z.ZodError): {
  message: string;
  issues: Array<{ path: string; message: string }>;
} {
  return {
    message: 'Datos de entrada inválidos',
    issues: error.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
    })),
  };
}
