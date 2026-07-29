'use client';

import { useState } from 'react';

interface Props {
  html: string;
  filename: string;
  id: string;
}

/**
 * Viewer simple para entregables generados por el chat.
 * Muestra el HTML en un iframe y un boton "Descargar PDF" que:
 *   1. Hace POST a /api/entregable/[id]/pdf (incrementa counter)
 *   2. Si quedan PDFs, abre el dialog de print del browser (Ctrl+P)
 *   3. Si se gastaron los 3, muestra el CTA de upgrade
 */
export function PreviewEntregable({ html, filename, id }: Props) {
  const [estado, setEstado] = useState<'idle' | 'descargando' | 'agotado' | 'error'>(
    'idle'
  );
  const [mensaje, setMensaje] = useState<string | null>(null);

  const descargar = async () => {
    setEstado('descargando');
    setMensaje(null);
    try {
      const res = await fetch(`/api/entregable/${id}/pdf`, { method: 'POST' });
      const data = await res.json();
      if (res.status === 429) {
        setEstado('agotado');
        setMensaje(data.message || 'Ya usaste los 3 PDFs del plan gratuito.');
        return;
      }
      if (!res.ok || !data.ok) {
        setEstado('error');
        setMensaje(data.error || 'Error al registrar la descarga.');
        return;
      }
      // OK: el browser abre el dialog de print, que tiene los @media print
      // del template y guarda como PDF.
      window.print();
      setMensaje(`PDFs usados: ${data.pdf.used} / ${data.pdf.limit}`);
      setEstado('idle');
    } catch (err) {
      setEstado('error');
      setMensaje(err instanceof Error ? err.message : 'Error desconocido');
    }
  };

  return (
    <div className="preview-entregable">
      <div className="preview-toolbar no-print">
        <div className="preview-info">
          <span className="preview-label">Entregable</span>
          <span className="preview-filename">{filename}</span>
        </div>
        <button
          type="button"
          className="preview-descargar"
          onClick={descargar}
          disabled={estado === 'descargando' || estado === 'agotado'}
        >
          {estado === 'descargando'
            ? 'Generando…'
            : estado === 'agotado'
              ? 'PDFs agotados'
              : '↓ Descargar PDF'}
        </button>
      </div>

      {mensaje && (
        <div
          className={`preview-mensaje no-print ${estado === 'error' || estado === 'agotado' ? 'preview-mensaje-error' : 'preview-mensaje-info'}`}
        >
          {mensaje}
        </div>
      )}

      <iframe
        srcDoc={html}
        title={filename}
        className="preview-iframe"
      />

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
        .preview-filename {
          font-size: 13px;
          color: var(--light);
          font-family: var(--mono);
        }
        .preview-descargar {
          background: var(--gold);
          color: var(--dark);
          border: none;
          padding: 10px 18px;
          font-size: 11px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          font-weight: 600;
          font-family: var(--mono);
          cursor: pointer;
          border-radius: 3px;
        }
        .preview-descargar:disabled {
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
