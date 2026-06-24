/**
 * Tipos para el editor post-generación.
 *
 * El editor opera sobre un JSON estructurado que representa el estado
 * completo de la presentación. En cada cambio, regeneramos el HTML
 * usando el template local (sin gastar tokens de M3).
 */

import type { GenerationRequest, ProyectoInput, BrandingInput, ArchivosInput, RubrosInput } from './types';

export type SectionId =
  | 'hero'
  | 'proyecto'
  | 'galeria'
  | 'presupuesto'
  | 'contacto';

export interface EditorState {
  proyecto: ProyectoInput;
  branding: BrandingInput;
  archivos: ArchivosInput;
  rubros?: RubrosInput;
  opciones: NonNullable<GenerationRequest['opciones']>;
  visible_sections: Record<SectionId, boolean>;
  section_order: SectionId[];
}

export function editorStateFromRequest(req: GenerationRequest): EditorState {
  return {
    proyecto: req.proyecto,
    branding: req.branding,
    archivos: req.archivos ?? { galeria: [] },
    rubros: req.rubros,
    opciones: req.opciones ?? {},
    visible_sections: {
      hero: true,
      proyecto: true,
      galeria: (req.archivos?.galeria?.length ?? 0) > 0,
      presupuesto: !!req.rubros,
      contacto: true,
    },
    section_order: ['hero', 'proyecto', 'galeria', 'presupuesto', 'contacto'],
  };
}

export const SECTION_LABELS: Record<SectionId, string> = {
  hero: 'Hero',
  proyecto: 'Información del proyecto',
  galeria: 'Galería de renders',
  presupuesto: 'Presupuesto',
  contacto: 'Contacto / Footer',
};
