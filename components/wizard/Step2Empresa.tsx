'use client';

import type { WizardData } from './Wizard';

interface Props {
  data: WizardData;
  updateData: (section: 'branding', updates: Partial<WizardData['branding']>) => void;
}

const ESTILOS = [
  { value: 'premium', label: 'Premium', desc: 'Editorial dark con dorado' },
  { value: 'moderno', label: 'Moderno', desc: 'Limpio y minimalista' },
  { value: 'minimalista', label: 'Minimalista', desc: 'Menos es más' },
  { value: 'tecnico', label: 'Técnico', desc: 'Para profesionales' },
] as const;

export function Step2Empresa({ data, updateData }: Props) {
  const b = data.branding;
  return (
    <div>
      <h2 style={titleStyle}>Branding de la empresa</h2>
      <p style={subtitleStyle}>
        Personalizá la presentación con la marca de tu estudio o empresa.
      </p>

      <div style={field}>
        <label style={labelStyle}>Nombre de la empresa *</label>
        <input
          type="text"
          value={b.empresa_nombre ?? ''}
          onChange={(e) => updateData('branding', { empresa_nombre: e.target.value })}
          placeholder="Ej: SoyLeo AI"
        />
      </div>

      <div style={field}>
        <label style={labelStyle}>Estilo de la presentación</label>
        <div style={styleGridStyle}>
          {ESTILOS.map((e) => (
            <button
              key={e.value}
              type="button"
              onClick={() => updateData('branding', { estilo: e.value })}
              style={{
                ...styleCard,
                ...(b.estilo === e.value ? styleCardActive : {}),
              }}
            >
              <strong style={styleLabel}>{e.label}</strong>
              <span style={styleDesc}>{e.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <p style={hintStyle}>
        El logo, paleta completa de colores, redes sociales y datos de contacto
        adicionales se configuran en el siguiente paso.
      </p>
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
const field: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  marginBottom: '24px',
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
const styleGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '12px',
  marginTop: '8px',
};
const styleCard: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  padding: '16px',
  background: 'var(--dark-2)',
  border: '1px solid var(--gold-mid)',
  textAlign: 'left',
  cursor: 'pointer',
  transition: 'all 0.2s',
  color: 'var(--light)',
};
const styleCardActive: React.CSSProperties = {
  background: 'var(--dark-3)',
  borderColor: 'var(--gold)',
  boxShadow: '0 0 0 2px var(--gold-dim)',
};
const styleLabel: React.CSSProperties = {
  fontFamily: 'var(--serif)',
  fontSize: '20px',
  color: 'var(--light)',
};
const styleDesc: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--text-muted)',
};
