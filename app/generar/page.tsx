'use client';

import { useState } from 'react';
import { Wizard } from '@/components/wizard/Wizard';
import type { GenerationRequest } from '@/lib/types';

export default function GenerarPage() {
  const [html, setHtml] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [partialHtml, setPartialHtml] = useState<string | null>(null);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [leadEmail, setLeadEmail] = useState('');
  const [leadSent, setLeadSent] = useState(false);

  // Progreso del streaming: el Wizard nos pasa el HTML parcial acumulado y lo
  // mostramos en vivo en el iframe (con throttle del lado del Wizard).
  const handleProgress = (html: string) => {
    setPartialHtml(html);
  };

  const handleComplete = (result: any) => {
    setHtml(result.html);
    setMetadata(result.metadata);
    setPartialHtml(null);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setTimeout(() => setShowLeadModal(true), 3000);
  };

  const handleDownload = () => {
    if (typeof window === 'undefined') return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html!);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  const handleSendLead = async () => {
    if (!leadEmail || !metadata) return;
    try {
      await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: leadEmail,
          proyecto: metadata.proyecto,
        }),
      });
      setLeadSent(true);
    } catch {
      setLeadSent(true);
    }
  };

  const handleStartOver = () => {
    setHtml(null);
    setMetadata(null);
    setPartialHtml(null);
    setShowLeadModal(false);
    setLeadEmail('');
    setLeadSent(false);
  };

  if (html) {
    return (
      <main style={{ minHeight: '100vh', background: 'var(--dark-3)' }}>
        <div style={previewBarStyle}>
          <div style={previewBarInnerStyle}>
            <div>
              <strong style={{ color: 'var(--light)', fontFamily: 'var(--serif)', fontSize: '20px' }}>
                {metadata?.proyecto}
              </strong>
              <span style={{ marginLeft: '12px', color: 'var(--text-muted)', fontSize: '11px' }}>
                {metadata?.tools_invocadas?.length ?? 0} tools invocadas · {metadata?.iteraciones ?? 0} iteraciones
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleDownload} style={btnPrimaryStyle}>
                Descargar PDF
              </button>
              <button onClick={handleStartOver} style={btnSecondaryStyle}>
                Nuevo
              </button>
            </div>
          </div>
        </div>

        <iframe
          srcDoc={html}
          style={{
            width: '100%',
            height: 'calc(100vh - 60px)',
            border: 'none',
            background: 'white',
          }}
          title="Preview de la presentación"
        />

        {showLeadModal && (
          <div style={modalOverlayStyle} onClick={() => !leadSent && setShowLeadModal(false)}>
            <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
              {leadSent ? (
                <>
                  <h2 style={modalTitleStyle}>¡Listo!</h2>
                  <p style={{ color: 'var(--text)', fontSize: '14px', lineHeight: 1.6 }}>
                    Te enviamos el PDF a {leadEmail}. Revisá tu casilla.
                  </p>
                </>
              ) : (
                <>
                  <h2 style={modalTitleStyle}>Recibí el PDF por email</h2>
                  <p style={{ color: 'var(--text)', fontSize: '14px', lineHeight: 1.6, marginBottom: '20px' }}>
                    Te lo mandamos listo para imprimir. Sin spam.
                  </p>
                  <input
                    type="email"
                    placeholder="tu@email.com"
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                    style={{ marginBottom: '12px' }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={handleSendLead} style={btnPrimaryStyle}>
                      Enviar
                    </button>
                    <button onClick={() => setShowLeadModal(false)} style={btnSecondaryStyle}>
                      No, gracias
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    );
  }

  // Preview en vivo mientras streamea: mostramos el HTML parcial en un iframe
  // arriba del wizard. No hay barra de acciones ni modal de lead todavía (eso
  // aparece recién con handleComplete y el html final).
  if (partialHtml !== null) {
    return (
      <main style={{ minHeight: '100vh', background: 'var(--dark-3)' }}>
        <div style={previewBarStyle}>
          <div style={previewBarInnerStyle}>
            <div>
              <strong style={{ color: 'var(--light)', fontFamily: 'var(--serif)', fontSize: '20px' }}>
                Generando presentación…
              </strong>
              <span style={{ marginLeft: '12px', color: 'var(--text-muted)', fontSize: '11px' }}>
                construyendo en vivo
              </span>
            </div>
          </div>
        </div>
        <iframe
          srcDoc={partialHtml}
          style={{
            width: '100%',
            height: 'calc(100vh - 60px)',
            border: 'none',
            background: 'white',
          }}
          title="Preview en vivo"
        />
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', padding: '40px 5vw 80px' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <a href="/" style={{ fontFamily: 'var(--serif)', fontSize: '20px', color: 'var(--light)' }}>
          SoyLeo <em style={{ color: 'var(--gold)' }}>AI</em>
        </a>
      </nav>
      <Wizard onComplete={handleComplete as any} onProgress={handleProgress} />
    </main>
  );
}

const previewBarStyle: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 100,
  background: 'var(--dark)',
  borderBottom: '1px solid var(--gold-mid)',
  padding: '12px 5vw',
};
const previewBarInnerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  maxWidth: '1400px',
  margin: '0 auto',
};
const btnPrimaryStyle: React.CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: '11px',
  letterSpacing: '2px',
  textTransform: 'uppercase',
  padding: '10px 20px',
  background: 'var(--gold)',
  color: 'var(--dark)',
  border: 'none',
  cursor: 'pointer',
};
const btnSecondaryStyle: React.CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: '11px',
  letterSpacing: '2px',
  textTransform: 'uppercase',
  padding: '10px 20px',
  background: 'transparent',
  color: 'var(--text)',
  border: '1px solid var(--gold-mid)',
  cursor: 'pointer',
};
const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(8,8,8,0.85)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '20px',
};
const modalStyle: React.CSSProperties = {
  background: 'var(--dark-2)',
  border: '1px solid var(--gold)',
  padding: '32px',
  maxWidth: '440px',
  width: '100%',
};
const modalTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--serif)',
  fontSize: '28px',
  color: 'var(--light)',
  fontWeight: 300,
  marginBottom: '12px',
};
