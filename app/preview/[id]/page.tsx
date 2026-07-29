import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getProyecto, saveProyecto, type ProyectoGuardado } from '@/lib/db/proyectos';
import { renderPresentacionDarkGold } from '@/lib/templates/presentacion-darkgold';
import { getEntregablePorId } from '@/lib/tools/generar-entregable';
import { PreviewEntregable } from './preview-entregable';
import { Editor } from '@/components/editor/Editor';
import { editorStateFromRequest, type EditorState } from '@/lib/editor-types';

export const dynamic = 'force-dynamic';

export default async function PreviewPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/preview/${params.id}`);
  }

  // 1. Si el id es un entregable generado por el chat, lo mostramos en un
  // viewer simple (read-only) con boton de descarga PDF.
  const entregable = getEntregablePorId(params.id);
  if (entregable) {
    return <PreviewEntregable html={entregable.html} filename={entregable.filename} id={params.id} />;
  }

  // 2. Si es un proyecto guardado del editor, lo abrimos en el editor.
  const existingProyecto = await getProyecto(params.id);

  let initialState: EditorState;
  let initialHtml: string;
  let nombre: string;

  if (existingProyecto && existingProyecto.userId === session.user.id) {
    initialState = existingProyecto.data;
    initialHtml = existingProyecto.html;
    nombre = existingProyecto.nombre;
  } else {
    initialState = editorStateFromRequest({
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
      },
      branding: {
        empresa_nombre: 'Estudio Demo',
        estilo: 'premium',
        color_primario: '#C9A84C',
      },
      archivos: { galeria: [] },
      opciones: {},
    });
    initialHtml = renderPresentacionDarkGold({
      proyecto: initialState.proyecto,
      branding: initialState.branding,
      archivos: initialState.archivos,
    });
    nombre = initialState.proyecto.nombre;
  }

  async function handleSave(state: EditorState, html: string): Promise<void> {
    'use server';
    if (!session?.user?.id) return;
    await saveProyecto(session.user.id, state.proyecto.nombre, state, html, params.id);
  }

  return <Editor initialState={initialState} onSave={handleSave} />;
}
