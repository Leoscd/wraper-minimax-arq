'use client';

import type { SectionId } from '@/lib/editor-types';

interface Props {
  sections: SectionId[];
  labels: Record<SectionId, string>;
  visible: Record<SectionId, boolean>;
  onMove: (id: SectionId, direction: 'up' | 'down') => void;
  onToggle: (id: SectionId, visible: boolean) => void;
  disabled?: boolean;
}

export function SectionReorder({ sections, labels, visible, onMove, onToggle, disabled }: Props) {
  return (
    <div style={listStyle}>
      {sections.map((id, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === sections.length - 1;
        return (
          <div
            key={id}
            style={{
              ...rowStyle,
              opacity: visible[id] ? 1 : 0.5,
            }}
          >
            <div style={arrowsStyle}>
              <button
                onClick={() => onMove(id, 'up')}
                disabled={isFirst || disabled}
                style={{
                  ...arrowBtnStyle,
                  opacity: isFirst ? 0.3 : 1,
                }}
                title="Subir"
              >
                ↑
              </button>
              <button
                onClick={() => onMove(id, 'down')}
                disabled={isLast || disabled}
                style={{
                  ...arrowBtnStyle,
                  opacity: isLast ? 0.3 : 1,
                }}
                title="Bajar"
              >
                ↓
              </button>
            </div>

            <span style={labelStyle}>{labels[id]}</span>

            <label style={toggleStyle}>
              <input
                type="checkbox"
                checked={visible[id]}
                onChange={(e) => onToggle(id, e.target.checked)}
                disabled={disabled}
              />
              <span style={toggleLabelStyle}>{visible[id] ? 'Visible' : 'Oculta'}</span>
            </label>
          </div>
        );
      })}
    </div>
  );
}

const listStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '12px',
  background: 'var(--dark-2)',
  border: '1px solid var(--gold-mid)',
  transition: 'opacity 0.2s',
};

const arrowsStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
};

const arrowBtnStyle: React.CSSProperties = {
  width: '24px',
  height: '20px',
  background: 'var(--dark)',
  border: '1px solid var(--gold-mid)',
  color: 'var(--gold)',
  fontSize: '12px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'var(--mono)',
};

const labelStyle: React.CSSProperties = {
  flex: 1,
  fontFamily: 'var(--serif)',
  fontSize: '16px',
  color: 'var(--light)',
};

const toggleStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  cursor: 'pointer',
};

const toggleLabelStyle: React.CSSProperties = {
  fontSize: '10px',
  color: 'var(--text-muted)',
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
};
