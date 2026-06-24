'use client';

import type { WizardData } from './Wizard';

interface Props {
  data: WizardData;
  updateData: (section: 'opciones', updates: Partial<WizardData['opciones']>) => void;
}

export function Step4Estilo({ data, updateData }: Props) {
  const o = data.opciones;
  return (
    <div>
      <h2 style={titleStyle}>Opciones de la presentación</h2>
      <p style={subtitleStyle}>
        Configurá los detalles finales. Estos ajustes se pueden cambiar después de
        generar la presentación.
      </p>

      <div style={field}>
        <label style={optionLabelStyle}>
          <input
            type="checkbox"
            checked={o.incluir_cronograma ?? false}
            onChange={(e) =>
              updateData('opciones', { incluir_cronograma: e.target.checked })
            }
            style={{ width: '20px', height: '20px' }}
          />
          <div>
            <strong style={optionTitleStyle}>Incluir cronograma de obra</strong>
            <p style={optionDescStyle}>
              Genera un diagrama Gantt con las tareas principales del proyecto
              (requiere info de duración de obra).
            </p>
          </div>
        </label>
      </div>

      <div style={field}>
        <label style={optionLabelStyle}>
          <input
            type="checkbox"
            checked={o.incluir_curva_inversion ?? false}
            onChange={(e) =>
              updateData('opciones', { incluir_curva_inversion: e.target.checked })
            }
            style={{ width: '20px', height: '20px' }}
          />
          <div>
            <strong style={optionTitleStyle}>Incluir curva de inversión</strong>
            <p style={optionDescStyle}>
              Gráfico de inversión acumulada en el tiempo (curva S). Útil para
              propuestas financieras.
            </p>
          </div>
        </label>
      </div>

      <div style={field}>
        <label style={optionLabelStyle}>
          <input
            type="checkbox"
            checked={o.incluir_honorarios ?? false}
            onChange={(e) =>
              updateData('opciones', { incluir_honorarios: e.target.checked })
            }
            style={{ width: '20px', height: '20px' }}
          />
          <div>
            <strong style={optionTitleStyle}>Incluir honorarios profesionales</strong>
            <p style={optionDescStyle}>
              Agrega un ítem separado al presupuesto con el monto de tus honorarios
              (te lo preguntaremos después).
            </p>
          </div>
        </label>
      </div>

      <div style={summaryBoxStyle}>
        <h3 style={summaryTitleStyle}>Resumen</h3>
        <ul style={summaryListStyle}>
          <li>
            <strong>Proyecto:</strong> {data.proyecto.nombre || '(sin nombre)'}
          </li>
          <li>
            <strong>Empresa:</strong> {data.branding.empresa_nombre || '(sin empresa)'}
          </li>
          <li>
            <strong>Estilo:</strong> {data.branding.estilo}
          </li>
          <li>
            <strong>Imágenes en galería:</strong> {data.archivos.galeria.length}
          </li>
          <li>
            <strong>Video hero:</strong> {data.archivos.video_hero ? 'Sí' : 'No'}
          </li>
        </ul>
        <p style={summaryHintStyle}>
          Al hacer click en "Generar presentación", M3 procesará esta información
          y generará el HTML premium en ~30 segundos.
        </p>
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
  marginBottom: '40px',
};
const field: React.CSSProperties = {
  marginBottom: '20px',
};
const optionLabelStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  padding: '16px',
  border: '1px solid var(--gold-mid)',
  background: 'var(--dark-2)',
  cursor: 'pointer',
  alignItems: 'flex-start',
};
const optionTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--serif)',
  fontSize: '18px',
  color: 'var(--light)',
  fontWeight: 400,
  display: 'block',
  marginBottom: '4px',
};
const optionDescStyle: React.CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: '12px',
  margin: 0,
};
const summaryBoxStyle: React.CSSProperties = {
  marginTop: '40px',
  padding: '24px',
  border: '1px solid var(--gold)',
  background: 'var(--dark-2)',
};
const summaryTitleStyle: React.CSSProperties = {
  fontSize: '9px',
  letterSpacing: '2.5px',
  textTransform: 'uppercase',
  color: 'var(--gold)',
  marginBottom: '16px',
};
const summaryListStyle: React.CSSProperties = {
  listStyle: 'none',
  padding: 0,
  margin: 0,
  fontSize: '13px',
  color: 'var(--text)',
  lineHeight: 2,
};
const summaryHintStyle: React.CSSProperties = {
  marginTop: '16px',
  paddingTop: '16px',
  borderTop: '1px solid var(--gold-mid)',
  color: 'var(--text-muted)',
  fontSize: '12px',
  fontStyle: 'italic',
};
