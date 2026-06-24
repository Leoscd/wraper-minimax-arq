import { Editor } from '@/components/editor/Editor';
import { editorStateFromRequest, type EditorState } from '@/lib/editor-types';

export default function PreviewPage({ params }: { params: { id: string } }) {
  void params;
  const exampleState: EditorState = editorStateFromRequest({
    proyecto: {
      nombre: 'Proyecto de ejemplo',
      subtitulo: 'Subtítulo',
      tagline: 'Tagline de marca',
      descripcion: 'Esta es una descripción editable. Cambiala desde el panel.',
      arquitecto: 'Arq. Demo',
      estudio: 'Estudio Demo',
      ubicacion: 'Tucumán, Argentina',
      año: '2026',
      estado: 'Proyecto ejecutivo',
      email: 'demo@example.com',
      telefono: '+54 381 555 1234',
      direccion: 'Av. Demo 1234',
      web: 'demo.com',
      instagram: '@demo',
      linkedin: 'https://linkedin.com/in/demo',
      twitter: 'https://x.com/demo',
      facebook: 'https://facebook.com/demo',
    },
    branding: {
      empresa_nombre: 'Estudio Demo',
      estilo: 'premium',
      color_primario: '#C9A84C',
      color_secundario: '#8a7434',
      color_fondo: '#080808',
      color_texto: '#ede9e0',
      color_acento: '#E5C66B',
    },
    archivos: { galeria: [] },
    opciones: {},
  });

  return <Editor initialState={exampleState} />;
}
