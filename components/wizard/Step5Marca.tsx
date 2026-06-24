'use client';

import type { WizardData } from './Wizard';

interface Props {
  data: WizardData;
  updateData: (section: 'proyecto' | 'branding', updates: Partial<WizardData['proyecto'] | WizardData['branding']>) => void;
}

export function Step5Marca({ data, updateData }: Props) {
  const p = data.proyecto;
  const b = data.branding;

  return (
    <div>
      <h2 style={titleStyle}>Info de marca y paleta</h2>
      <p style={subtitleStyle}>
        Pasanos los datos de tu marca y los colores. La presentación se va a generar con
        tu identidad visual.
      </p>

      <SectionTitle>Identidad</SectionTitle>

      <div style={gridStyle}>
        <Field label="URL del logo (opcional)">
          <input
            type="url"
            value={b.logo_url ?? ''}
            onChange={(e) => updateData('branding', { logo_url: e.target.value })}
            placeholder="https://ejemplo.com/logo.png"
          />
          <small style={hintStyle}>
            Si no tenés URL, podés dejarla vacía y usamos solo el nombre.
          </small>
        </Field>

        <Field label="Tagline / slogan (opcional)">
          <input
            type="text"
            value={p.tagline ?? ''}
            onChange={(e) => updateData('proyecto', { tagline: e.target.value })}
            placeholder="Ej: Arquitectura que transforma"
          />
        </Field>
      </div>

      <SectionTitle>Datos de contacto</SectionTitle>

      <div style={gridStyle}>
        <Field label="Dirección física (opcional)">
          <input
            type="text"
            value={p.direccion ?? ''}
            onChange={(e) => updateData('proyecto', { direccion: e.target.value })}
            placeholder="Ej: Av. Independencia 1234, Tucumán"
          />
        </Field>

        <Field label="Teléfono (opcional)">
          <input
            type="tel"
            value={p.telefono ?? ''}
            onChange={(e) => updateData('proyecto', { telefono: e.target.value })}
            placeholder="+54 381 555 1234"
          />
        </Field>
      </div>

      <SectionTitle>Redes sociales (opcionales)</SectionTitle>

      <div style={gridStyle}>
        <Field label="Instagram">
          <input
            type="text"
            value={p.instagram ?? ''}
            onChange={(e) => updateData('proyecto', { instagram: e.target.value })}
            placeholder="@soy.leo_ai"
          />
        </Field>

        <Field label="LinkedIn URL">
          <input
            type="url"
            value={p.linkedin ?? ''}
            onChange={(e) => updateData('proyecto', { linkedin: e.target.value })}
            placeholder="https://linkedin.com/in/..."
          />
        </Field>

        <Field label="Twitter / X URL">
          <input
            type="url"
            value={p.twitter ?? ''}
            onChange={(e) => updateData('proyecto', { twitter: e.target.value })}
            placeholder="https://x.com/..."
          />
        </Field>

        <Field label="Facebook URL">
          <input
            type="url"
            value={p.facebook ?? ''}
            onChange={(e) => updateData('proyecto', { facebook: e.target.value })}
            placeholder="https://facebook.com/..."
          />
        </Field>
      </div>

      <SectionTitle>Paleta de colores</SectionTitle>
      <p style={hintStyle}>
        Los 5 colores que se usan en la presentación. Default Dark Gold.
      </p>

      <div style={paletteGridStyle}>
        <ColorField
          label="Primario"
          description="Acentos, títulos, botones"
          value={b.color_primario ?? '#C9A84C'}
          onChange={(v) => updateData('branding', { color_primario: v })}
        />
        <ColorField
          label="Secundario"
          description="Bordes suaves, separadores"
          value={b.color_secundario ?? '#8a7434'}
          onChange={(v) => updateData('branding', { color_secundario: v })}
        />
        <ColorField
          label="Fondo"
          description="Background base"
          value={b.color_fondo ?? '#080808'}
          onChange={(v) => updateData('branding', { color_fondo: v })}
        />
        <ColorField
          label="Texto"
          description="Títulos, contenido"
          value={b.color_texto ?? '#ede9e0'}
          onChange={(v) => updateData('branding', { color_texto: v })}
        />
        <ColorField
          label="Acento"
          description="Highlights, hover"
          value={b.color_acento ?? '#E5C66B'}
          onChange={(v) => updateData('branding', { color_acento: v })}
        />
      </div>

      <SectionTitle>Vista previa de la paleta</SectionTitle>

      <div style={previewPaletteStyle}>
        <div style={{ ...previewSwatchStyle, background: b.color_primario ?? '#C9A84C' }}>
          Primario
        </div>
        <div style={{ ...previewSwatchStyle, background: b.color_secundario ?? '#8a7434' }}>
          Secundario
        </div>
        <div
          style={{
            ...previewSwatchStyle,
            background: b.color_fondo ?? '#080808',
            color: b.color_texto ?? '#ede9e0',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          Fondo
        </div>
        <div style={{ ...previewSwatchStyle, background: b.color_texto ?? '#ede9e0', color: '#000' }}>
          Texto
        </div>
        <div style={{ ...previewSwatchStyle, background: b.color_acento ?? '#E5C66B' }}>
          Acento
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        fontSize: '9px',
        letterSpacing: '2.5px',
        textTransform: 'uppercase',
        color: 'var(--gold)',
        fontWeight: 500,
        marginTop: '40px',
        marginBottom: '16px',
        paddingBottom: '8px',
        borderBottom: '1px solid var(--gold-mid)',
      }}
    >
      {children}
    </h3>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={fieldStyle}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function ColorField({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={colorFieldStyle}>
      <div style={colorPreviewStyle}>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: '100%', height: '40px', border: 'none', cursor: 'pointer' }}
        />
      </div>
      <div style={{ flex: 1 }}>
        <label style={colorLabelStyle}>{label}</label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ fontFamily: 'var(--mono)', fontSize: '13px' }}
        />
        <small style={hintStyle}>{description}</small>
      </div>
    </div>
  );
}

const titleStyle: React.CSSProperties = {
  fontFamily: 'var(--serif)',
  fontSize: '36px',
  color: 'var(--light)',
  fontWeight: 300,
  marginBottom: '8px',
};
const subtitleStyle: React.CSSProperties = {
  color: 'var(--text)',
  fontSize: '13px',
  marginBottom: '24px',
};
const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '20px',
};
const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};
const labelStyle: React.CSSProperties = {
  fontSize: '9px',
  letterSpacing: '2.5px',
  textTransform: 'uppercase',
  color: 'var(--gold)',
  fontWeight: 500,
};
const hintStyle: React.CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: '11px',
  marginTop: '4px',
};
const paletteGridStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};
const colorFieldStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  alignItems: 'flex-start',
  padding: '12px',
  background: 'var(--dark-2)',
  border: '1px solid var(--gold-mid)',
};
const colorPreviewStyle: React.CSSProperties = {
  width: '80px',
  flexShrink: 0,
};
const colorLabelStyle: React.CSSProperties = {
  fontSize: '10px',
  letterSpacing: '2px',
  textTransform: 'uppercase',
  color: 'var(--gold)',
  display: 'block',
  marginBottom: '4px',
  fontWeight: 500,
};
const previewPaletteStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(5, 1fr)',
  gap: '8px',
  marginTop: '12px',
};
const previewSwatchStyle: React.CSSProperties = {
  height: '80px',
  display: 'flex',
  alignItems: 'flex-end',
  padding: '8px',
  fontSize: '10px',
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  fontWeight: 600,
  color: '#000',
  textShadow: '0 1px 2px rgba(255,255,255,0.3)',
};
