'use client';

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: 'text' | 'email' | 'tel' | 'url';
  multiline?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function TextControl({ label, value, onChange, type = 'text', multiline, placeholder, disabled }: Props) {
  return (
    <div style={fieldStyle}>
      <label style={labelStyle}>{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={3}
          style={textareaStyle}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          style={inputStyle}
        />
      )}
    </div>
  );
}

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  marginBottom: '12px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '9px',
  letterSpacing: '2px',
  textTransform: 'uppercase',
  color: 'var(--gold)',
  fontWeight: 500,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  fontSize: '13px',
  padding: '8px 10px',
  background: 'var(--dark)',
  color: 'var(--light)',
  border: '1px solid var(--gold-mid)',
  fontFamily: 'var(--mono)',
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: 'vertical',
  minHeight: '60px',
  fontFamily: 'var(--mono)',
};
