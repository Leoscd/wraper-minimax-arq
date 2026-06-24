'use client';

import type { WizardData } from './Wizard';

interface Props {
  data: WizardData;
  updateData: (section: 'proyecto', updates: Partial<WizardData['proyecto']>) => void;
}

export function Step1Proyecto({ data, updateData }: Props) {
  const p = data.proyecto;
  return (
    <div>
      <h2 style={titleStyle}>Datos del proyecto</h2>
      <p style={subtitleStyle}>
        Empezamos con la información base. Todos los campos marcados con * son obligatorios.
      </p>

      <div style={gridStyle}>
        <Field label="Nombre del proyecto *">
          <input
            type="text"
            value={p.nombre ?? ''}
            onChange={(e) => updateData('proyecto', { nombre: e.target.value })}
            placeholder="Ej: Casa Rogeris"
          />
        </Field>

        <Field label="Subtítulo (opcional)">
          <input
            type="text"
            value={p.subtitulo ?? ''}
            onChange={(e) => updateData('proyecto', { subtitulo: e.target.value })}
            placeholder="Ej: Complejo 4 Departamentos"
          />
        </Field>

        <Field label="Descripción *" fullWidth>
          <textarea
            value={p.descripcion ?? ''}
            onChange={(e) => updateData('proyecto', { descripcion: e.target.value })}
            placeholder="Descripción del proyecto, tipología, características principales..."
            rows={4}
          />
        </Field>

        <Field label="Arquitecto *">
          <input
            type="text"
            value={p.arquitecto ?? ''}
            onChange={(e) => updateData('proyecto', { arquitecto: e.target.value })}
            placeholder="Ej: Arq. Leonardo Díaz"
          />
        </Field>

        <Field label="Estudio">
          <input
            type="text"
            value={p.estudio ?? ''}
            onChange={(e) => updateData('proyecto', { estudio: e.target.value })}
            placeholder="Ej: SoyLeo AI"
          />
        </Field>

        <Field label="Ubicación *">
          <input
            type="text"
            value={p.ubicacion ?? ''}
            onChange={(e) => updateData('proyecto', { ubicacion: e.target.value })}
            placeholder="Ej: Tucumán, Argentina"
          />
        </Field>

        <Field label="Año">
          <input
            type="text"
            value={p.año ?? ''}
            onChange={(e) => updateData('proyecto', { año: e.target.value })}
            placeholder="2026"
          />
        </Field>

        <Field label="Sistema constructivo">
          <input
            type="text"
            value={p.sistema ?? ''}
            onChange={(e) => updateData('proyecto', { sistema: e.target.value })}
            placeholder="Ej: Steel Frame, Hormigón Armado"
          />
        </Field>

        <Field label="Superficie total">
          <input
            type="text"
            value={p.superficie_total ?? ''}
            onChange={(e) => updateData('proyecto', { superficie_total: e.target.value })}
            placeholder="Ej: 193 m²"
          />
        </Field>

        <Field label="Unidades">
          <input
            type="text"
            value={p.unidades ?? ''}
            onChange={(e) => updateData('proyecto', { unidades: e.target.value })}
            placeholder="Ej: 4 x 42 m²"
          />
        </Field>

        <Field label="Email de contacto *">
          <input
            type="email"
            value={p.email ?? ''}
            onChange={(e) => updateData('proyecto', { email: e.target.value })}
            placeholder="tu@email.com"
          />
        </Field>

        <Field label="Web">
          <input
            type="text"
            value={p.web ?? ''}
            onChange={(e) => updateData('proyecto', { web: e.target.value })}
            placeholder="soyleoai.com"
          />
        </Field>

        <Field label="Instagram">
          <input
            type="text"
            value={p.instagram ?? ''}
            onChange={(e) => updateData('proyecto', { instagram: e.target.value })}
            placeholder="@soy.leo_ai"
          />
        </Field>
      </div>

      <ComponentStyles />
    </div>
  );
}

function Field({
  label,
  children,
  fullWidth,
}: {
  label: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div style={{ ...fieldStyle, gridColumn: fullWidth ? '1 / -1' : undefined }}>
      <label style={labelStyle}>{label}</label>
      {children}
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
  marginBottom: '40px',
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

function ComponentStyles() {
  return (
    <style jsx>{`
      :global(input),
      :global(textarea) {
        width: 100%;
        font-size: 14px;
      }
      :global(textarea) {
        resize: vertical;
        min-height: 80px;
        font-family: var(--mono);
      }
      @media (max-width: 600px) {
        :global(.wizard-body > div > div:nth-child(3)) {
          grid-template-columns: 1fr !important;
        }
      }
    `}</style>
  );
}
