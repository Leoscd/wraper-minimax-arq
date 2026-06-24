/**
 * Types compartidos del proyecto.
 */

export interface ProyectoInput {
  nombre: string;
  subtitulo?: string;
  descripcion: string;
  arquitecto: string;
  estudio?: string;
  ubicacion: string;
  año: string;
  estado: string;
  superficie_total?: string;
  superficie_cubierta?: string;
  superficie_descubierta?: string;
  unidades?: string;
  sistema?: string;
  email: string;
  telefono?: string;
  web?: string;
  instagram?: string;
}

export interface RubrosInput {
  rubros: Array<{
    numero: string;
    nombre: string;
    superficie?: string;
    unidad?: string;
    cantidad: number;
    precio_unitario_mat: number;
    precio_unitario_mo: number;
    materiales: number;
    mano_de_obra: number;
    total: number;
    incidencia: string;
  }>;
  totales: {
    materiales: number;
    mano_de_obra: number;
    total_obra: number;
    costo_m2?: number;
  };
  nota?: string;
}

export interface BrandingInput {
  empresa_nombre: string;
  logo_url?: string;
  color_primario: string;
  color_secundario?: string;
  estilo: 'premium' | 'moderno' | 'minimalista' | 'tecnico';
}

export interface ArchivosInput {
  video_hero?: string;
  imagen_principal?: string;
  galeria: Array<{
    nombre: string;
    url: string;
  }>;
}

export interface GenerationRequest {
  proyecto: ProyectoInput;
  rubros?: RubrosInput;
  archivos: ArchivosInput;
  branding: BrandingInput;
  opciones?: {
    incluir_cronograma?: boolean;
    incluir_curva_inversion?: boolean;
    duracion_estimada_meses?: number;
    honorarios?: number;
  };
}

export interface GenerationResponse {
  html: string;
  metadata: {
    proyecto: string;
    timestamp: string;
    tokens_usados?: number;
    tools_invocadas?: string[];
  };
}
