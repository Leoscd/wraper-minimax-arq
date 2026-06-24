'use client';

interface Props {
  label: string;
  description?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

export function ColorControl({ label, description, value, onChange, disabled }: Props) {
  return (
    <div style={fieldStyle}>
      <label style={labelStyle}>{label}</label>
      <div style={rowStyle}>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          style={colorPickerStyle}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          style={hexInputStyle}
        />
      </div>
      {description && <small style={hintStyle}>{description}</small>}
    </div>
  );
}

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  marginBottom: '16px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '9px',
  letterSpacing: '2px',
  textTransform: 'uppercase',
  color: 'var(--gold)',
  fontWeight: 500,
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  alignItems: 'center',
};

const colorPickerStyle: React.CSSProperties = {
  width: '48px',
  height: '36px',
  border: '1px solid var(--gold-mid)',
  cursor: 'pointer',
  background: 'var(--dark)',
};

const hexInputStyle: React.CSSProperties = {
  flex: 1,
  fontSize: '12px',
  padding: '8px 10px',
  background: 'var(--dark)',
  color: 'var(--light)',
  border: '1px solid var(--gold-mid)',
  fontFamily: 'var(--mono)',
};

const hintStyle: React.CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: '10px',
  marginTop: '2px',
};
