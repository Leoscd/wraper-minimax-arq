'use client';

import { useState } from 'react';

interface Props {
  html: string;
  filename: string;
  id: string;
  tipo: 'presupuesto' | 'cronograma' | 'curva' | 'documento';
}

type Accion = 'pdf' | 'html' | 'xlsx';
type Estado = 'idle' | 'descargando' | 'agotado' | 'error' | 'ok';

/**
 * Viewer simple para entregables generados por el chat.
 * Muestra el HTML en un iframe y 3 botones de descarga:
 *   - PDF: counter de 3 en free tier. Print del browser via Ctrl+P.
 *   - HTML: descarga directa del archivo .html.
 *   - XLSX: export de los datos a Excel (placeholder, devuelve 501).
 *
 * Plan C1, C2, C3 (PLAN-LANZAMIENTO.md).
 */
export function PreviewEntregable({ html, filename, id, tipo }: Props) {
  const [estado, setEstado] = useState<{ accion: Accion; v: Estado }>({
    accion: 'pdf',
    v: 'idle',
  });
  const [mensaje, setMensaje] = useState<string | null>(null);

  const handlePdf = async () => {
    setEstado({ accion: 'pdf', v: 'descargando' });
    setMensaje(null);
    try {
      const res = await fetch(`/api/entregable/${id}/pdf`, { method: 'POST' });
      const data = await res.json();
      if (res.status === 429) {
        setEstado({ accion: 'pdf', v: 'agotado' });
        setMensaje(data.message || 'Ya usaste los 3 PDFs del plan gratuito.');
        return;
      }
      if (!res.ok || !data.ok) {
        setEstado({ accion: 'pdf', v: 'error' });
        setMensaje(data.error || 'Error al registrar la descarga.');
        return;
      }
      window.print();
      setMensaje(`PDFs usados: ${data.pdf.used} / ${data.pdf.limit}`);
      setEstado({ accion: 'pdf', v: 'idle' });
    } catch (err) {
      setEstado({ accion: 'pdf', v: 'error' });
      setMensaje(err instanceof Error ? err.message : 'Error desconocido');
    }
  };

  const handleHtml = () => {
    // GET directo: el browser maneja la descarga.
    window.location.href = `/api/entregable/${id}/html`;
  };

  const handleXlsx = async () => {
    setEstado({ accion: 'xlsx', v: 'descargando' });
    setMensaje(null);
    try {
      const res = await fetch(`/api/entregable/${id}/xlsx`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setEstado({ accion: 'xlsx', v: 'error' });
        setMensaje(data.message || data.error || `Error ${res.status}`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename.replace(/\.html$/, '.xlsx');
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setEstado({ accion: 'xlsx', v: 'ok' });
      setMensaje('Excel descargado.');
    } catch (err) {
      setEstado({ accion: 'xlsx', v: 'error' });
      setMensaje(err instanceof Error ? err.message : 'Error desconocido');
    }
  };

  // XLSX no tiene sentido para documentos cualitativos.
  const xlsxDisponible = tipo !== 'documento';

  return (
    <div className="preview-entregable">
      <div className="preview-toolbar no-print">
        <div className="preview-info">
          <span className="preview-label">Entregable</span>
          <span className="preview-tipo">{tipo}</span>
          <span className="preview-filename">{filename}</span>
        </div>
        <div className="preview-actions">
          <button
            type="button"
            className="preview-btn"
            onClick={handlePdf}
            disabled={estado.accion === 'pdf' && estado.v === 'descargando'}
          >
            {estado.accion === 'pdf' && estado.v === 'descargando'
              ? 'PDF…'
              : '↓ PDF'}
          </button>
          <button
            type="button"
            className="preview-btn"
            onClick={handleHtml}
          >
            ↓ HTML
          </button>
          {xlsxDisponible && (
            <button
              type="button"
              className="preview-btn"
              onClick={handleXlsx}
              disabled={estado.accion === 'xlsx' && estado.v === 'descargando'}
            >
              {estado.accion === 'xlsx' && estado.v === 'descargando'
                ? 'XLSX…'
                : '↓ Excel'}
            </button>
          )}
        </div>
      </div>

      {mensaje && (
        <div
          className={`preview-mensaje no-print ${
            estado.v === 'error' || estado.v === 'agotado' ? 'preview-mensaje-error' : 'preview-mensaje-info'
          }`}
        >
          {mensaje}
        </div>
      )}

      <iframe srcDoc={html} title={filename} className="preview-iframe" />

      <style jsx>{`
        .preview-entregable {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: var(--dark);
        }
        .preview-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 20px;
          background: var(--dark-2);
          border-bottom: 1px solid var(--gold-mid);
        }
        .preview-info {
          display: flex;
          align-items: baseline;
          gap: 12px;
        }
        .preview-label {
          font-size: 10px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: var(--gold);
          font-weight: 600;
        }
        .preview-tipo {
          font-size: 10px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: var(--text-muted);
          background: rgba(201, 168, 76, 0.18);
          padding: 2px 8px;
          border-radius: 3px;
        }
        .preview-filename {
          font-size: 13px;
          color: var(--light);
          font-family: var(--mono);
        }
        .preview-actions {
          display: flex;
          gap: 8px;
        }
        .preview-btn {
          background: var(--gold);
          color: var(--dark);
          border: none;
          padding: 9px 14px;
          font-size: 11px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          font-weight: 600;
          font-family: var(--mono);
          cursor: pointer;
          border-radius: 3px;
        }
        .preview-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .preview-mensaje {
          padding: 10px 20px;
          font-size: 12px;
          font-family: var(--mono);
        }
        .preview-mensaje-info {
          color: var(--text-muted);
          background: rgba(201, 168, 76, 0.08);
        }
        .preview-mensaje-error {
          color: #ff9a9a;
          background: rgba(220, 80, 80, 0.12);
        }
        .preview-iframe {
          flex: 1;
          width: 100%;
          border: none;
          background: white;
        }
        @media print {
          .no-print { display: none !important; }
          .preview-iframe { display: block; height: auto; }
        }
      `}</style>
    </div>
  );
}
