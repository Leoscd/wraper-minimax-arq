'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { EditorState, SectionId } from '@/lib/editor-types';
import { SECTION_LABELS } from '@/lib/editor-types';
import { TextControl } from './controls/TextControl';
import { SectionReorder } from './controls/SectionReorder';
import { ColorControl } from './controls/ColorControl';
import { SectionToggle } from './controls/SectionToggle';
import { renderPresentacionDarkGold } from '@/lib/templates/presentacion-darkgold';

interface EditorProps {
  initialState: EditorState;
  onSave?: (state: EditorState, html: string) => Promise<void> | void;
  readonly?: boolean;
}

export function Editor({ initialState, onSave, readonly }: EditorProps) {
  const [state, setState] = useState<EditorState>(initialState);
  const [html, setHtml] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'content' | 'brand' | 'sections' | 'colors'>('content');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const regenerate = useCallback(
    (s: EditorState) => {
      try {
        const visibleGaleria = s.visible_sections.galeria ? s.archivos.galeria : [];
        const dataForTemplate = {
          proyecto: s.proyecto,
          branding: s.branding,
          archivos: {
            ...s.archivos,
            galeria: visibleGaleria,
          },
          rubros: s.visible_sections.presupuesto ? s.rubros : undefined,
        };
        const newHtml = renderPresentacionDarkGold(dataForTemplate);
        setHtml(newHtml);
      } catch (err) {
        console.error('[Editor] Error regenerando HTML:', err);
      }
    },
    []
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      regenerate(state);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [state, regenerate]);

  const updateProyecto = (updates: Partial<EditorState['proyecto']>) => {
    setState((prev) => ({ ...prev, proyecto: { ...prev.proyecto, ...updates } }));
  };

  const updateBranding = (updates: Partial<EditorState['branding']>) => {
    setState((prev) => ({ ...prev, branding: { ...prev.branding, ...updates } }));
  };

  const updateVisibleSections = (id: SectionId, visible: boolean) => {
    setState((prev) => ({
      ...prev,
      visible_sections: { ...prev.visible_sections, [id]: visible },
    }));
  };

  const reorderSections = (newOrder: SectionId[]) => {
    setState((prev) => ({ ...prev, section_order: newOrder }));
  };

  const handleSave = async () => {
    if (!onSave || saving) return;
    setSaving(true);
    try {
      await onSave(state, html);
      setSavedAt(new Date());
    } catch (err) {
      console.error('[Editor] Error guardando:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  return (
    <div style={editorLayoutStyle}>
      <aside style={sidebarStyle}>
        <div style={sidebarHeaderStyle}>
          <h1 style={sidebarTitleStyle}>{state.proyecto.nombre}</h1>
          <p style={sidebarSubtitleStyle}>
            {state.proyecto.estudio ?? state.branding.empresa_nombre}
          </p>
        </div>

        <nav style={tabsStyle}>
          <TabButton active={activeTab === 'content'} onClick={() => setActiveTab('content')}>
            📝 Contenido
          </TabButton>
          <TabButton active={activeTab === 'brand'} onClick={() => setActiveTab('brand')}>
            🎨 Marca
          </TabButton>
          <TabButton active={activeTab === 'sections'} onClick={() => setActiveTab('sections')}>
            📐 Secciones
          </TabButton>
          <TabButton active={activeTab === 'colors'} onClick={() => setActiveTab('colors')}>
            🎨 Colores
          </TabButton>
        </nav>

        <div style={panelStyle}>
          {activeTab === 'content' && (
            <div>
              <SectionTitle>Información del proyecto</SectionTitle>
              <TextControl
                label="Nombre"
                value={state.proyecto.nombre}
                onChange={(v) => updateProyecto({ nombre: v })}
                disabled={readonly}
              />
              <TextControl
                label="Subtítulo"
                value={state.proyecto.subtitulo ?? ''}
                onChange={(v) => updateProyecto({ subtitulo: v })}
                disabled={readonly}
              />
              <TextControl
                label="Tagline"
                value={state.proyecto.tagline ?? ''}
                onChange={(v) => updateProyecto({ tagline: v })}
                disabled={readonly}
              />
              <TextControl
                label="Descripción"
                value={state.proyecto.descripcion}
                onChange={(v) => updateProyecto({ descripcion: v })}
                multiline
                disabled={readonly}
              />

              <SectionTitle>Arquitecto</SectionTitle>
              <TextControl
                label="Nombre"
                value={state.proyecto.arquitecto}
                onChange={(v) => updateProyecto({ arquitecto: v })}
                disabled={readonly}
              />
              <TextControl
                label="Email"
                value={state.proyecto.email}
                onChange={(v) => updateProyecto({ email: v })}
                type="email"
                disabled={readonly}
              />
              <TextControl
                label="Teléfono"
                value={state.proyecto.telefono ?? ''}
                onChange={(v) => updateProyecto({ telefono: v })}
                disabled={readonly}
              />
              <TextControl
                label="Dirección"
                value={state.proyecto.direccion ?? ''}
                onChange={(v) => updateProyecto({ direccion: v })}
                disabled={readonly}
              />
            </div>
          )}

          {activeTab === 'brand' && (
            <div>
              <SectionTitle>Branding</SectionTitle>
              <TextControl
                label="Empresa"
                value={state.branding.empresa_nombre}
                onChange={(v) => updateBranding({ empresa_nombre: v })}
                disabled={readonly}
              />
              <TextControl
                label="URL del logo"
                value={state.branding.logo_url ?? ''}
                onChange={(v) => updateBranding({ logo_url: v })}
                disabled={readonly}
              />
              <TextControl
                label="Web"
                value={state.proyecto.web ?? ''}
                onChange={(v) => updateProyecto({ web: v })}
                disabled={readonly}
              />

              <SectionTitle>Redes sociales</SectionTitle>
              <TextControl
                label="Instagram"
                value={state.proyecto.instagram ?? ''}
                onChange={(v) => updateProyecto({ instagram: v })}
                placeholder="@usuario"
                disabled={readonly}
              />
              <TextControl
                label="LinkedIn URL"
                value={state.proyecto.linkedin ?? ''}
                onChange={(v) => updateProyecto({ linkedin: v })}
                disabled={readonly}
              />
              <TextControl
                label="Twitter / X URL"
                value={state.proyecto.twitter ?? ''}
                onChange={(v) => updateProyecto({ twitter: v })}
                disabled={readonly}
              />
              <TextControl
                label="Facebook URL"
                value={state.proyecto.facebook ?? ''}
                onChange={(v) => updateProyecto({ facebook: v })}
                disabled={readonly}
              />
            </div>
          )}

          {activeTab === 'sections' && (
            <div>
              <SectionTitle>Orden y visibilidad</SectionTitle>
              <SectionReorder
                sections={state.section_order}
                labels={SECTION_LABELS}
                visible={state.visible_sections}
                onReorder={reorderSections}
                onToggle={updateVisibleSections}
                disabled={readonly}
              />
            </div>
          )}

          {activeTab === 'colors' && (
            <div>
              <SectionTitle>Paleta de colores</SectionTitle>
              <ColorControl
                label="Primario"
                description="Acentos, títulos, botones"
                value={state.branding.color_primario}
                onChange={(v) => updateBranding({ color_primario: v })}
                disabled={readonly}
              />
              <ColorControl
                label="Secundario"
                description="Bordes, separadores"
                value={state.branding.color_secundario ?? '#8a7434'}
                onChange={(v) => updateBranding({ color_secundario: v })}
                disabled={readonly}
              />
              <ColorControl
                label="Acento"
                description="Highlights, hover"
                value={state.branding.color_acento ?? '#E5C66B'}
                onChange={(v) => updateBranding({ color_acento: v })}
                disabled={readonly}
              />
              <ColorControl
                label="Fondo"
                description="Background base"
                value={state.branding.color_fondo ?? '#080808'}
                onChange={(v) => updateBranding({ color_fondo: v })}
                disabled={readonly}
              />
              <ColorControl
                label="Texto"
                description="Títulos, contenido"
                value={state.branding.color_texto ?? '#ede9e0'}
                onChange={(v) => updateBranding({ color_texto: v })}
                disabled={readonly}
              />
            </div>
          )}
        </div>
      </aside>

      <main style={previewStyle}>
        <div style={previewBarStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={previewStatusStyle}>
              {savedAt ? `Guardado ${savedAt.toLocaleTimeString()}` : 'Auto-guardado'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleDownload} style={btnPrimaryStyle}>
              Descargar PDF
            </button>
            {onSave && (
              <button onClick={handleSave} style={btnSecondaryStyle} disabled={saving || readonly}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            )}
          </div>
        </div>

        <div style={iframeContainerStyle}>
          <iframe
            srcDoc={html}
            style={iframeStyle}
            title="Preview de la presentación"
          />
        </div>
      </main>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        ...tabButtonStyle,
        ...(active ? tabButtonActive : {}),
      }}
    >
      {children}
    </button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 style={sectionTitleStyle}>{children}</h3>;
}

const editorLayoutStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '380px 1fr',
  height: '100vh',
  background: 'var(--dark-2)',
  color: 'var(--light)',
};

const sidebarStyle: React.CSSProperties = {
  background: 'var(--dark-3)',
  borderRight: '1px solid var(--gold-mid)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const sidebarHeaderStyle: React.CSSProperties = {
  padding: '20px 24px',
  borderBottom: '1px solid var(--gold-mid)',
};

const sidebarTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--serif)',
  fontSize: '20px',
  fontWeight: 400,
  color: 'var(--light)',
  marginBottom: '4px',
};

const sidebarSubtitleStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--gold)',
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
};

const tabsStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '1px',
  background: 'var(--gold-mid)',
};

const tabButtonStyle: React.CSSProperties = {
  padding: '12px 8px',
  background: 'var(--dark-3)',
  color: 'var(--text)',
  fontSize: '11px',
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  border: 'none',
  cursor: 'pointer',
  fontWeight: 500,
  fontFamily: 'var(--mono)',
  transition: 'all 0.2s',
};

const tabButtonActive: React.CSSProperties = {
  background: 'var(--dark-2)',
  color: 'var(--gold)',
};

const panelStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '24px',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '9px',
  letterSpacing: '2.5px',
  textTransform: 'uppercase',
  color: 'var(--gold)',
  fontWeight: 500,
  marginTop: '20px',
  marginBottom: '16px',
  paddingBottom: '6px',
  borderBottom: '1px solid var(--gold-mid)',
};

const previewStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  background: 'var(--dark-2)',
};

const previewBarStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 20px',
  background: 'var(--dark-3)',
  borderBottom: '1px solid var(--gold-mid)',
};

const previewStatusStyle: React.CSSProperties = {
  fontSize: '10px',
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
};

const iframeContainerStyle: React.CSSProperties = {
  flex: 1,
  overflow: 'hidden',
  background: 'white',
};

const iframeStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  border: 'none',
};

const btnPrimaryStyle: React.CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: '11px',
  letterSpacing: '2px',
  textTransform: 'uppercase',
  padding: '8px 16px',
  background: 'var(--gold)',
  color: 'var(--dark)',
  border: 'none',
  cursor: 'pointer',
  fontWeight: 500,
};

const btnSecondaryStyle: React.CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: '11px',
  letterSpacing: '2px',
  textTransform: 'uppercase',
  padding: '8px 16px',
  background: 'transparent',
  color: 'var(--text)',
  border: '1px solid var(--gold-mid)',
  cursor: 'pointer',
};
